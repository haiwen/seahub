# encoding: utf-8
import settings
import os
import stat
import simplejson as json
import re
import sys
import urllib2
from urllib import quote
from django.core.urlresolvers import reverse
from django.core.mail import send_mail
from django.contrib import messages
from django.contrib.sites.models import Site, RequestSite
from django.db import IntegrityError
from django.db.models import F
from django.http import HttpResponse, HttpResponseRedirect, Http404
from django.shortcuts import render_to_response, redirect
from django.template import Context, loader, RequestContext
from django.views.decorators.csrf import csrf_protect

from django.core.cache import cache
from django.http import HttpResponse, HttpResponseServerError 

from auth.decorators import login_required
from auth.forms import AuthenticationForm, PasswordResetForm, SetPasswordForm, \
    PasswordChangeForm
from auth.tokens import default_token_generator
from share.models import FileShare
from seaserv import ccnet_rpc, ccnet_threaded_rpc, get_groups, get_users, get_repos, \
    get_repo, get_commits, get_branches, \
    seafserv_threaded_rpc, seafserv_rpc, get_binding_peerids, get_ccnetuser, \
    get_group_repoids, check_group_staff
from pysearpc import SearpcError

from seahub.base.accounts import CcnetUser
from seahub.contacts.models import Contact
from seahub.notifications.models import UserNotification
from forms import AddUserForm, FileLinkShareForm
from utils import go_permission_error, go_error, list_to_string, \
    get_httpserver_root, get_ccnetapplet_root, gen_token, \
    calculate_repo_last_modify, valid_previewed_file, \
    check_filename_with_rename, get_accessible_repos, EMPTY_SHA1, \
    get_file_revision_id_size
from seahub.profile.models import Profile
from settings import FILE_PREVIEW_MAX_SIZE

@login_required
def root(request):
    return HttpResponseRedirect(reverse(myhome))

def peers(request):
    peer_type = request.REQUEST.get('type', 'all')
    peer_ids = ccnet_rpc.list_peers()
    peers = []
    for peer_id in peer_ids.split("\n"):
        # too handle the ending '\n'
        if peer_id == '':
            continue
        peer = ccnet_rpc.get_peer(peer_id)
        if peer_type == 'all':
            peers.append(peer)
        if peer_type == 'mypeer':
            if peer.props.role_list.find('MyPeer') != -1:
                peers.append(peer)

    users = get_users()
    return render_to_response('peers.html', { 
            'peers': peers,
            'users': users,
            }, context_instance=RequestContext(request))

def validate_owner(request, repo_id):
    """
    Check whether email in the request own the repo
    
    """
    try:
        ret = seafserv_threaded_rpc.is_repo_owner(request.user.username,
                                                   repo_id)
    except:
        ret = 0

    if ret == 0 or ret is None:
        return False
    else:
        return True

def validate_emailuser(emailuser):
    """
    check whether emailuser is in the database

    """
    try:
        user = ccnet_threaded_rpc.get_emailuser(emailuser)
    except:
        user = None
        
    if user:
        return True
    else:
        return False

def check_shared_repo(request, repo_id):
    """
    Check whether user has been shared this repo or
    the repo share to the groups user join or
    got token if user is not logged in
    
    """
    # Not logged-in user
    if not request.user.is_authenticated():
        token = request.COOKIES.get('anontoken', None)
        if token:
            return True
        else:
            return False

    # Logged-in user
    repos = seafserv_threaded_rpc.list_share_repos(request.user.username, 'to_email', -1, -1)
    for repo in repos:
        if repo.props.id == repo_id:
            return True

    groups = ccnet_threaded_rpc.get_groups(request.user.username)
    # for every group that user joined...    
    for group in groups:
        # ...get repo ids in that group, and check whether repo ids contains that repo id 
        repo_ids = get_group_repoids(group.props.id)
        if repo_id in repo_ids:
            return True

    return False

def access_to_repo(request, repo_id, repo_ap):
    """
    Check whether user in the request can access to repo, which means user can
    view directory entries on repo page. Only repo owner or person who is shared
   can access to repo.

    """
    if repo_ap == 'own' and not validate_owner(request, repo_id) \
            and not check_shared_repo(request, repo_id):
        return False
    else:
        return True

def gen_path_link(path, repo_name):
    """
    Generate navigate paths and links in repo page.
    
    """
    if path and path[-1] != '/':
        path += '/'

    paths = []
    links = []
    if path and path != '/':
        paths = path[1:-1].split('/')
        i=1
        for name in paths:
            link = '/' + '/'.join(paths[:i])
            i = i + 1
            links.append(link)
    paths.insert(0, repo_name)
    links.insert(0, '/')
        
    zipped = zip(paths, links)
    
    return zipped
    
def render_repo(request, repo_id, error=''):
    # get repo web access property, if no repo access property in db, then
    # assume repo ap is 'own'
    # repo_ap = seafserv_threaded_rpc.repo_query_access_property(repo_id)
    # if not repo_ap:
    #     repo_ap = 'own'

    # Since repo web access property is removed since 0.9.4, we assume all repo
    # is 'own' for compatibility
    repo_ap = 'own'
    
    # Check whether user can view repo page
    can_access = access_to_repo(request, repo_id, repo_ap)
    if not can_access:
        return go_permission_error(request, '无法访问该同步目录')

    # Check whether use is repo owner
    if validate_owner(request, repo_id):
        is_owner = True
    else:
        is_owner = False
    
    repo = get_repo(repo_id)
    if not repo:
        return go_error(request, u'该同步目录不存在')

    # query whether set password if repo is encrypted
    password_set = False
    if repo.props.encrypted:
        try:
            ret = seafserv_rpc.is_passwd_set(repo_id, request.user.username)
            if ret == 1:
                password_set = True
        except SearpcError, e:
            return go_error(request, e.msg)

    # view newest worktree or history worktree
    commit_id = request.GET.get('commit_id', '')
    view_history = True if commit_id else False
    current_commit = seafserv_threaded_rpc.get_commit(commit_id)
    if not current_commit:
        current_commit = get_commits(repo_id, 0, 1)[0]
    
    # query repo infomation
    repo_size = seafserv_threaded_rpc.server_repo_size(repo_id)

    # get repo dirents
    dirs = []
    path = ''
    zipped = []
    dir_list = []
    file_list = []
    if not repo.props.encrypted or password_set:
        path = request.GET.get('p', '/')
        if path[-1] != '/':
            path = path + '/'
        
        if current_commit.root_id == EMPTY_SHA1:
            dirs = []
        else:
            try:
                dirs = seafserv_threaded_rpc.list_dir_by_path(current_commit.id,
                                                     path.encode('utf-8'))
            except SearpcError, e:
                return go_error(request, e.msg)
            for dirent in dirs:
                if stat.S_ISDIR(dirent.props.mode):
                    dir_list.append(dirent)
                else:
                    file_list.append(dirent)
                    try:
                        dirent.file_size = seafserv_threaded_rpc.get_file_size(dirent.obj_id)
                    except:
                        dirent.file_size = 0
            dir_list.sort(lambda x, y : cmp(x.obj_name.lower(),
                                            y.obj_name.lower()))
            file_list.sort(lambda x, y : cmp(x.obj_name.lower(),
                                             y.obj_name.lower()))

    if request.user.is_authenticated() and not view_history:
        try:
            accessible_repos = get_accessible_repos(request, repo)
        except SearpcError, e:
            error_msg = e.msg
            return go_error(request, error_msg)
    else:
         accessible_repos = []   

    # generate path and link
    zipped = gen_path_link(path, repo.name)

    return render_to_response('repo.html', {
            "repo": repo,
            "can_access": can_access,
            "current_commit": current_commit,
            "view_history": view_history,
            "is_owner": is_owner,
            "password_set": password_set,
            "repo_ap": repo_ap,
            "repo_size": repo_size,
            "dir_list": dir_list,
            "file_list": file_list,
            "path" : path,
            "zipped" : zipped,
            "error" : error,
            "accessible_repos" : accessible_repos,
            }, context_instance=RequestContext(request))

