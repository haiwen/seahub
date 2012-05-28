# encoding: utf-8
import settings
import stat
from urllib import quote
from django.core.urlresolvers import reverse
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect, Http404
from django.shortcuts import render_to_response, redirect
from django.template import RequestContext
from django.views.decorators.csrf import csrf_protect

from auth.decorators import login_required
from auth.forms import AuthenticationForm, PasswordResetForm, SetPasswordForm, \
    PasswordChangeForm
from auth.tokens import default_token_generator
from seaserv import ccnet_rpc, get_groups, get_users, get_repos, \
    get_repo, get_commits, get_branches, \
    seafserv_threaded_rpc, seafserv_rpc, get_binding_peerids, get_ccnetuser, \
    get_group_repoids
from pysearpc import SearpcError

from seahub.base.accounts import CcnetUser
from seahub.contacts.models import Contact
from seahub.share.forms import GroupAddRepoForm
from seahub.share.models import GroupShare, UserShare
from forms import AddUserForm
from utils import go_permission_error, go_error, list_to_string, \
    get_httpserver_root, get_ccnetapplet_root, gen_token
    
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
    # check whether email in the request own the repo
    return seafserv_threaded_rpc.is_repo_owner(request.user.username, repo_id)

def check_shared_repo(request, repo_id):
    """
    check whether user has been shared this repo or
    the repo share to the groups user join
    
    """
    repos = seafserv_threaded_rpc.list_share_repos(request.user.username, 'to_email', -1, -1)
    for repo in repos:
        if repo.props.id == repo_id:
            return True

    groups = ccnet_rpc.get_groups(request.user.username)
    # for every group that user joined...    
    for group in groups:
        # ...get repo ids in that group, and check whether repo ids contains that repo id 
        repo_ids = get_group_repoids(group.props.id)
        if repo_ids.__contains__(repo_id):
            return True

    return False

def validate_emailuser(emailuser):
    """
    check whether emailuser is in the database

    """
    try:
        user = ccnet_rpc.get_emailuser(emailuser)
    except:
        user = None
        
    if user:
        return True
    else:
        return False

def access_to_repo(request, repo_id, repo_ap):
    """
    Check whether user in the request can access to repo, which means user can
    view directory entries on repo page, and repo_history_dir page.

    """
    # if repo is 'own' and user is not staff and is not owner
    # and not shared this repo, then goto 404 page..
    if repo_ap == 'own' and not validate_owner(request, repo_id) \
            and not check_shared_repo(request, repo_id) and not request.user.is_staff:
        return False
    else:
        return True

def gen_path_link(path, repo_name):
    """
    Generate navigate paths and links in repo page and repo_history_dir page.
    Note: `path` must be end with '/'.
    
    """
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
    repo_ap = seafserv_threaded_rpc.repo_query_access_property(repo_id)
    if repo_ap == None:
        repo_ap = 'own'
        
    if not access_to_repo(request, repo_id, repo_ap):
        raise Http404

    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    latest_commit = get_commits(repo_id, 0, 1)[0]

    is_owner = False
    if request.user.is_authenticated():
        if validate_owner(request, repo_id):
            is_owner = True

    password_set = False
    if repo.props.encrypted:
        try:
            ret = seafserv_rpc.is_passwd_set(repo_id, request.user.username)
            if ret == 1:
                password_set = True
        except SearpcError, e:
            return go_error(request, e.msg)

    repo_size = seafserv_threaded_rpc.server_repo_size(repo_id)

    dirs = []
    path = ''
    zipped = []
    dir_list = []
    file_list = []
    if not repo.props.encrypted or password_set:
        path = request.GET.get('p', '/')
        if path[-1] != '/':
            path = path + '/'

        try:
            dirs = seafserv_rpc.list_dir_by_path(latest_commit.id,
                                                 path.encode('utf-8'))
        except SearpcError, e:
            return go_error(request, e.msg)
        for dirent in dirs:
            if stat.S_ISDIR(dirent.props.mode):
                dir_list.append(dirent)
            else:
                file_list.append(dirent)
                try:
                    dirent.file_size = seafserv_rpc.get_file_size(dirent.obj_id)
                except:
                    dirent.file_size = 0
        dir_list.sort(lambda x, y : cmp(x.obj_name.lower(), y.obj_name.lower()))
        file_list.sort(lambda x, y : cmp(x.obj_name.lower(), y.obj_name.lower()))

        # generate path and link
        zipped = gen_path_link(path, repo.name)
        
    # used to determin whether show repo content in repo.html
    # if a repo is shared to me, or repo shared to the group I joined,
    # then I can view repo content on the web
    if check_shared_repo(request, repo_id):
        share_to_me = True
    else:
        share_to_me = False

    return render_to_response('repo.html', {
            "repo": repo,
            "latest_commit": latest_commit,
            "is_owner": is_owner,
            "password_set": password_set,
            "repo_ap": repo_ap,
            "repo_size": repo_size,
            "dir_list": dir_list,
            "file_list": file_list,
            "share_to_me": share_to_me,
            "path" : path,
            "zipped" : zipped,
            "error" : error,
            }, context_instance=RequestContext(request))

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