@login_required    
def repo_upload_file(request, repo_id):
    repo = get_repo(repo_id)
    total_space = settings.USER_TOTAL_SPACE
    used_space = seafserv_threaded_rpc.get_user_quota_usage(request.user.username)
    ############ GET ############
    if request.method == 'GET':
        parent_dir  = request.GET.get('p', '/')
        zipped = gen_path_link (parent_dir, repo.name)
        # TODO: per user quota, org user quota
        return render_to_response ('repo_upload_file.html', {
            "repo": repo,
            "parent_dir": parent_dir,
            "used_space": used_space,
            "total_space": total_space,
            "zipped": zipped,
            "max_upload_file_size": settings.MAX_UPLOAD_FILE_SIZE,
            }, context_instance=RequestContext(request))
        
    ############ POST ############
    parent_dir = request.POST.get('parent_dir', '/')
    def render_upload_error(error_msg):
        zipped = gen_path_link (parent_dir, repo.name)
        return render_to_response ('repo_upload_file.html', {
            "error_msg": error_msg,
            "repo": repo,
            "used_space": used_space,
            "total_space": total_space,
            "zipped": zipped,
            "parent_dir": parent_dir,
            "max_upload_file_size": settings.MAX_UPLOAD_FILE_SIZE,
            }, context_instance=RequestContext(request))
        
    try:
        tmp_file = request.FILES['file']
    except:
        error_msg = u'请选择一个文件'
        return render_upload_error(error_msg)

    tmp_file_path = tmp_file.temporary_file_path()
    if not os.access(tmp_file_path, os.F_OK):
        error_msg = u'上传文件失败'
        return render_upload_error(error_msg)

    def remove_tmp_file():
        try:
            os.remove(tmp_file.temporary_file_path())
        except:
            pass

    # rename the file if there is name conflicts
    filename = check_filename_with_rename(repo_id, parent_dir, tmp_file.name)
    if len(filename) > settings.MAX_UPLOAD_FILE_NAME_LEN:
        remove_tmp_file()
        error_msg = u"您上传的文件名称太长"
        return go_error(request, error_msg)

    if tmp_file.size > settings.MAX_UPLOAD_FILE_SIZE:
        error_msg = u"您上传的文件太大"
        remove_tmp_file()
        return go_error(request, error_msg)

    try:
        seafserv_threaded_rpc.post_file (repo_id, tmp_file_path, parent_dir,
                                         filename, request.user.username);
    except SearpcError, e:
        remove_tmp_file()
        error_msg = e.msg
        return render_upload_error(error_msg)
    else:
        remove_tmp_file()
        url = reverse('repo', args=[repo_id]) + ('?p=%s' % parent_dir)
        return HttpResponseRedirect(url)

@login_required
def repo_update_file(request, repo_id):
    repo = get_repo(repo_id)
    total_space = settings.USER_TOTAL_SPACE
    used_space = seafserv_threaded_rpc.get_user_quota_usage(request.user.username)
    ############ GET ############
    if request.method == 'GET':
        target_file  = request.GET.get('p')
        if not target_file:
            return go_error(request)
        zipped = gen_path_link (target_file, repo.name)
        # TODO: per user quota, org user quota
        return render_to_response ('repo_update_file.html', {
            "repo": repo,
            "target_file": target_file,
            "used_space": used_space,
            "total_space": total_space,
            "zipped": zipped,
            "max_upload_file_size": settings.MAX_UPLOAD_FILE_SIZE,
            }, context_instance=RequestContext(request))
        
    ############ POST ############
    target_file = request.POST.get('target_file')
    if not target_file:
        return go_error(request)

    def render_update_file_error(error_msg):
        zipped = gen_path_link (target_file, repo.name)
        return render_to_response ('repo_update.html', {
            "error_msg": error_msg,
            "repo": repo,
            "used_space": used_space,
            "total_space": total_space,
            "zipped": zipped,
            "target_file": target_file,
            "max_upload_file_size": settings.MAX_UPLOAD_FILE_SIZE,
            }, context_instance=RequestContext(request))
        
    try:
        tmp_file = request.FILES['file']
    except:
        error_msg = u'请选择一个文件'
        return render_update_file_error(error_msg)

    tmp_file_path = tmp_file.temporary_file_path()
    if not os.access(tmp_file_path, os.F_OK):
        error_msg = u'上传文件失败'
        return render_update_file_error(error_msg)

    def remove_tmp_file():
        try:
            os.remove(tmp_file.temporary_file_path())
        except:
            pass

    if tmp_file.size > settings.MAX_UPLOAD_FILE_SIZE:
        error_msg = u"您上传的文件太大"
        remove_tmp_file()
        return go_error(request, error_msg)

    parent_dir = os.path.dirname(target_file)
    filename   = os.path.basename(target_file)

    try:
        seafserv_threaded_rpc.put_file (repo_id, tmp_file_path, parent_dir,
                                         filename, request.user.username);
    except SearpcError, e:
        remove_tmp_file()
        error_msg = e.msg
        return render_update_file_error(error_msg)
    else:
        remove_tmp_file()
        url = reverse('repo', args=[repo_id]) + ('?p=%s' % parent_dir)
        return HttpResponseRedirect(url)
    
def get_subdir(request):
    repo_id = request.GET.get('repo_id', '')
    path = request.GET.get('path', '')

    if not (repo_id and path):
        return go_error(request)

    latest_commit = get_commits(repo_id, 0, 1)[0]
    try:
        dirents = seafserv_threaded_rpc.list_dir_by_path(latest_commit.id, path.encode('utf-8'))
    except SearpcError, e:
        return go_error(request, e.msg)

    subdirs = []
    for dirent in dirents:
        if not stat.S_ISDIR(dirent.props.mode):
            continue

        dirent.has_subdir = False
        path_ = os.path.join (path, dirent.obj_name)
        try:
            dirs_ = seafserv_threaded_rpc.list_dir_by_path(latest_commit.id, path_.encode('utf-8'))
        except SearpcError, e:
            return go_error(request, e.msg)

        for dirent_ in dirs_:
            if stat.S_ISDIR(dirent_.props.mode):
                dirent.has_subdir = True
                break

        if dirent.has_subdir:
            subdir = {
                'data': dirent.obj_name,
                'attr': {'repo_id': repo_id },
                'state': 'closed'
                    }
            subdirs.append(subdir)
        else:
            subdirs.append(dirent.obj_name)

    content_type = 'application/json; charset=utf-8'
    return HttpResponse(json.dumps(subdirs),
                            content_type=content_type)
 
def repo(request, repo_id):
    if request.method == 'GET':
        return render_repo(request, repo_id)
    elif request.method == 'POST':
        password = request.POST.get('password', '')
        if not password:
            return render_repo(request, repo_id, u'密码不能为空')

        try:
            seafserv_threaded_rpc.set_passwd(repo_id, request.user.username, password)
        except SearpcError, e:
            if e.msg == 'Bad arguments':
                return go_error(request, u'url 格式不正确')
            elif e.msg == 'Repo is not encrypted':
                return render_repo(request, repo_id)
            elif e.msg == 'Incorrect password':
                return render_repo(request, repo_id, u'密码不正确，请重新输入')
            elif e.msg == 'Internal server error':
                return go_error(request, u'服务器内部故障')
            else:
                return go_error(request, u'未知错误')

        return render_repo(request, repo_id)

@login_required
def repo_history(request, repo_id):
    """
    View repo history
    """
    repo_ap = seafserv_threaded_rpc.repo_query_access_property(repo_id)
    if not repo_ap:
        repo_ap = 'own'
        
    if not access_to_repo(request, repo_id, repo_ap):
        return go_permission_error(request, u'无法浏览该同步目录修改历史')
    
    repo = get_repo(repo_id)

    password_set = False
    if repo.props.encrypted:
        try:
            ret = seafserv_rpc.is_passwd_set(repo_id, request.user.username)
            if ret == 1:
                password_set = True
        except SearpcError, e:
            return go_error(request, e.msg)

    if repo.props.encrypted and not password_set:
        return HttpResponseRedirect(reverse('repo', args=[repo_id]))

    try:
        current_page = int(request.GET.get('page', '1'))
        per_page= int(request.GET.get('per_page', '25'))
    except ValueError:
        current_page = 1
        per_page = 25

    commits_all = get_commits(repo_id, per_page * (current_page -1),
                              per_page + 1)
    commits = commits_all[:per_page]

    if len(commits_all) == per_page + 1:
        page_next = True
    else:
        page_next = False

    is_owner = False
    if request.user.is_authenticated():
        if validate_owner(request, repo_id):
            is_owner = True

    return render_to_response('repo_history.html', {
            "repo": repo,
            "commits": commits,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
            'is_owner': is_owner,
            }, context_instance=RequestContext(request))

def repo_history_revert(request, repo_id):
    """
    Only repo owner can revert repo.
    """
    if not validate_owner(request, repo_id):
        return go_permission_error(request, u'只有同步目录拥有者有权还原目录')
    
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    password_set = False
    if repo.props.encrypted:
        try:
            ret = seafserv_rpc.is_passwd_set(repo_id, request.user.username)
            if ret == 1:
                password_set = True
        except SearpcError, e:
            return go_error(request, e.msg)

    if repo.props.encrypted and not password_set:
        return HttpResponseRedirect(reverse('repo', args=[repo_id]))

    commit_id = request.GET.get('commit_id', '')
    if not commit_id:
        return go_error(request, u'请指定历史记录 ID')

    res = request.user.username.split('@')
    user_name = res[0]

    try:
        seafserv_threaded_rpc.revert_on_server(repo_id, commit_id, user_name)
    except SearpcError, e:
        if e.msg == 'Bad arguments':
            return go_error(request, u'非法参数')
        elif e.msg == 'No such repo':
            return go_error(request, u'同步目录不存在')
        elif e.msg == "Commit doesn't exist":
            return go_error(request, u'指定的历史记录不存在')
        else:
            return go_error(request, u'未知错误')

    return HttpResponseRedirect(reverse(repo_history, args=[repo_id]))

def get_diff(repo_id, arg1, arg2):
    lists = {'new' : [], 'removed' : [], 'renamed' : [], 'modified' : [], \
                 'newdir' : [], 'deldir' : []}

    diff_result = seafserv_threaded_rpc.get_diff(repo_id, arg1, arg2)
    if not diff_result:
        return lists

    for d in diff_result:
        if d.status == "add":
            lists['new'].append(d.name)
        elif d.status == "del":
            lists['removed'].append(d.name)
        elif d.status == "mov":
            lists['renamed'].append(d.name + " ==> " + d.new_name)
        elif d.status == "mod":
            lists['modified'].append(d.name)
        elif d.status == "newdir":
            lists['newdir'].append(d.name)
        elif d.status == "deldir":
            lists['deldir'].append(d.name)

    return lists

def repo_history_changes(request, repo_id):
    changes = {}
    content_type = 'application/json; charset=utf-8'

    repo_ap = seafserv_threaded_rpc.repo_query_access_property(repo_id)
    if repo_ap == None:
        repo_ap = 'own'
        
    if not access_to_repo(request, repo_id, repo_ap):
        return HttpResponse(json.dumps(changes),
                            content_type=content_type)

    repo = get_repo(repo_id)
    if not repo:
        return HttpResponse(json.dumps(changes),
                            content_type=content_type)

    password_set = False
    if repo.props.encrypted:
        try:
            ret = seafserv_rpc.is_passwd_set(repo_id, request.user.username)
            if ret == 1:
                password_set = True
        except:
            return HttpResponse(json.dumps(changes),
                                content_type=content_type)

    if repo.props.encrypted and not password_set:
        return HttpResponse(json.dumps(changes),
                            content_type=content_type)

    commit_id = request.GET.get('commit_id', '')
    if not commit_id:
        return HttpResponse(json.dumps(changes),
                            content_type=content_type)

    changes = get_diff(repo_id, '', commit_id)

    return HttpResponse(json.dumps(changes),
                        content_type=content_type)
    
@login_required
def modify_token(request, repo_id):
    if not validate_owner(request, repo_id):
        return HttpResponseRedirect(reverse('repo', args=[repo_id]))

    token = request.POST.get('token', '')
    if token:
        seafserv_threaded_rpc.set_repo_token(repo_id, token)

    return HttpResponseRedirect(reverse('repo', args=[repo_id]))

@login_required
def remove_repo(request, repo_id):
    if not validate_owner(request, repo_id) and not request.user.is_staff:
        return go_permission_error(request, u'删除同步目录失败')
    
    seafserv_threaded_rpc.remove_repo(repo_id)
    next = request.GET.get('next', '/')
    return HttpResponseRedirect(next)
    
#@login_required
#def remove_fetched_repo(request, user_id, repo_id):
#    if user_id and repo_id:
#        seafserv_threaded_rpc.remove_fetched_repo (user_id, repo_id)
#        
#    return HttpResponseRedirect(request.META['HTTP_REFERER'])

@login_required
def myhome(request):
    owned_repos = []
    quota_usage = 0
    output_msg = {}

    email = request.user.username
    quota_usage = seafserv_threaded_rpc.get_user_quota_usage(email)

    # Repos that I own
    owned_repos = seafserv_threaded_rpc.list_owned_repos(email)
    calculate_repo_last_modify(owned_repos)
    owned_repos.sort(lambda x, y: cmp(y.latest_modify, x.latest_modify))
    
    # Repos that are share to me
    in_repos = seafserv_threaded_rpc.list_share_repos(email,
                                                      'to_email', -1, -1)
    calculate_repo_last_modify(in_repos)
    in_repos.sort(lambda x, y: cmp(y.latest_modify, x.latest_modify))

    # my contacts
    contacts = Contact.objects.filter(user_email=email)

    # user notifications
    grpmsg_list = []
    grpmsg_reply_list = []
    notes = UserNotification.objects.filter(to_user=request.user.username)
    for n in notes:
        if n.msg_type == 'group_msg':
            grpmsg_list.append(n.detail)
        elif n.msg_type == 'grpmsg_reply':
            grpmsg_reply_list.append(n.detail)

    # my groups
    groups = ccnet_threaded_rpc.get_groups(email)
    groups_manage = []
    groups_join = []
    for group in groups:
        if str(group.id) in grpmsg_list:
            group.new_msg = True
        else:
            group.new_msg = False
        if group.props.creator_name == request.user.username:
            groups_manage.append(group)
        else:
            groups_join.append(group)
    
    # get nickname
    if not Profile.objects.filter(user=request.user.username):
        nickname = ''
    else:
        profile = Profile.objects.filter(user=request.user.username)[0]
        nickname = profile.nickname

    return render_to_response('myhome.html', {
            "myname": email,
            "nickname": nickname,
            "owned_repos": owned_repos,
            "quota_usage": quota_usage,
            "in_repos": in_repos,
            "contacts": contacts,
            "groups": groups,
            "grpmsg_reply_list": grpmsg_reply_list,
            "groups_manage": groups_manage,
            "groups_join": groups_join,
            }, context_instance=RequestContext(request))