def repo_history(request, repo_id):
    # TODO: check permission
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
        return HttpResponseRedirect('/repo/%s/' % repo_id)

    try:
        current_page = int(request.GET.get('page', '1'))
        per_page= int(request.GET.get('per_page', '25'))
    except ValueError:
        current_page = 1
        per_page = 25

    commits_all = get_commits(repo_id, per_page * (current_page -1), per_page + 1)
    commits = commits_all[:per_page]

    if len(commits_all) == per_page + 1:
        page_next = True
    else:
        page_next = False


    return render_to_response('repo_history.html', {
            "repo": repo,
            "commits": commits,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
            }, context_instance=RequestContext(request))

def repo_history_dir(request, repo_id):
    # get repo web access property, if no repo access property in db, then
    # assume repo ap is 'own'
    repo_ap = seafserv_threaded_rpc.repo_query_access_property(repo_id)
    if repo_ap == None:
        repo_ap = 'own'
        
    if not access_to_repo(request, repo_id, repo_ap):
        raise Http404

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
        return HttpResponseRedirect('/repo/%s/' % repo_id)

    current_commit = None
    commit_id = request.GET.get('commit_id', None)
    if commit_id:
        current_commit = seafserv_rpc.get_commit(commit_id)
    if not current_commit:
        raise Http404

    is_owner = False
    if request.user.is_authenticated():
        if validate_owner(request, repo_id):
            is_owner = True

    dirs = []
    path = ''
    zipped = []
    dir_list = []
    file_list = []
    if not repo.props.encrypted:
        path = request.GET.get('p', '/')
        if path[-1] != '/':
            path = path + '/'
        try:
            dirs = seafserv_rpc.list_dir_by_path(current_commit.id,
                                                 path.encode('utf-8'))
        except SearpcError, e:
            return go_error(request, e.msg)
        for dirent in dirs:
            if stat.S_ISDIR(dirent.props.mode):
                dir_list.append(dirent)
            else:
                file_list.append(dirent)
                try:
                    dirent.file_size = seafserv_rpc.get_file_size(dirent.obj_id)
                except:
                    dirent.file_size = 0
        dir_list.sort(lambda x, y : cmp(x.obj_name.lower(), y.obj_name.lower()))
        file_list.sort(lambda x, y : cmp(x.obj_name.lower(), y.obj_name.lower()))

        # generate path and link
        zipped = gen_path_link(path, repo.name)

    # used to determin whether show repo content in repo.html
    # if a repo is shared to me, or repo shared to the group I joined,
    # then I can view repo content on the web
    if check_shared_repo(request, repo_id):
        share_to_me = True
    else:
        share_to_me = False

    return render_to_response('repo_history_dir.html', {
            "repo": repo,
            "current_commit": current_commit,
            "is_owner": is_owner,
            "repo_ap": repo_ap,
            "dir_list": dir_list,
            "file_list": file_list,
            "share_to_me": share_to_me,
            "path" : path,
            "zipped" : zipped,
            }, context_instance=RequestContext(request))