@login_required
def ownerhome(request, owner_name):
    owned_repos = []
    quota_usage = 0

    owned_repos = seafserv_threaded_rpc.list_owned_repos(owner_name)
    quota_usage = seafserv_threaded_rpc.get_user_quota_usage(owner_name)

    user_dict = user_info(request, owner_name)
    
    return render_to_response('ownerhome.html', {
            "owned_repos": owned_repos,
            "quota_usage": quota_usage,
            "owner": owner_name,
            "user_dict": user_dict,
            }, context_instance=RequestContext(request))

@login_required
def repo_set_access_property(request, repo_id):
    ap = request.GET.get('ap', '')
    seafserv_threaded_rpc.repo_set_access_property(repo_id, ap)
        
    return HttpResponseRedirect(reverse('repo', args=[repo_id]))

@login_required    
def repo_del_file(request, repo_id):
    parent_dir = request.GET.get("p", "/")
    file_name = request.GET.get("file_name")
    user = request.user.username
    try:
        seafserv_threaded_rpc.del_file(repo_id, parent_dir,file_name, user)
    except Exception, e:
        pass

    url = reverse('repo', args=[repo_id]) + ('?p=%s' % parent_dir)
    return HttpResponseRedirect(url)

def repo_view_file(request, repo_id):
    """
    Preview file on web, including files in current worktree and history.
    """
    http_server_root = get_httpserver_root()
    path = request.GET.get('p', '/')
    if path[-1] == '/':
        path = path[:-1]
    u_filename = os.path.basename(path)
    filename = urllib2.quote(u_filename.encode('utf-8'))

    commit_id = request.GET.get('commit_id', '')
    view_history = True if commit_id else False
    current_commit = seafserv_threaded_rpc.get_commit(commit_id)
    if not current_commit:
        current_commit = get_commits(repo_id, 0, 1)[0]

    if view_history:
        obj_id = request.GET.get('obj_id', '')
    else:
        try:
            obj_id = seafserv_threaded_rpc.get_file_by_path(repo_id, path)
        except:
            obj_id = None

    if not obj_id:
        return go_error(request, '文件不存在')
    
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    # if a repo is shared to me, then I can view and download file no mater whether
    # repo's access property is 'own' or 'public'
    if check_shared_repo(request, repo_id):
        share_to_me = True
    else:
        share_to_me = False
            
    token = ''        
    # people who is owner or this repo is shared to him, can visit the repo;
    # others, just go to 404 page           
    if validate_owner(request, repo_id) or share_to_me:
        # owner should get a token to visit repo                
        token = gen_token()
        # put token into memory in seaf-server
        seafserv_rpc.web_save_access_token(token, obj_id)
    else:
        raise Http404

    # generate path and link
    zipped = gen_path_link(path, repo.name)

    # determin whether file can preview on web
    can_preview, filetype = valid_previewed_file(filename)
    
    # raw path
    tmp_str = '%s/access?repo_id=%s&id=%s&filename=%s&op=%s&t=%s&u=%s'
    raw_path = tmp_str % (http_server_root,
                          repo_id, obj_id,
                          filename, 'view', 
                          token,
                          request.user.username)

    # file share link
    l = FileShare.objects.filter(repo_id=repo_id).filter(\
        username=request.user.username).filter(path=path)
    fileshare = l[0] if len(l) > 0 else None

    http_or_https = request.is_secure() and 'https' or 'http'
    domain = RequestSite(request).domain
    if fileshare:
        file_shared_link = '%s://%s%sf/%s/' % (http_or_https, domain,
                                               settings.SITE_ROOT,
                                               fileshare.token)
    else:
        file_shared_link = ''

    return render_to_response('repo_view_file.html', {
            'repo': repo,
            'path': path,
            'obj_id': obj_id,
            'u_filename': u_filename,
            'file_name': filename,
            'path': path,
            'zipped': zipped,
            'view_history': view_history,
            'current_commit': current_commit,
            'token': token,
            'can_preview': can_preview,
            'filetype': filetype,
            'raw_path': raw_path,
            'fileshare': fileshare,
            'protocol': http_or_https,
            'domain': domain,
            'file_shared_link': file_shared_link,
            }, context_instance=RequestContext(request))

def repo_file_get(request, repo_id):
    """
    Handle ajax request to get file content from httpserver.
    If get current worktree file, need access_token, path and username from
    url params.
    If get history file, need access_token, path username and obj_id from
    url params.
    """
    if not request.is_ajax():
        return Http404

    http_server_root = get_httpserver_root()
    content_type = 'application/json; charset=utf-8'
    access_token = request.GET.get('t')
    path = request.GET.get('p', '/')
    if path[-1] == '/':
        path = path[:-1]
        
    filename = urllib2.quote(os.path.basename(path).encode('utf-8'))
    obj_id = request.GET.get('obj_id', '')
    if not obj_id:
        try:
            obj_id = seafserv_threaded_rpc.get_file_by_path(repo_id, path)
        except:
            obj_id = None
    if not obj_id:
        data = json.dumps([{'error': '获取文件数据失败'}])
        return HttpResponse(data, status=400, content_type=content_type)

    username = request.GET.get('u', '')
    tmp_str = '%s/access?repo_id=%s&id=%s&filename=%s&op=%s&t=%s&u=%s'
    redirect_url = tmp_str % (http_server_root,
                              repo_id, obj_id,
                              filename, 'view', 
                              access_token,
                              username)
    try:
        proxied_request = urllib2.urlopen(redirect_url)
        if long(proxied_request.headers['Content-Length']) > FILE_PREVIEW_MAX_SIZE:
            data = json.dumps([{'error': '文件超过10M，无法在线查看。'}])
            return HttpResponse(data, status=400, content_type=content_type)
        else:
            content = proxied_request.read()
    except urllib2.HTTPError, e:
        err = 'HTTPError: 无法在线打开该文件'
        data = json.dumps([{'error': err}])
        return HttpResponse(data, status=400, content_type=content_type)
    except urllib2.URLError as e:
        err = 'URLError: 无法在线打开该文件'
        data = json.dumps([{'error': err}])
        return HttpResponse(data, status=400, content_type=content_type)
    else:
        l, d = [], {}
        try:
            # XXX: file in windows is encoded in gbk
            u_content = content.decode('gbk')
        except:
            u_content = content.decode('utf-8')
        from django.utils.html import escape
        d['content'] = re.sub("\r\n|\n", "<br />", escape(u_content))
        l.append(d)
        data = json.dumps(l)
        return HttpResponse(data, status=200, content_type=content_type)
    
def repo_access_file(request, repo_id, obj_id):
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    password_set = False
    if repo.props.encrypted:
        try:
            ret = seafserv_rpc.is_passwd_set(repo_id, request.user.username)
            if ret == 1:
                password_set = True
        except SearpcError, e:
            return go_error(request, e.msg)

    if repo.props.encrypted and not password_set:
        return HttpResponseRedirect(reverse('repo', args=[repo_id]))

    op = request.GET.get('op', 'view')
    file_name = request.GET.get('file_name', '')

    if op == 'del':
        return repo_del_file(request, repo_id)

    # if a repo doesn't have access property in db, then assume it's 'own'
    # repo_ap = seafserv_threaded_rpc.repo_query_access_property(repo_id)
    # if not repo_ap:
    #     repo_ap = 'own'
    repo_ap = 'own'

    # if a repo is shared to me, then I can view and download file no mater whether
    # repo's access property is 'own' or 'public'
    if check_shared_repo(request, repo_id):
        share_to_me = True
    else:
        share_to_me = False

    # If vistor's file shared token in url params matches the token in db,
    # then we know the vistor is from file shared link.
    share_token = request.GET.get('t', '')
    path = '/' + file_name
    if FileShare.objects.filter(token=share_token).filter(path=path) > 0:
        from_shared_link = True
    else:
        from_shared_link = False

    token = ''        
    if repo_ap == 'own':
        # people who is owner or this repo is shared to him, can visit the repo;
        # others, just go to 404 page           
        if validate_owner(request, repo_id) or share_to_me or from_shared_link:
            # owner should get a token to visit repo                
            token = gen_token()
            # put token into memory in seaf-server
            seafserv_rpc.web_save_access_token(token, obj_id)
        else:
            raise Http404

    http_server_root = get_httpserver_root()

    tmp_str = '%s/access?repo_id=%s&id=%s&filename=%s&op=%s&t=%s&u=%s'
    redirect_url = tmp_str % (http_server_root,
                              repo_id, obj_id,
                              file_name, op, 
                              token,
                              request.user.username)
    return HttpResponseRedirect(redirect_url)
 
@login_required
def repo_download(request):
    repo_id = request.GET.get('repo_id', '')

    repo = seafserv_threaded_rpc.get_repo(repo_id)    
    repo_name = repo.props.name
    quote_repo_name = quote(repo_name.encode('utf-8'))
    encrypted = repo.props.encrypted
    if encrypted:
        enc = '1'
    else:
        enc = ''
    relay_id = ccnet_rpc.get_session_info().id
    if not relay_id:
        return render_to_response('error.html', {
                "error_msg": u"下载失败：无法取得中继"
                }, context_instance=RequestContext(request))

    ccnet_applet_root = get_ccnetapplet_root()
    redirect_url = "%s/repo/download/?repo_id=%s&relay_id=%s&repo_name=%s&encrypted=%s" % (
        ccnet_applet_root, repo_id, relay_id, quote_repo_name, enc)

    return HttpResponseRedirect(redirect_url)

@login_required    
def file_move(request):
    src_repo_id = request.POST.get('src_repo')
    src_path    = request.POST.get('src_path')
    dst_repo_id = request.POST.get('dst_repo')
    dst_path    = request.POST.get('dst_path')
    obj_name    = request.POST.get('obj_name')
    obj_type    = request.POST.get('obj_type') # dir or file
    op          = request.POST.get('operation')

    if not (src_repo_id and src_path and dst_repo_id \
            and dst_path and obj_name and obj_type and op):
        return go_error(request)

    # do nothing when dst is the same as src
    if src_repo_id == dst_repo_id and src_path == dst_path:
        url = reverse('repo', args=[src_repo_id]) + ('?p=%s' % src_path)
        return HttpResponseRedirect(url)

    # Error when moving/copying a dir to its subdir
    if obj_type == 'dir':
        src_dir = os.path.join(src_path, obj_name)
        if dst_path.startswith(src_dir):
            error_msg = u"不能把目录 %s %s到它的子目录 %s" \
                        % (src_dir, u"复制" if op == 'cp' else u"移动", dst_path)
            return go_error(request, error_msg)

    new_obj_name = check_filename_with_rename(dst_repo_id, dst_path, obj_name)

    try:
        if op == 'cp':
            seafserv_threaded_rpc.copy_file (src_repo_id, src_path, obj_name,
                                             dst_repo_id, dst_path, new_obj_name,
                                             request.user.username)
        elif op == 'mv':
            seafserv_threaded_rpc.move_file (src_repo_id, src_path, obj_name,
                                             dst_repo_id, dst_path, new_obj_name,
                                             request.user.username)
    except Exception, e:
        return go_error(request, str(e))

    url = reverse('repo', args=[src_repo_id]) + ('?p=%s' % src_path)

    return HttpResponseRedirect(url)

        

def seafile_access_check(request):
    repo_id = request.GET.get('repo_id', '')
    applet_root = get_ccnetapplet_root()
    
    return render_to_response(
        'seafile_access_check.html', {
            'repo_id': repo_id,
            'applet_root': applet_root,
        },
        context_instance=RequestContext(request))

@login_required
def repo_remove_share(request):
    """
    If repo is shared from one person to another person, only these two peson
    can remove share.
    If repo is shared from one person to a group, then only the one share the
    repo and group staff can remove share.
    """
    repo_id = request.GET.get('repo_id', '')
    group_id = request.GET.get('gid')
    from_email = request.GET.get('from', '')
    
    # if request params don't have 'gid', then remove repos that share to
    # to other person; else, remove repos that share to groups
    if not group_id:
        to_email = request.GET.get('to', '')
        if request.user.username != from_email and \
                request.user.username != to_email:
            return go_permission_error(request, u'取消共享失败')
        seafserv_threaded_rpc.remove_share(repo_id, from_email, to_email)
    else:
        try:
            group_id_int = int(group_id)
        except:
            return go_error(request, u'group id 不是有效参数')

        if not check_group_staff(group_id_int, request.user) \
                and request.user.username != from_email: 
            return go_permission_error(request, u'取消共享失败')        
        from seahub.group.views import group_unshare_repo
        group_unshare_repo(request, repo_id, group_id_int, from_email)

    referer = request.META.get('HTTP_REFERER', None)
    if not referer:
        referer = 'share_admin'
        return HttpResponseRedirect(reverse(referer))
    else:
        return HttpResponseRedirect(referer)
    
@login_required
def mypeers(request):
    cid = get_user_cid(request.user)

@login_required
def sys_seafadmin(request):
    if not request.user.is_staff:
        raise Http404

    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page= int(request.GET.get('per_page', '25'))
    except ValueError:
        current_page = 1
        per_page = 25

    repos_all = seafserv_threaded_rpc.get_repo_list(per_page *
                                                    (current_page -1),
                                                    per_page + 1)
        
    repos = repos_all[:per_page]

    if len(repos_all) == per_page + 1:
        page_next = True
    else:
        page_next = False

    for repo in repos:
        try:
            repo.owner = seafserv_threaded_rpc.get_repo_owner(repo.props.id)
        except:
            repo.owner = None
            
    return render_to_response(
        'sys_seafadmin.html', {
            'repos': repos,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
        },
        context_instance=RequestContext(request))