def repo_history_revert(request, repo_id):
    repo_ap = seafserv_threaded_rpc.repo_query_access_property(repo_id)
    if repo_ap == None:
        repo_ap = 'own'
        
    if not access_to_repo(request, repo_id, repo_ap):
        raise Http404

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
        return HttpResponseRedirect('/repo/%s/' % repo_id)

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
    
@login_required
def modify_token(request, repo_id):
    if not validate_owner(request, repo_id):
        return HttpResponseRedirect(reverse(repo, args=[repo_id]))

    token = request.POST.get('token', '')
    if token:
        seafserv_threaded_rpc.set_repo_token(repo_id, token)

    return HttpResponseRedirect(reverse(repo, args=[repo_id]))

@login_required
def remove_repo(request, repo_id):
    if not validate_owner(request, repo_id) and not request.user.is_staff:
        return go_permission_error(request, u'权限不足：无法查看该用户信息')
    
    seafserv_threaded_rpc.remove_repo(repo_id)
    return HttpResponseRedirect(request.META['HTTP_REFERER'])
    
@login_required
def remove_fetched_repo(request, user_id, repo_id):
    if user_id and repo_id:
        seafserv_threaded_rpc.remove_fetched_repo (user_id, repo_id)
        
    return HttpResponseRedirect(request.META['HTTP_REFERER'])