@login_required
def org_seafadmin(request):
    if not request.user.org:
        raise Http404

    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page= int(request.GET.get('per_page', '25'))
    except ValueError:
        current_page = 1
        per_page = 25

    repos_all = seafserv_threaded_rpc.get_org_repo_list(request.user.org.org_id,
                                                        per_page * (current_page -1),
                                                        per_page + 1)
        
    repos = repos_all[:per_page]

    if len(repos_all) == per_page + 1:
        page_next = True
    else:
        page_next = False

    for repo in repos:
        try:
            repo.owner = seafserv_threaded_rpc.get_repo_owner(repo.props.id)
        except:
            repo.owner = None
            
    return render_to_response(
        'org_seafadmin.html', {
            'repos': repos,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
        },
        context_instance=RequestContext(request))

@login_required
def sys_useradmin(request):
    if not request.user.is_staff:
        raise Http404

    users = ccnet_threaded_rpc.get_emailusers(-1,-1)
        
    for user in users:
        if user.props.id == request.user.id:
            user.is_self = True
        # TODO: may add new is_org_user rpc
        user.is_org_user = True if ccnet_threaded_rpc.get_org_by_user(user.email) else False
            
    return render_to_response(
        'sys_useradmin.html', {
            'users': users,
        },
        context_instance=RequestContext(request))

@login_required
def org_useradmin(request):
    if not request.user.org.is_staff:
        raise Http404

    users = ccnet_threaded_rpc.get_org_emailusers(request.user.org.url_prefix,
                                         0, sys.maxint)
        
    for user in users:
        if user.props.id == request.user.id:
            user.is_self = True
            user.is_org_user = True
            
    return render_to_response(
        'org_useradmin.html', {
            'users': users,
        },
        context_instance=RequestContext(request))

@login_required
def user_info(request, email):
    if request.user.username == email:
        return HttpResponseRedirect(reverse(myhome))
    
    if not request.user.is_staff:
        return go_permission_error(request, u'权限不足：无法查看该用户信息')

    # if request.user.org and not request.user.org.is_staff:
    #     return go_permission_error(request, u'权限不足：无法查看该用户信息')

#    user_dict = {}
    owned_repos = []
    quota_usage = 0

    owned_repos = seafserv_threaded_rpc.list_owned_repos(email)
    quota_usage = seafserv_threaded_rpc.get_user_quota_usage(email)

#    try:
#        peers = ccnet_threaded_rpc.get_peers_by_email(email)
#        for peer in peers:
#            if not peer:
#                continue
#            peername = peer.props.name
#            roles = peer.props.role_list
#            user_dict[peername] = roles
#    except:
#        pass

    # Repos that are share to user
    in_repos = seafserv_threaded_rpc.list_share_repos(email, 'to_email', -1, -1)

    return render_to_response(
        'userinfo.html', {
            'owned_repos': owned_repos,
            'quota_usage': quota_usage,
            "in_repos": in_repos,
#            'user_dict': user_dict,
            'email': email
            },
        context_instance=RequestContext(request))

#@login_required
#def role_add(request, user_id):
#    if not request.user.is_staff:
#        raise Http404
# 
#    if request.method == 'POST':
#        role = request.POST.get('role', '')
#        if role and len(role) <= 16:
#            ccnet_rpc.add_role(user_id, role)
# 
#    return HttpResponseRedirect(request.META['HTTP_REFERER'])

#@login_required
#def role_remove(request, user_id):
#    if not request.user.is_staff:
#        raise Http404
# 
#    role = request.REQUEST.get('role', '')
#    if role and len(role) <= 16:
#        ccnet_rpc.remove_role(user_id, role)
# 
#    return HttpResponseRedirect(request.META['HTTP_REFERER'])

@login_required
def user_remove(request, user_id):
    """The user id is emailuser id."""
    
    if not request.user.is_staff and not request.user.org.is_staff:
        raise Http404

    ccnetuser = get_ccnetuser(userid=int(user_id))
    if ccnetuser.org:
        ccnet_threaded_rpc.remove_org_user(ccnetuser.org.org_id, ccnetuser.username)
    ccnetuser.delete()

    if request.user.is_staff:
        return HttpResponseRedirect(reverse('sys_useradmin'))
    else:
        return HttpResponseRedirect(reverse('org_useradmin'))

@login_required
def activate_user(request, user_id):
    """The user id is emailuser id."""

    if not request.user.is_staff:
        raise Http404

    ccnetuser = get_ccnetuser(userid=int(user_id))
    ccnetuser.is_active = True
    ccnetuser.save()

    return HttpResponseRedirect(reverse('useradmin'))

def send_user_add_mail(request, email, password):
    """ Send email when add new user """
    
    use_https = request.is_secure()
    domain = RequestSite(request).domain
    
    t = loader.get_template('user_add_email.html')
    c = {
        'user': request.user.username,
        'org': request.user.org,
        'email': email,
        'password': password,
        'domain': domain,
        'protocol': use_https and 'https' or 'http',
        }
    try:
        send_mail(u'SeaCloud注册信息', t.render(Context(c)),
                  None, [email], fail_silently=False)
        messages.add_message(request, messages.INFO, email)
    except:
        messages.add_message(request, messages.ERROR, email)

@login_required
def user_add(request):
    """Add a user"""

    if not request.user.is_staff and not request.user.org.is_staff:
        raise Http404

    base_template = 'org_admin_base.html' if request.user.org else 'admin_base.html'
    
    if request.method == 'POST':
        form = AddUserForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data['email']
            password = form.cleaned_data['password1']

            ccnetuser = CcnetUser(username=email, raw_password=password)
            ccnetuser.is_active = True
            ccnetuser.save()
            
            if request.user.org:
                org_id = request.user.org.org_id
                ccnet_threaded_rpc.add_org_user(org_id, email, 0)
                if hasattr(settings, 'EMAIL_HOST'):
                    send_user_add_mail(request, email, password)
                    
                return HttpResponseRedirect(reverse('org_useradmin'))
            else:
                if hasattr(settings, 'EMAIL_HOST'):
                    send_user_add_mail(request, email, password)
                
                return HttpResponseRedirect(reverse('sys_useradmin', args=[]))
    else:
        form = AddUserForm()
    
    return render_to_response("add_user_form.html",  {
            'form': form,
            'base_template': base_template,
            }, context_instance=RequestContext(request))

def back_local(request):
    ccnet_applt_root = get_ccnetapplet_root()

    redirect_url = '%s/home/' % ccnet_applt_root

    return HttpResponseRedirect(redirect_url)

def sys_group_admin(request):
    if not request.user.is_staff:
        raise Http404

    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page= int(request.GET.get('per_page', '25'))
    except ValueError:
        current_page = 1
        per_page = 25

    groups_plus_one = ccnet_threaded_rpc.get_all_groups(per_page * (current_page -1),
                                               per_page +1)
        
    groups = groups_plus_one[:per_page]

    if len(groups_plus_one) == per_page + 1:
        page_next = True
    else:
        page_next = False

    return render_to_response('sys_group_admin.html', {
            'groups': groups,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
            }, context_instance=RequestContext(request))

def sys_org_admin(request):
    if not request.user.is_staff:
        raise Http404

    try:
        orgs = ccnet_threaded_rpc.get_all_orgs(0, sys.maxint)
    except:
        orgs = []

    return render_to_response('sys_org_admin.html', {
            'orgs': orgs,
            }, context_instance=RequestContext(request))
    