@login_required
def myhome(request):
    owned_repos = []
    quota_usage = 0
    output_msg = {}

    email = request.user.username
    quota_usage = seafserv_threaded_rpc.get_user_quota_usage(email)
    owned_repos = seafserv_threaded_rpc.list_owned_repos(email)
    
    # Repos that are share to me
    in_repos = seafserv_threaded_rpc.list_share_repos(request.user.username, 'to_email', -1, -1)

    # handle share repo request
    if request.method == 'POST':
        output_msg = repo_add_share(request)

    # my contacts
    contacts = Contact.objects.filter(user_email=email)
    
    # my groups
    groups = ccnet_rpc.get_groups(email)
    groups_manage = []
    groups_join = []
    for group in groups:
        if group.props.creator_name == request.user.username:
            groups_manage.append(group)
        else:
            groups_join.append(group)
    
    return render_to_response('myhome.html', {
            "owned_repos": owned_repos,
            "quota_usage": quota_usage,
            "in_repos": in_repos,
            "output_msg": output_msg,
            "contacts": contacts,
            "groups": groups,
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
    if repo_id:
        ap = request.GET.get('ap', '')
        seafserv_threaded_rpc.repo_set_access_property(repo_id, ap)

    return HttpResponseRedirect(request.META['HTTP_REFERER'])

def repo_access_file(request, repo_id, obj_id):
    if repo_id:
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
            return HttpResponseRedirect('/repo/%s/' % repo_id)

        # if a repo doesn't have access property in db, then assume it's 'own'
        repo_ap = seafserv_threaded_rpc.repo_query_access_property(repo_id)
        if not repo_ap:
            repo_ap = 'own'

        # if a repo is shared to me, then I can view and download file no mater whether
        # repo's access property is 'own' or 'public'
        if check_shared_repo(request, repo_id):
            share_to_me = True
        else:
            share_to_me = False
            
        token = ''        
        if repo_ap == 'own':
            # people who is owner or this repo is shared to him, can visit the repo;
            # others, just go to 404 page           
            if validate_owner(request, repo_id) or share_to_me:
                # owner should get a token to visit repo                
                token = gen_token()
                # put token into memory in seaf-server
                seafserv_rpc.web_save_access_token(token, obj_id)
            else:
                raise Http404

        http_server_root = get_httpserver_root()
        file_name = request.GET.get('file_name', '')
        op = request.GET.get('op', 'view')

        redirect_url = '%s/%s?id=%s&filename=%s&op=%s&t=%s&u=%s' % (http_server_root,
                                                                    repo_id, obj_id,
                                                                    file_name, op, 
                                                                    token,
                                                                    request.user.username)
        return HttpResponseRedirect(redirect_url)
    
@login_required
def repo_add_share(request):
    output_msg = {}
    
    if request.method == 'POST':
        from_email = request.user.username
        repo_id = request.POST.get('share_repo_id', '')
        
        # Handle the diffent separator
        to_email_str = request.POST.get('to_email', '').replace(';',',')
        to_email_str = to_email_str.replace('\n',',')
        to_email_str = to_email_str.replace('\r',',')

        to_email_list = to_email_str.split(',')
        info_emails = []
        err_emails = []
        for to_email in to_email_list:
            to_email = to_email.strip(' ')
            if not to_email:
                continue

            # if to_email is user name, the format is: 'example@mail.com';
            # if to_email is group, the format is 'group_name <creator@mail.com>'
            if (to_email.split(' ')[0].find('@') == -1):
                group_name = to_email.split(' ')[0]
                group_creator = to_email.split(' ')[1]
                if validate_owner(request, repo_id):
                    # get all the groups the user joined
                    groups = ccnet_rpc.get_groups(request.user.username)
                    find = False
                    for group in groups:
                        # for every group that user joined, if group name and
                        # group creator matchs, then has find the group
                        if group.props.group_name == group_name and \
                                group_creator.find(group.props.creator_name) >= 0:
                            from seahub.group.views import group_share_repo
                            group_share_repo(request, repo_id, int(group.props.id), from_email)
                            find = True
                            info_emails.append(group_name)

                    if not find:
                        err_emails.append(group_name)
                else:
                    err_emails.append(group_name)
            else:
                if validate_emailuser(to_email) and validate_owner(request, repo_id):
                    try:
                        seafserv_threaded_rpc.add_share(repo_id, from_email, to_email, 'rw')
                        info_emails.append(to_email)
                    except SearpcError, e:
                        err_emails.append(to_email)
                else:
                    err_emails.append(to_email)

        if info_emails:
            output_msg['info_msg'] = u'共享给%s成功，' % list_to_string(info_emails)
        if err_emails:
            output_msg['err_msg'] = u'共享给%s失败' % list_to_string(err_emails)

    return output_msg

@login_required
def repo_list_share(request):
    username = request.user.username

    # repos that are share to user
    out_repos = seafserv_threaded_rpc.list_share_repos(username, 'from_email', -1, -1)

    # repos that are share to groups
    group_repos = seafserv_threaded_rpc.get_group_my_share_repos(request.user.username)
    for group_repo in group_repos:
        repo_id = group_repo.props.repo_id
        if not repo_id:
            continue
        repo = get_repo(repo_id)
        if not repo:
            continue
        group_id = group_repo.props.group_id
        group = ccnet_rpc.get_group(int(group_id))
        if not group:
            continue
        repo.props.shared_email = group.props.group_name
        repo.gid = group_id
        
        out_repos.append(repo)

    return render_to_response('share_repos.html', {
            "out_repos": out_repos,
            }, context_instance=RequestContext(request))

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

def seafile_access_check(request):
    repo_id = request.GET.get('repo_id', '')

    return render_to_response(
        'seafile_access_check.html', {
            'repo_id': repo_id,
        },
        context_instance=RequestContext(request))

@login_required
def repo_remove_share(request):
    repo_id = request.GET.get('repo_id', '')
    group_id = request.GET.get('gid')
    from_email = request.user.username
    
    # if request params don't have 'gid', then remove repos that share to
    # to other person; else, remove repos that share to groups
    if not group_id:
        to_email = request.GET.get('to_email', '')
        seafserv_threaded_rpc.remove_share(repo_id, from_email, to_email)
    else:
        try:
            group_id_int = int(group_id)
        except:
            return go_error(request, u'group id 不是有效参数')
        
        from seahub.group.views import group_unshare_repo
        group_unshare_repo(request, repo_id, group_id_int, from_email)
        
    return HttpResponseRedirect(request.META['HTTP_REFERER'])        
    
@login_required
def mypeers(request):
    cid = get_user_cid(request.user)

@login_required
def seafadmin(request):
    if not request.user.is_staff:
        raise Http404

    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page= int(request.GET.get('per_page', '25'))
    except ValueError:
        current_page = 1
        per_page = 25

    repos_all = seafserv_threaded_rpc.get_repo_list(per_page * (current_page -1), per_page + 1)
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
        'repos.html', {
            'repos': repos,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
        },
        context_instance=RequestContext(request))

@login_required
def useradmin(request):
    if not request.user.is_staff:
        raise Http404

    users = ccnet_rpc.get_emailusers(-1,-1)
    for user in users:
        if user.props.id == request.user.id:
            user.is_self = True
            
    return render_to_response(
        'useradmin.html', {
            'users': users,
        },
        context_instance=RequestContext(request))

@login_required
def user_info(request, email):
    if request.user.username == email:
        return HttpResponseRedirect(reverse(myhome))
    
    if not request.user.is_staff:
        return go_permission_error(request, u'权限不足：无法查看该用户信息')

    user_dict = {}
    owned_repos = []
    quota_usage = 0

    owned_repos = seafserv_threaded_rpc.list_owned_repos(email)
    quota_usage = seafserv_threaded_rpc.get_user_quota_usage(email)

    try:
        peers = ccnet_rpc.get_peers_by_email(email)
        for peer in peers:
            if not peer:
                continue
            peername = peer.props.name
            roles = peer.props.role_list
            user_dict[peername] = roles
    except:
        pass

    # Repos that are share to user
    in_repos = seafserv_threaded_rpc.list_share_repos(email, 'to_email', -1, -1)

    return render_to_response(
        'userinfo.html', {
            'owned_repos': owned_repos,
            'quota_usage': quota_usage,
            "in_repos": in_repos,
            'user_dict': user_dict,
            'email': email
            },
        context_instance=RequestContext(request))

@login_required
def role_add(request, user_id):
    if not request.user.is_staff:
        raise Http404

    if request.method == 'POST':
        role = request.POST.get('role', '')
        if role and len(role) <= 16:
            ccnet_rpc.add_role(user_id, role)

    return HttpResponseRedirect(request.META['HTTP_REFERER'])


@login_required
def role_remove(request, user_id):
    if not request.user.is_staff:
        raise Http404

    role = request.REQUEST.get('role', '')
    if role and len(role) <= 16:
        ccnet_rpc.remove_role(user_id, role)

    return HttpResponseRedirect(request.META['HTTP_REFERER'])

@login_required
def user_remove(request, user_id):
    """The user id is emailuser id."""
    
    if not request.user.is_staff:
        raise Http404

    ccnetuser = get_ccnetuser(userid=int(user_id))
    ccnetuser.delete()
    
    return HttpResponseRedirect(request.META['HTTP_REFERER'])

@login_required
def activate_user(request, user_id):
    """The user id is emailuser id."""

    if not request.user.is_staff:
        raise Http404

    ccnetuser = get_ccnetuser(userid=int(user_id))
    ccnetuser.is_active = True
    ccnetuser.save()
    
    return HttpResponseRedirect(request.META['HTTP_REFERER'])

@login_required
def user_add(request):
    """Add a user"""

    if not request.user.is_staff:
        raise Http404

    if request.method == 'POST':
        form = AddUserForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data['email']
            password = form.cleaned_data['password1']

            ccnetuser = CcnetUser(username=email, raw_password=password)
            ccnetuser.is_active = True
            ccnetuser.save()
            
            return HttpResponseRedirect(reverse('useradmin', args=[]))
    else:
        form = AddUserForm()
    
    return render_to_response("add_user_form.html",  {
            'form': form, 
            }, context_instance=RequestContext(request))

def back_local(request):
    ccnet_applt_root = get_ccnetapplet_root()

    redirect_url = '%s/home/' % ccnet_applt_root

    return HttpResponseRedirect(redirect_url)