def org_group_admin(request):
    if not request.user.is_staff and not request.user.org.is_staff:
        raise Http404

    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page= int(request.GET.get('per_page', '25'))
    except ValueError:
        current_page = 1
        per_page = 25

    groups_plus_one = ccnet_threaded_rpc.get_org_groups (request.user.org.org_id,
                                                per_page * (current_page -1),
                                                per_page +1)
        
    groups = groups_plus_one[:per_page]

    if len(groups_plus_one) == per_page + 1:
        page_next = True
    else:
        page_next = False

    return render_to_response('org_group_admin.html', {
            'groups': groups,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
            }, context_instance=RequestContext(request))

def org_remove(request, org_id):
    if not request.user.is_staff:
        raise Http404

    try:
        org_id_int = int(org_id)
    except ValueError:
        return HttpResponseRedirect(reverse('sys_org_admin'))

    # Remove repos in that org
    seafserv_threaded_rpc.remove_org_repo_by_org_id(org_id_int)
    
    # TODO: Remove repos in org's groups
    
    ccnet_threaded_rpc.remove_org(org_id_int)
    
    return HttpResponseRedirect(reverse('sys_org_admin'))

@login_required
def org_info(request):
    if not request.user.org:
        raise Http404

    org = request.user.org
    
    org_members = ccnet_threaded_rpc.get_org_emailusers(org.url_prefix, 0, sys.maxint)
    for member in org_members:
        member.short_username = member.email.split('@')[0]

    groups = ccnet_threaded_rpc.get_org_groups(org.org_id, 0, sys.maxint)
    
    return render_to_response('org_info.html', {
            'org': org,
            'org_users': org_members,
            'groups': groups,
            }, context_instance=RequestContext(request))

@login_required    
def file_upload_progress(request):
    """
    Return JSON object with information about the progress of an upload.
    """
    progress_id = None
    if 'X-Progress-ID' in request.GET:
        progress_id = request.GET['X-Progress-ID']
    elif 'X-Progress-ID' in request.META:
        progress_id = request.META['X-Progress-ID']

    if progress_id:
        cache_key = "%s_%s" % (request.user.username, progress_id)
        data = cache.get(cache_key)
        return HttpResponse(json.dumps(data))
    else:
        return HttpResponseServerError('Server Error: You must provide X-Progress-ID header or query param.')

@login_required
def file_upload_progress_page(request):
    '''
    As iframe in repo_upload_file.html, for solving problem in chrome.

    '''
    uuid = request.GET.get('uuid', '')

    return render_to_response('file_upload_progress_page.html', {
        'uuid': uuid,
            }, context_instance=RequestContext(request))

@login_required        
def repo_new_dir(request):        
    repo_id         = request.POST.get("repo_id")
    parent_dir      = request.POST.get("parent_dir")
    new_dir_name    = request.POST.get("new_dir_name")
    user            = request.user.username

    if not new_dir_name:
        error_msg = u"请输入新目录名"
        return go_error(request, error_msg)

    if not (repo_id and parent_dir and user):
        return go_error(request)

    if len(new_dir_name) > settings.MAX_UPLOAD_FILE_NAME_LEN:
        error_msg = u"您输入的目录名称过长"
        return go_error (request, error_msg)

    try:
        if not seafserv_threaded_rpc.is_valid_filename(repo_id, new_dir_name):
            error_msg = (u"您输入的目录名称 %s 包含非法字符" % new_dir_name)
            return go_error (request, error_msg)
    except SearpcError,e:
            return go_error (request, e.msg)

    new_dir_name = check_filename_with_rename(repo_id, parent_dir, new_dir_name)

    try:
        seafserv_threaded_rpc.post_dir(repo_id, parent_dir, new_dir_name, user)
    except Exception, e:
        return go_error(request, str(e))
        
    url = reverse('repo', args=[repo_id]) + ('?p=%s' % parent_dir)
    return HttpResponseRedirect(url)

@login_required    
def repo_rename_file(request):
    repo_id         = request.POST.get("repo_id")
    parent_dir      = request.POST.get("parent_dir")
    oldname         = request.POST.get("oldname")
    newname         = request.POST.get("newname")
    user            = request.user.username

    if not newname:
        error_msg = u"新文件名不能为空"
        return go_error(request, error_msg)

    if len(newname) > settings.MAX_UPLOAD_FILE_NAME_LEN:
        error_msg = u"新文件名太长"
        return go_error(request, error_msg)

    if not (repo_id and parent_dir and oldname):
        return go_error(request)

    try:
        seafserv_threaded_rpc.rename_file (repo_id, parent_dir,
                                           oldname, newname, user)
    except Exception, e:
        return go_error(request, str(e))

    url = reverse('repo', args=[repo_id]) + ('?p=%s' % parent_dir)
    return HttpResponseRedirect(url)

@login_required    
def validate_filename(request):
    repo_id     = request.GET.get('repo_id')
    filename    = request.GET.get('filename')

    if not (repo_id and filename):
        return go_error(request)

    result = {'ret':'yes'}

    try:
        ret = seafserv_threaded_rpc.is_valid_filename (repo_id, filename);
    except SearpcError:
        result['ret'] = 'error'
    else:
        result['ret'] = 'yes' if ret == 1 else 'no'

    content_type = 'application/json; charset=utf-8'
    return HttpResponse(json.dumps(result), content_type=content_type)

@login_required    
def repo_create(request):
    '''
    Handle ajax post.
    
    '''
    if request.method == 'POST':
        repo_name  = request.POST.get("repo_name")
        repo_desc  = request.POST.get("repo_desc")
        encrypted  = request.POST.get("encryption")
        passwd     = request.POST.get("passwd")
        passwd_again    = request.POST.get("passwd_again")

        result = {}
        content_type = 'application/json; charset=utf-8'

        error_msg = ""
        if not repo_name:
            error_msg = u"目录名不能为空"
        elif len(repo_name) > 50:
            error_msg = u"目录名太长"
        elif not seafserv_threaded_rpc.is_valid_filename('', repo_name):
            error_msg = (u"您输入的目录名 %s 包含非法字符" % repo_name)
        elif not repo_desc:
            error_msg = u"描述不能为空"
        elif len(repo_desc) > 100:
            error_msg = u"描述太长"
        elif encrypted == 'on':
            if not passwd:
                error_msg = u"密码不能为空"
            elif not passwd_again:
                error_msg = u"确认密码不能为空"
            elif len(passwd) < 3:
                error_msg = u"密码太短"
            elif len(passwd) > 15:
                error_msg = u"密码太长"
            elif passwd != passwd_again:
                error_msg = u"两次输入的密码不相同"

        if error_msg:
            result['error'] = error_msg
            return HttpResponse(json.dumps(result), content_type=content_type)

        try:
            repo_id = seafserv_threaded_rpc.create_repo(repo_name, repo_desc, request.user.username, passwd)
            result['success'] = True

        except:
            result['error'] = u"创建目录失败"

        else:
            if not repo_id:
                result['error'] = u"创建目录失败"

        return HttpResponse(json.dumps(result), content_type=content_type)

def render_file_revisions (request, repo_id):
    """List all history versions of a file."""
    target_file = request.GET.get('p')
    if not target_file:
        return go_error(request)

    repo = get_repo(repo_id)
    if not repo:
        error_msg = u"同步目录不存在"
        return go_error(request, error_msg)

    try:
        commits = seafserv_threaded_rpc.list_file_revisions(repo_id, target_file)
    except SearpcError, e:
        return go_error(request, e.msg)

    if not commits:
        return go_error(request)
        
    # Check whether use is repo owner
    if validate_owner(request, repo_id):
        is_owner = True
    else:
        is_owner = False

    try:
        current_commit = get_commits(repo_id, 0, 1)[0]
        current_file_id = get_file_revision_id_size (current_commit.id, target_file)[0]
        for commit in commits:
            file_id, file_size = get_file_revision_id_size (commit.id, target_file)
            if not file_id or not file_size:
                return go_error(request)
            commit.revision_file_size = file_size
            if file_id == current_file_id:
                commit.is_current_version = True
            else:
                commit.is_current_version = False
    except Exception, e:
        return go_error(request, str(e))

    return render_to_response('file_revisions.html', {
        'repo': repo,
        'path': target_file,
        'commits': commits,
        'is_owner': is_owner,
        }, context_instance=RequestContext(request))

@login_required        
def file_revisions(request, repo_id):
    if request.method != 'GET':
        return go_error(request)

    op = request.GET.get('op')
    if not op:
        return render_file_revisions(request, repo_id)
    elif op != 'revert' and op != 'download' and op != 'view':
        return go_error(request)

    commit_id   = request.GET.get('commit')
    path        = request.GET.get('p')

    if not (commit_id and path):
        return go_error(request)

    if op == 'revert':
        try:
            seafserv_threaded_rpc.revert_file (repo_id, commit_id,
                                               path, request.user.username)
        except Exception, e:
            return go_error(request, str(e))
        else:
            parent_dir = os.path.dirname(path)
            url = reverse('repo', args=[repo_id]) + ('?p=%s' % parent_dir)
            return HttpResponseRedirect(url)

    elif op == 'download':
        def handle_download():
            parent_dir = os.path.dirname(path)
            file_name  = os.path.basename(path)
            seafdir = seafserv_threaded_rpc.list_dir_by_path (commit_id, \
                                        parent_dir.encode('utf-8'))
            if not seafdir:
                return go_error(request)

            # for ...  else ...
            for dirent in seafdir:
                if dirent.obj_name == file_name:
                    break
            else:
                return go_error(request)

            url = reverse('repo_access_file', args=[repo_id, dirent.obj_id])
            url += '?file_name=%s&op=download' % file_name
            return HttpResponseRedirect(url)

        try:
            return handle_download()
        except Exception, e:
            return go_error(request, str(e))
    elif op == 'view':
        seafile_id = get_file_revision_id_size (commit_id, path)[0]
        if not seafile_id:
            return go_error(request)
        file_name = os.path.basename(path)
        url = reverse(repo_view_file, args=[repo_id, seafile_id])
        url += u'?commit_id=%s&file_name=%s&p=%s' \
               % (commit_id, file_name, path)
        return HttpResponseRedirect(url)

@login_required
def get_shared_link(request):
    """
    Handle ajax request to generate file shared link.
    """
    if not request.is_ajax():
        raise Http404
    
    content_type = 'application/json; charset=utf-8'
    
    repo_id = request.GET.get('repo_id')
    obj_id = request.GET.get('obj_id')
    path = request.GET.get('p', '/')
    if path[-1] == '/':
        path = path[:-1]

    l = FileShare.objects.filter(repo_id=repo_id).filter(\
        username=request.user.username).filter(path=path)
    if len(l) > 0:
        fileshare = l[0]
        token = fileshare.token
    else:
        token = gen_token(max_length=10)
        
        fs = FileShare()
        fs.username = request.user.username
        fs.repo_id = repo_id
        fs.path = path
        fs.token = token

        try:
            fs.save()
        except IntegrityError, e:
            err = '获取分享链接失败，请重新获取'
            data = json.dumps([{'error': err}])
            return HttpResponse(data, status=500, content_type=content_type)
    
    data = json.dumps([{'token': token}])
    return HttpResponse(data, status=200, content_type=content_type)

def view_shared_file(request, token):
    """
    Preview file via shared link.
    """
    assert token is not None    # Checked by URLconf

    try:
        fileshare = FileShare.objects.get(token=token)
    except FileShare.DoesNotExist:
        raise Http404

    username = fileshare.username
    repo_id = fileshare.repo_id
    path = fileshare.path

    http_server_root = get_httpserver_root()
    if path[-1] == '/':
        path = path[:-1]
    filename = os.path.basename(path)
    quote_filename = urllib2.quote(filename.encode('utf-8'))

    try:
        obj_id = seafserv_threaded_rpc.get_file_by_path(repo_id, path)
    except:
        obj_id = None

    if not obj_id:
        return go_error(request, '文件不存在')
    
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    access_token = gen_token()
    seafserv_rpc.web_save_access_token(access_token, obj_id)
    
    can_preview, filetype = valid_previewed_file(filename)
    
    # Raw path
    tmp_str = '%s/access?repo_id=%s&id=%s&filename=%s&op=%s&t=%s&u=%s'
    raw_path = tmp_str % (http_server_root,
                          repo_id, obj_id,
                          quote_filename, 'view', 
                          access_token,
                          username)

    # Increase file shared link view_cnt, this operation should be atomic
    fileshare = FileShare.objects.get(token=token)
    fileshare.view_cnt = F('view_cnt') + 1
    fileshare.save()
    
    return render_to_response('view_shared_file.html', {
            'repo': repo,
            'obj_id': obj_id,
            'path': path,
            'file_name': filename,
            'shared_token': token,
            'access_token': access_token,
            'can_preview': can_preview,
            'filetype': filetype,
            'raw_path': raw_path,
            'username': username,
            }, context_instance=RequestContext(request))

@login_required
def remove_shared_link(request):
    """
    Handle request to remove file shared link.
    """
    token = request.GET.get('t', '')
    
    if not request.is_ajax():
        FileShare.objects.filter(token=token).delete()
        return HttpResponseRedirect(reverse('share_admin'))

    content_type = 'application/json; charset=utf-8'
    
    FileShare.objects.filter(token=token).delete()

    msg = '删除成功'
    data = json.dumps([{'msg': msg}])
    return HttpResponse(data, status=200, content_type=content_type)
    
@login_required
def send_shared_link(request):
    """
    Handle ajax post request to share file shared link.
    """
    if not request.is_ajax() and not request.method == 'POST':
        raise Http404

    content_type = 'application/json; charset=utf-8'
    
    form = FileLinkShareForm(request.POST)
    if not form.is_valid():
        err = '发送失败'
        data = json.dumps([{'error':err}])
        return HttpResponse(data, status=400, content_type=content_type)

    email = form.cleaned_data['email']
    file_shared_link = form.cleaned_data['file_shared_link']

    # Handle the diffent separator
    to_email_str = email.replace(';',',')
    to_email_str = to_email_str.replace('\n',',')
    to_email_str = to_email_str.replace('\r',',')
    to_email_list = to_email_str.split(',')

    t = loader.get_template('shared_link_email.html')

    for to_email in to_email_list:
        to_email = to_email.strip(' ')
        if not to_email:
            continue

        c = {
            'email': request.user.username,
            'to_email': to_email,
            'file_shared_link': file_shared_link,
            }
        
        try:
            send_mail('您的好友通过SeaCloud分享了一个文件给您',
                      t.render(Context(c)), None, [to_email],
                      fail_silently=False)
        except:
            err = '发送失败'
            data = json.dumps([{'error':err}])
            return HttpResponse(data, status=500, content_type=content_type)
            
    msg = '发送成功。'
    data = json.dumps([{'msg': msg}])
    return HttpResponse(data, status=200, content_type=content_type)
