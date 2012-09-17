# encoding: utf-8
import settings
import os
import stat
import simplejson as json
import re
import tempfile
import sys
import urllib
import urllib2
from urllib import quote
from django.core.cache import cache
from django.core.urlresolvers import reverse
from django.core.mail import send_mail
from django.contrib import messages
from django.contrib.sites.models import Site, RequestSite
from django.db import IntegrityError
from django.db.models import F
from django.http import HttpResponse, HttpResponseBadRequest, Http404, \
    HttpResponseRedirect
from django.shortcuts import render_to_response, redirect
from django.template import Context, loader, RequestContext
from django.template.loader import render_to_string
from django.utils.hashcompat import md5_constructor
from django.views.decorators.csrf import csrf_protect
from django.views.generic.base import TemplateView, TemplateResponseMixin
from django.views.generic.edit import BaseFormView, FormMixin

from auth.decorators import login_required
from auth.forms import AuthenticationForm, PasswordResetForm, SetPasswordForm, \
    PasswordChangeForm
from auth.tokens import default_token_generator
from share.models import FileShare
from seaserv import ccnet_rpc, ccnet_threaded_rpc, get_repos, get_emailusers, \
    get_repo, get_commits, get_branches, is_valid_filename, remove_group_user,\
    seafserv_threaded_rpc, seafserv_rpc, get_binding_peerids, is_inner_pub_repo, \
    check_group_staff, get_personal_groups, is_repo_owner, del_org_group_repo,\
    get_group, get_shared_groups_by_repo, is_group_user, check_permission, \
    list_personal_shared_repos, is_org_group, get_org_id_by_group, is_org_repo,\
    list_inner_pub_repos, get_org_groups_by_repo, is_org_repo_owner, \
    get_org_repo_owner, is_passwd_set, get_file_size
from pysearpc import SearpcError

from base.accounts import User
from base.decorators import sys_staff_required, ctx_switch_required
from base.mixins import LoginRequiredMixin, CtxSwitchRequiredMixin
from base.models import UuidObjidMap, FileComment, InnerPubMsg, InnerPubMsgReply
from contacts.models import Contact
from contacts.signals import mail_sended
from group.forms import MessageForm, MessageReplyForm
from group.models import GroupMessage, MessageAttachment
from group.signals import grpmsg_added
from notifications.models import UserNotification
from profile.models import Profile
from forms import AddUserForm, FileLinkShareForm, RepoCreateForm, \
    RepoNewDirForm, RepoNewFileForm, FileCommentForm, RepoRenameFileForm, \
    RepoPassowrdForm
from utils import render_permission_error, render_error, list_to_string, \
    get_httpserver_root, get_ccnetapplet_root, gen_token, \
    calculate_repo_last_modify, valid_previewed_file, \
    check_filename_with_rename, get_accessible_repos, EMPTY_SHA1, \
    get_file_revision_id_size, get_ccnet_server_addr_port, \
    gen_file_get_url, string2list, MAX_INT, \
    gen_file_upload_url, check_and_get_org_by_repo, \
    get_file_contributors
try:
    from settings import DOCUMENT_CONVERTOR_ROOT
    if DOCUMENT_CONVERTOR_ROOT[-1:] != '/':
        DOCUMENT_CONVERTOR_ROOT += '/'
except ImportError:
    DOCUMENT_CONVERTOR_ROOT = None
from settings import FILE_PREVIEW_MAX_SIZE, INIT_PASSWD

@login_required
def root(request):
    return HttpResponseRedirect(reverse(myhome))

def validate_owner(request, repo_id):
    """
    Check whether user in the request owns the repo.
    
    """
    ret = is_repo_owner(request.user.username, repo_id)

    return True if ret else False

def is_registered_user(email):
    """
    Check whether user is registerd.

    """
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        user = None

    return True if user else False

def access_to_repo(request, repo_id, repo_ap=None):
    """
    Check whether user in the request can access to repo, which means user can
    view directory entries on repo page. Only repo owner or person who is shared
    can access to repo.
    NOTE: `repo_ap` may be used in future.

    """
    if not request.user.is_authenticated():
        token = request.COOKIES.get('anontoken', None)
        return True if token else False
    else:
        return check_permission(repo_id, request.user.username)

def get_user_permission(request, repo_id):
    if request.user.is_authenticated():
        return 'rw' if check_permission(repo_id, request.user.username) else \
            ''
    else:
        token = request.COOKIES.get('anontoken', None)
        return 'r' if token else ''
        
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

class RepoMixin(object):
    def get_repo_id(self):
        return self.kwargs.get('repo_id', '')

    def get_path(self):
        path = self.request.GET.get('p', '/')
        if path[-1] != '/':
            path = path + '/'
        return path
    
    def get_user(self):
        return self.request.user

    def get_repo(self, repo_id):
        repo = get_repo(repo_id)
        if not repo:
            raise Http404
        return repo

    def get_repo_size(self):
        repo_size = seafserv_threaded_rpc.server_repo_size(self.repo.id)
        return repo_size

    def is_password_set(self):
        if self.repo.encrypted:
            return is_passwd_set(self.repo.id, self.user.username)
        return False

    def get_repo_dirents(self):
        dir_list = []
        file_list = []
        if self.current_commit.root_id == EMPTY_SHA1:
            return ([], [])
        else:
            try:
                dirs = seafserv_threaded_rpc.list_dir_by_path(
                    self.current_commit.id,
                    self.path.encode('utf-8'))
            except SearpcError, e:
                raise Http404
                # return render_error(self.request, e.msg)
            for dirent in dirs:
                if stat.S_ISDIR(dirent.props.mode):
                    dir_list.append(dirent)
                else:
                    file_list.append(dirent)
                    dirent.file_size = get_file_size(dirent.obj_id)

            dir_list.sort(lambda x, y : cmp(x.obj_name.lower(),
                                            y.obj_name.lower()))
            file_list.sort(lambda x, y : cmp(x.obj_name.lower(),
                                             y.obj_name.lower()))
            return (file_list, dir_list)

    def get_nav_path(self):
        zipped = gen_path_link(self.path, self.repo.name)
        return zipped

    def get_applet_root(self):
        return get_ccnetapplet_root()

    def get_current_commit(self):
        # Get newest commit by default, subclasses can override this method.
        current_commit = get_commits(self.repo.id, 0, 1)[0]
        return current_commit

    def get_success_url(self):
        return reverse('repo', args=[self.repo_id])

    def prepare_property(self):
        # NOTE: order is important.
        self.repo_id = self.get_repo_id()
        self.user = self.get_user()
        self.path = self.get_path()
        self.repo = self.get_repo(self.repo_id)
        self.repo_size = self.get_repo_size()        
        # self.can_access = access_to_repo(self.request, self.repo_id)
        self.user_perm = get_user_permission(self.request, self.repo_id)
        self.current_commit = self.get_current_commit()
        self.password_set = self.is_password_set()

        if self.repo.encrypt and not self.password_set:
            # Repo is encrypt and password is not set, then no need to
            # query following informations.
            self.file_list, self.dir_list = [], []
            self.zipped = None
            self.applet_root = None
        else:
            self.file_list, self.dir_list = self.get_repo_dirents()
            self.zipped = self.get_nav_path()
            self.applet_root = self.get_applet_root()
        
    def get(self, request, *args, **kwargs):
        self.prepare_property()
        return super(RepoMixin, self).get(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        self.prepare_property()
        return super(RepoMixin, self).post(request, *args, **kwargs)
        
class RepoView(CtxSwitchRequiredMixin, RepoMixin, TemplateResponseMixin,
               BaseFormView):
    """
    View to show repo page and handle post request to decrypt repo.
    """
    form_class = RepoPassowrdForm

    def get_template_names(self):
        if self.repo.encrypted and not self.password_set:
            template_name = 'decrypt_repo_form.html'
        else:
            template_name = 'repo.html'
        return template_name

    def get_accessible_repos(self):
        if self.user.is_authenticated():
            try:
                accessible_repos = get_accessible_repos(self.request, self.repo)
            except SearpcError, e:
                error_msg = e.msg
                return render_error(self.request, error_msg)
        else:
             accessible_repos = []   
        return accessible_repos
    
    def get_repo_shared_groups(self):
        if self.user.org:
            org_id = self.user.org['org_id']
            repo_shared_groups = get_org_groups_by_repo(org_id, self.repo_id)
        else:
            repo_shared_groups = get_shared_groups_by_repo(self.repo_id)

        # Filter out groups that user is joined.
        groups = [ x for x in repo_shared_groups if \
                       is_group_user(x.id, self.user.username)]
        return groups

    def get_context_data(self, **kwargs):
        kwargs['repo'] = self.repo
        # kwargs['can_access'] = self.can_access
        kwargs['user_perm'] = self.user_perm
        kwargs['current_commit'] = self.get_current_commit()
        kwargs['password_set'] = self.password_set
        kwargs['repo_size'] = self.repo_size
        kwargs['dir_list'] = self.dir_list
        kwargs['file_list'] = self.file_list
        kwargs['path'] = self.path
        kwargs['zipped'] = self.zipped
        kwargs['accessible_repos'] = self.get_accessible_repos()
        kwargs['applet_root'] = self.applet_root
        kwargs['groups'] = self.get_repo_shared_groups()
        return kwargs

class RepoHistoryView(LoginRequiredMixin, CtxSwitchRequiredMixin, RepoMixin,
                      TemplateView):
    """
    View to show repo page in history.
    """
    def get_template_names(self):
        if self.repo.encrypted and not self.password_set:
            template_name = 'decrypt_repo_form.html'
        else:
            template_name = 'repo_history_view.html'            
        return template_name
    
    def get_current_commit(self):
        commit_id = self.request.GET.get('commit_id', '')
        if not commit_id:
            return HttpResponseRedirect(reverse('repo', args=[repo_id]))
        current_commit = seafserv_threaded_rpc.get_commit(commit_id)
        if not current_commit:
            current_commit = get_commits(repo_id, 0, 1)[0]
        return current_commit

    def get_context_data(self, **kwargs):
        kwargs['repo'] = self.repo
        # kwargs['can_access'] = self.can_access
        kwargs['user_perm'] = self.user_perm
        kwargs['current_commit'] = self.get_current_commit()
        kwargs['password_set'] = self.password_set
        kwargs['repo_size'] = self.repo_size
        kwargs['dir_list'] = self.dir_list
        kwargs['file_list'] = self.file_list
        kwargs['path'] = self.path
        kwargs['zipped'] = self.zipped
        return kwargs

@login_required
@ctx_switch_required
def repo_upload_file(request, repo_id):
    repo = get_repo(repo_id)
    
    if request.method == 'GET':
        parent_dir  = request.GET.get('p', '/')
        zipped = gen_path_link (parent_dir, repo.name)

        if access_to_repo(request, repo_id, ''):
            token = seafserv_rpc.web_get_access_token(repo_id,
                                                      'dummy',
                                                      'upload',
                                                      request.user.username)
        else:
            return render_permission_error(request, u'无法访问该目录')

        no_quota = False
        if seafserv_threaded_rpc.check_quota(repo_id) < 0:
            no_quota = True

        upload_url = gen_file_upload_url(token, 'upload')
        httpserver_root = get_httpserver_root()

        return render_to_response ('repo_upload_file.html', {
            "repo": repo,
            "upload_url": upload_url,
            "httpserver_root": httpserver_root,
            "parent_dir": parent_dir,
            "zipped": zipped,
            "max_upload_file_size": settings.MAX_UPLOAD_FILE_SIZE,
            "no_quota": no_quota,
            }, context_instance=RequestContext(request))

@login_required
@ctx_switch_required
def repo_update_file(request, repo_id):
    repo = get_repo(repo_id)

    if request.method == 'GET':
        target_file  = request.GET.get('p')
        if not target_file:
            return render_error(request, u'非法链接')
        zipped = gen_path_link (target_file, repo.name)

        if access_to_repo(request, repo_id, ''):
            token = seafserv_rpc.web_get_access_token(repo_id,
                                                      'dummy',
                                                      'update',
                                                      request.user.username)
        else:
            return render_permission_error(request, u'无法访问该目录')

        no_quota = False
        if seafserv_threaded_rpc.check_quota(repo_id) < 0:
            no_quota = True

        update_url = gen_file_upload_url(token, 'update')
        httpserver_root = get_httpserver_root()

        return render_to_response ('repo_update_file.html', {
            "repo": repo,
            "update_url": update_url,
            "httpserver_root": httpserver_root,
            "target_file": target_file,
            "zipped": zipped,
            "max_upload_file_size": settings.MAX_UPLOAD_FILE_SIZE,
            "no_quota": no_quota,
            }, context_instance=RequestContext(request))

def upload_error_msg (code):
    err_msg = u'服务器内部错误'
    if (code == 0):
        err_msg = u'上传的文件名包含非法字符'
    elif (code == 1):
        err_msg = u'已存在同名的文件'
    elif (code == 2):
        err_msg = u'文件不存在'
    elif (code == 3):
        err_msg = u'文件大小超过限制'
    elif (code == 4):
        err_msg = u'该同步目录所有者的空间已用完，无法上传'
    elif (code == 5):
        err_msg = u'文件传输出错'
    return err_msg

@ctx_switch_required
def upload_file_error(request, repo_id):
    if request.method == 'GET':
        repo = get_repo(repo_id)
        parent_dir = request.GET.get('p')
        filename = request.GET.get('fn')
        err = request.GET.get('err')
        if not parent_dir or not filename or not err:
            return render_error(request, u'非法链接')

        zipped = gen_path_link (parent_dir, repo.name)

        code = int(err)
        err_msg = upload_error_msg(code)

        return render_to_response('upload_file_error.html', {
                'repo': repo,
                'zipped': zipped,
                'filename': filename,
                'err_msg': err_msg,
                }, context_instance=RequestContext(request))

@ctx_switch_required    
def update_file_error(request, repo_id):
    if request.method == 'GET':
        repo = get_repo(repo_id)
        target_file = request.GET.get('p')
        err = request.GET.get('err')
        if not target_file or not err:
            return render_error(request, u'非法链接')

        zipped = gen_path_link (target_file, repo.name)

        code = int(err)
        err_msg = upload_error_msg(code)

        return render_to_response('upload_file_error.html', {
                'repo': repo,
                'zipped': zipped,
                'err_msg': err_msg,
                }, context_instance=RequestContext(request))
    
def get_subdir(request):
    repo_id = request.GET.get('repo_id', '')
    path = request.GET.get('path', '')

    if not (repo_id and path):
        return render_error(request)

    latest_commit = get_commits(repo_id, 0, 1)[0]
    try:
        dirents = seafserv_threaded_rpc.list_dir_by_path(latest_commit.id, path.encode('utf-8'))
    except SearpcError, e:
        return render_error(request, e.msg)

    subdirs = []
    for dirent in dirents:
        if not stat.S_ISDIR(dirent.props.mode):
            continue

        dirent.has_subdir = False
        path_ = os.path.join (path, dirent.obj_name)
        try:
            dirs_ = seafserv_threaded_rpc.list_dir_by_path(latest_commit.id, path_.encode('utf-8'))
        except SearpcError, e:
            return render_error(request, e.msg)

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

@login_required
@ctx_switch_required
def repo_history(request, repo_id):
    """
    View repo history.
    """
    if not access_to_repo(request, repo_id, ''):
        return render_permission_error(request, u'无法浏览该同步目录修改历史')

    repo = get_repo(repo_id)

    password_set = False
    if repo.props.encrypted:
        try:
            ret = seafserv_rpc.is_passwd_set(repo_id, request.user.username)
            if ret == 1:
                password_set = True
        except SearpcError, e:
            return render_error(request, e.msg)

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

    return render_to_response('repo_history.html', {
            "repo": repo,
            "commits": commits,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
            }, context_instance=RequestContext(request))

@login_required
def repo_history_revert(request, repo_id):
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    if not access_to_repo(request, repo_id):
        return render_permission_error(request, u'您没有权限进行还原操作')

    password_set = False
    if repo.props.encrypted:
        try:
            ret = seafserv_rpc.is_passwd_set(repo_id, request.user.username)
            if ret == 1:
                password_set = True
        except SearpcError, e:
            return render_error(request, e.msg)

    if repo.props.encrypted and not password_set:
        return HttpResponseRedirect(reverse('repo', args=[repo_id]))

    commit_id = request.GET.get('commit_id', '')
    if not commit_id:
        return render_error(request, u'请指定历史记录 ID')

    try:
        seafserv_threaded_rpc.revert_on_server(repo_id, commit_id, request.user.username)
    except SearpcError, e:
        if e.msg == 'Bad arguments':
            return render_error(request, u'非法参数')
        elif e.msg == 'No such repo':
            return render_error(request, u'同步目录不存在')
        elif e.msg == "Commit doesn't exist":
            return render_error(request, u'指定的历史记录不存在')
        else:
            return render_error(request, u'未知错误')

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

    if not access_to_repo(request, repo_id, ''):
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
    user = request.user.username
    org, base_template = check_and_get_org_by_repo(repo_id, user)
    if org:
        # Remove repo in org context, only repo owner or org staff can
        # perform this operation.
        if request.user.is_staff or org.is_staff or \
                is_org_repo_owner(org.org_id, repo_id, user):
            seafserv_threaded_rpc.remove_repo(repo_id)
        else:
            err_msg = u'删除同步目录失败, 只有团体管理员或目录创建者有权删除目录。'
            return render_permission_error(request, err_msg)
    else:
        # Remove repo in personal context, only repo owner or site staff can
        # perform this operation.
        if validate_owner(request, repo_id) or request.user.is_staff:
            seafserv_threaded_rpc.remove_repo(repo_id)
        else:
            err_msg = u'删除同步目录失败, 只有管理员或目录创建者有权删除目录。'
            return render_permission_error(request, err_msg)

    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = settings.SITE_ROOT
    return HttpResponseRedirect(next)
    
@login_required
def myhome(request):
    owned_repos = []
    quota_usage = 0

    email = request.user.username
    quota_usage = seafserv_threaded_rpc.get_user_quota_usage(email)

    # Personal repos that I own
    owned_repos = seafserv_threaded_rpc.list_owned_repos(email)
    calculate_repo_last_modify(owned_repos)
    owned_repos.sort(lambda x, y: cmp(y.latest_modify, x.latest_modify))
    
    # Personal repos others shared to me
    in_repos = list_personal_shared_repos(email,'to_email', -1, -1)
    
    # my contacts
    contacts = Contact.objects.filter(user_email=email)

    # user notifications
    grpmsg_list = []
    grpmsg_reply_list = []
    orgmsg_list = []
    notes = UserNotification.objects.filter(to_user=request.user.username)
    new_innerpub_msg = False
    innerpubmsg_reply_list = []
    for n in notes:
        if n.msg_type == 'group_msg':
            grp = get_group(n.detail)
            if not grp:
                continue
            grpmsg_list.append(grp)
        elif n.msg_type == 'grpmsg_reply':
            grpmsg_reply_list.append(n.detail)
        elif n.msg_type == 'org_join_msg':
            orgmsg_list.append(n.detail)
        elif n.msg_type == 'innerpub_msg':
            new_innerpub_msg = True
        elif n.msg_type == 'innerpubmsg_reply':
            innerpubmsg_reply_list.append(n.detail)

    # my groups
    groups = get_personal_groups(email)

    # get nickname
    if not Profile.objects.filter(user=request.user.username):
        nickname = ''
    else:
        profile = Profile.objects.filter(user=request.user.username)[0]
        nickname = profile.nickname

    # ctx_dict = {'base_template': 'myhome_base.html',
    #             'org_dict': None}
    # set_cur_ctx(request, ctx_dict)

    return render_to_response('myhome.html', {
            "myname": email,
            "nickname": nickname,
            "owned_repos": owned_repos,
            "quota_usage": quota_usage,
            "in_repos": in_repos,
            "contacts": contacts,
            "groups": groups,
            "notes": notes,
            "grpmsg_list": grpmsg_list,
            "grpmsg_reply_list": grpmsg_reply_list,
            "orgmsg_list": orgmsg_list,
            "new_innerpub_msg": new_innerpub_msg,
            "innerpubmsg_reply_list": innerpubmsg_reply_list,
            }, context_instance=RequestContext(request))

@login_required
def public_home(request):
    """
    Show public home page when CLOUD_MODE is False.
    """
    if request.method == 'POST':
        form = MessageForm(request.POST)

        if form.is_valid():
            msg = InnerPubMsg()
            msg.from_email = request.user.username
            msg.message = form.cleaned_data['message']
            msg.save()

            return HttpResponseRedirect(reverse('public_home'))
    else:
        form = MessageForm()
        
    users = get_emailusers(-1, -1)
    public_repos = list_inner_pub_repos()

    """inner pub messages"""
    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page= int(request.GET.get('per_page', '15'))
    except ValueError:
        current_page = 1
        per_page = 15

    msgs_plus_one = InnerPubMsg.objects.all()[per_page*(current_page-1) :
                                                  per_page*current_page+1]
    if len(msgs_plus_one) == per_page + 1:
        page_next = True
    else:
        page_next = False
    innerpub_msgs = msgs_plus_one[:per_page]

    msg_replies = InnerPubMsgReply.objects.filter(reply_to__in=innerpub_msgs)
    reply_to_list = [ r.reply_to_id for r in msg_replies ]
    for msg in innerpub_msgs:
        msg.reply_cnt = reply_to_list.count(msg.id)

    # remove user notifications
    UserNotification.objects.filter(to_user=request.user.username,
                                    msg_type='innerpub_msg').delete()

    return render_to_response('public_home.html', {
            'users': users,
            'public_repos': public_repos,
            'form': form,
            'innerpub_msgs': innerpub_msgs,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
            }, context_instance=RequestContext(request))

@login_required
def innerpub_msg_reply(request, msg_id):
    """Show inner pub message replies, and process message reply in ajax"""
    
    content_type = 'application/json; charset=utf-8'
    if request.is_ajax():
        ctx = {}
        if request.method == 'POST':
            form = MessageReplyForm(request.POST)

            # TODO: invalid form
            if form.is_valid():
                msg = form.cleaned_data['message']
                try:
                    innerpub_msg = InnerPubMsg.objects.get(id=msg_id)
                except InnerPubMsg.DoesNotExist:
                    return HttpResponseBadRequest(content_type=content_type)
            
                msg_reply = InnerPubMsgReply()
                msg_reply.reply_to = innerpub_msg
                msg_reply.from_email = request.user.username
                msg_reply.message = msg
                msg_reply.save()

                ctx['reply'] = msg_reply
                html = render_to_string("group/group_reply_new.html", ctx)

        else:
            try:
                msg = InnerPubMsg.objects.get(id=msg_id)
            except InnerPubMsg.DoesNotExist:
                raise HttpResponse(status=400)

            replies = InnerPubMsgReply.objects.filter(reply_to=msg)
            ctx['replies'] = replies
            html = render_to_string("group/group_reply_list.html", ctx)

        serialized_data = json.dumps({"html": html})
        return HttpResponse(serialized_data, content_type=content_type)
    else:
        return HttpResponseBadRequest(content_type=content_type)

@login_required
def innerpub_msg_reply_new(request):
    notes = UserNotification.objects.filter(to_user=request.user.username)
    innerpub_reply_list = [ n.detail for n in notes if \
                              n.msg_type == 'innerpubmsg_reply']

    innerpub_msgs = []
    for msg_id in innerpub_reply_list:
        try:
            m = InnerPubMsg.objects.get(id=msg_id)
        except InnerPubMsg.DoesNotExist:
            continue
        else:
            m.reply_list = InnerPubMsgReply.objects.filter(reply_to=m)
            m.reply_cnt = m.reply_list.count()
            innerpub_msgs.append(m)

    # remove new innerpub msg reply notification
    UserNotification.objects.filter(to_user=request.user.username,
                                    msg_type='innerpubmsg_reply').delete()
            
    return render_to_response("new_innerpubmsg_reply.html", {
            'innerpub_msgs': innerpub_msgs,
            }, context_instance=RequestContext(request))
    
@login_required    
def public_repo_create(request):
    '''
    Handle ajax post to create public repo.
    
    '''
    if not request.is_ajax() or request.method != 'POST':
        return Http404

    result = {}
    content_type = 'application/json; charset=utf-8'
    
    form = RepoCreateForm(request.POST)
    if form.is_valid():
        repo_name = form.cleaned_data['repo_name']
        repo_desc = form.cleaned_data['repo_desc']
        passwd = form.cleaned_data['passwd']
        user = request.user.username

        try:
            # create a repo 
            repo_id = seafserv_threaded_rpc.create_repo(repo_name, repo_desc,
                                                        user, passwd)
            # set this repo as inner pub
            seafserv_threaded_rpc.set_inner_pub_repo(repo_id)
        except:
            repo_id = None
        if not repo_id:
            result['error'] = u"创建目录失败"
        else:
            result['success'] = True
        return HttpResponse(json.dumps(result), content_type=content_type)
    else:
        return HttpResponseBadRequest(json.dumps(form.errors),
                                      content_type=content_type)

@login_required
def unset_inner_pub_repo(request, repo_id):
    try:
        seafserv_threaded_rpc.unset_inner_pub_repo(repo_id)
    except SearpcError:
        pass
    return HttpResponseRedirect(reverse('public_home'))

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
        messages.add_message(request, messages.INFO, u'%s 删除成功。' % file_name)
    except:
        messages.add_message(request, messages.ERROR, u'内部错误。%s 删除失败。' % file_name)

    url = reverse('repo', args=[repo_id]) + ('?p=%s' % urllib2.quote(parent_dir.encode('utf-8')))
    return HttpResponseRedirect(url)

@ctx_switch_required
def repo_view_file(request, repo_id):
    """
    Preview file on web, including files in current worktree and history.
    """
    if request.method == 'POST':
        # handle post request to leave comment on file
        path = request.GET.get('p', '/')
        next = reverse('repo_view_file', args=[repo_id]) + '?p=' + \
            urllib2.quote(path.encode('utf-8'))
        
        f = FileCommentForm(request.POST)
        if f.is_valid():
            repo_id = f.cleaned_data['repo_id']
            file_path = f.cleaned_data['file_path']
            file_path_hash = md5_constructor(file_path).hexdigest()[:12]
            message = f.cleaned_data['message']
            fc = FileComment(repo_id=repo_id, file_path=file_path,
                             file_path_hash=file_path_hash,
                             from_email=request.user.username, message=message)
            fc.save()
            # send a group message if the repo shared to any groups
            repo_shared_groups = get_shared_groups_by_repo(repo_id)

            for group in repo_shared_groups:
                # save group message, and length should be less than 500
                gm = GroupMessage(group_id=group.id,
                                  from_email=request.user.username,
                                  message=message[:500])
                gm.save()
                # send signal
                grpmsg_added.send(sender=GroupMessage, group_id=group.id,
                                  from_email=request.user.username)

                # save attachment
                ma = MessageAttachment(group_message=gm, repo_id=repo_id,
                                       attach_type='file', path=path,
                                       src='filecomment')
                ma.save()
        return HttpResponseRedirect(next)
    
    http_server_root = get_httpserver_root()
    path = request.GET.get('p', '/')
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
        return render_error(request, '文件不存在')
    
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    if access_to_repo(request, repo_id, ''):
        # Get a token to visit file
        token = seafserv_rpc.web_get_access_token(repo_id,
                                                  obj_id,
                                                  'view',
                                                  request.user.username)
    else:
        render_permission_error(request, '无法查看该文件')

    # generate path and link
    zipped = gen_path_link(path, repo.name)

    # determin whether file can preview on web
    filetype, fileext = valid_previewed_file(filename)
        
    # raw path
    raw_path = gen_file_get_url(token, filename)
   
    # get file content
    err = ''
    file_content = ''
    document_swf_exists = False
    if filetype == 'Text' or filetype == 'Markdown':
        err, file_content, encoding, newline_mode = repo_file_get(raw_path)
    elif filetype == 'Document':
        err, document_swf_exists = document_prepare(raw_path, obj_id, fileext)
    
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

    # my constacts
    contacts = Contact.objects.filter(user_email=request.user.username)

        
    # Get groups this repo is shared.    
    if request.user.org:
        org_id = request.user.org['org_id']
        repo_shared_groups = get_org_groups_by_repo(org_id, repo_id)
    else:
        repo_shared_groups = get_shared_groups_by_repo(repo_id)

    # Filter out groups that user in joined.
    groups = [ x for x in repo_shared_groups if \
                   is_group_user(x.id, request.user.username)]

    """file comments"""
    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page= int(request.GET.get('per_page', '15'))
    except ValueError:
        current_page = 1
        per_page = 15
            
    file_path_hash = md5_constructor(urllib2.quote(path.encode('utf-8'))).hexdigest()[:12]            
    comments_plus_one = FileComment.objects.filter(
        file_path_hash=file_path_hash,
        repo_id=repo_id)[per_page*(current_page-1) : per_page*current_page+1]
    if comments_plus_one.count() == per_page + 1:
        page_next = True
    else:
        page_next = False
    comments = comments_plus_one[:per_page]

    contributors = get_file_contributors(repo_id, path.encode('utf-8'), file_path_hash, obj_id)
    latest_contributor = contributors[0]
    
    return render_to_response('repo_view_file.html', {
            'repo': repo,
            'obj_id': obj_id,
            'u_filename': u_filename,
            'file_name': filename,
            'path': path,
            'zipped': zipped,
            'view_history': view_history,
            'current_commit': current_commit,
            'token': token,
            'filetype': filetype,
            'fileext': fileext,
            'raw_path': raw_path,
            'fileshare': fileshare,
            'protocol': http_or_https,
            'domain': domain,
            'file_shared_link': file_shared_link,
            'contacts': contacts,
            'err': err,
            'file_content': file_content,
            "applet_root": get_ccnetapplet_root(),
            'groups': groups,
            'comments': comments,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
            'document_swf_exists': document_swf_exists,
            'DOCUMENT_CONVERTOR_ROOT': DOCUMENT_CONVERTOR_ROOT,
            'contributors': contributors,
            'latest_contributor': latest_contributor,
            }, context_instance=RequestContext(request))
    
def repo_file_get(raw_path):
    err = ''
    file_content = ''
    encoding = ''
    newline_mode = ''
    try:
        file_response = urllib2.urlopen(raw_path)
        if long(file_response.headers['Content-Length']) > FILE_PREVIEW_MAX_SIZE:
            err = '文件超过10M，无法在线查看。'
            return err, '', '', ''
        else:
            content = file_response.read()
    except urllib2.HTTPError, e:
        err = 'HTTPError: 无法在线打开该文件'
        return err, '', '', ''
    except urllib2.URLError as e:
        err = 'URLError: 无法在线打开该文件'
        return err, '', '', ''
    else:
        try:
            u_content = content.decode('utf-8')
            encoding = 'utf-8'
        except UnicodeDecodeError:
            # XXX: file in windows is encoded in gbk
            try:
                u_content = content.decode('gbk')
                encoding = 'gbk'
            except UnicodeDecodeError:
                err = u'文件编码无法识别'
                return err, '', '', ''

        file_content = u_content

    # detect newline mode for ace editor
    if '\r\n' in u_content:
        newline_mode = 'windows'
    elif '\n' in u_content:
        newline_mode = 'unix'
    else:
        newline_mode = 'windows'
    return err, file_content, encoding, newline_mode


def pdf_full_view(request):
    repo_id = request.GET.get('repo_id', '')
    obj_id = request.GET.get('obj_id', '')
    file_name = request.GET.get('file_name', '')

    token = seafserv_rpc.web_get_access_token(repo_id, obj_id,
                                              'view', request.user.username)
    file_src = gen_file_get_url(token, file_name)
    return render_to_response('pdf_full_view.html', {
            'file_src': file_src,
                }, context_instance=RequestContext(request))

def update_file_after_edit(request, repo_id):
    content_type = 'application/json; charset=utf-8'
    def error_json(error_msg=u"内部错误"):
        return HttpResponse(json.dumps({'error': error_msg}),
                            status=400,
                            content_type=content_type)
    def ok_json():
        return HttpResponse(json.dumps({'status': 'ok'}),
                            content_type=content_type)
        
    content = request.POST.get('content')
    encoding = request.POST.get('encoding')
    path = request.GET.get('p')
    if content is None or not path:
        return error_json(u"参数错误")

    if encoding not in ["gbk", "utf-8"]:
        return error_json(u"参数错误")

    content = content.encode(encoding)

    # first dump the file content to a tmp file, then update the file
    fd, tmpfile = tempfile.mkstemp()
    def remove_tmp_file():
        try:
            os.remove(tmpfile)
        except:
            pass

    try:
        bytesWritten = os.write(fd, content)
    except:
        bytesWritten = -1
    finally:
        os.close(fd)

    if bytesWritten != len(content):
        remove_tmp_file()
        return error_json()

    parent_dir = os.path.dirname(path).encode('utf-8')
    filename = os.path.basename(path).encode('utf-8')
    try:
        seafserv_threaded_rpc.put_file (repo_id, tmpfile, parent_dir,
                                 filename, request.user.username)
        remove_tmp_file()
        return ok_json()
    except SearpcError, e:
        remove_tmp_file()
        return error_json(str(e))


@login_required
@ctx_switch_required
def repo_file_edit(request, repo_id):
    if request.method == 'POST':
        return update_file_after_edit(request, repo_id)

    path = request.GET.get('p', '/')
    if path[-1] == '/':
        path = path[:-1]
    u_filename = os.path.basename(path)
    filename = urllib2.quote(u_filename.encode('utf-8'))

    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    try:
        obj_id = seafserv_threaded_rpc.get_file_by_path(repo_id, path)
    except:
        obj_id = None
    if not obj_id:
        return render_error(request, '文件不存在')

    if access_to_repo(request, repo_id, ''):
        token = seafserv_rpc.web_get_access_token(repo_id, obj_id,
                                                  'view', request.user.username)
    else:
        render_permission_error(request, '无法查看该文件')

    # generate path and link
    zipped = gen_path_link(path, repo.name)

    filetype, fileext = valid_previewed_file(filename)

    # get file content
    raw_path = gen_file_get_url(token, filename)
    err, file_content, encoding, newline_mode = repo_file_get(raw_path)

    return render_to_response('repo_edit_file.html', {
        'repo':repo,
        'u_filename':u_filename,
        'path':path,
        'zipped':zipped,
        'filetype':filetype,
        'fileext':fileext,
        'err':err,
        'file_content':file_content,
        'encoding': encoding,
        'newline_mode': newline_mode,
    }, context_instance=RequestContext(request))


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
            return render_error(request, e.msg)

    if repo.props.encrypted and not password_set:
        return HttpResponseRedirect(reverse('repo', args=[repo_id]))

    op = request.GET.get('op', 'view')
    file_name = request.GET.get('file_name', '')

    if op == 'del':
        return repo_del_file(request, repo_id)

    # If vistor's file shared token in url params matches the token in db,
    # then we know the vistor is from file shared link.
    share_token = request.GET.get('t', '')
    path = '/' + file_name
    if FileShare.objects.filter(token=share_token).filter(path=path) > 0:
        from_shared_link = True
    else:
        from_shared_link = False

    if access_to_repo(request, repo_id, '') or from_shared_link:
        # Get a token to access file
        token = seafserv_rpc.web_get_access_token(repo_id, obj_id,
                                                  op, request.user.username)
    else:
        render_permission_error(request, '无法访问文件')

    redirect_url = gen_file_get_url(token, file_name)
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

    try:
        token = seafserv_threaded_rpc.get_repo_token_nonnull \
                (repo_id, request.user.username)
    except Exception, e:
        return render_error(request, str(e))

    addr, port = get_ccnet_server_addr_port ()

    if not (addr and port):
        return render_error(request, u"服务器设置错误")

    ccnet_applet_root = get_ccnetapplet_root()
    email = urllib2.quote(request.user.username)

    url = ccnet_applet_root + "/repo/download/"
    
    url += "?relay_id=%s&relay_addr=%s&relay_port=%s" % (relay_id, addr, port)
    url += "&email=%s&token=%s" % (email, token)
    url += "&repo_id=%s&repo_name=%s&encrypted=%s" % (repo_id, quote_repo_name, enc)

    return HttpResponseRedirect(url)

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
        return render_error(request)

    # do nothing when dst is the same as src
    if src_repo_id == dst_repo_id and src_path == dst_path:
        url = reverse('repo', args=[src_repo_id]) + ('?p=%s' % urllib2.quote(src_path.encode('utf-8')))
        return HttpResponseRedirect(url)

    # Error when moving/copying a dir to its subdir
    if obj_type == 'dir':
        src_dir = os.path.join(src_path, obj_name)
        if dst_path.startswith(src_dir):
            error_msg = u"不能把目录 %s %s到它的子目录 %s中" \
                        % (src_dir, u"复制" if op == 'cp' else u"移动", dst_path)
            #return render_error(request, error_msg)
            messages.add_message(request, messages.ERROR, error_msg)
            url = reverse('repo', args=[src_repo_id]) + ('?p=%s' % urllib2.quote(src_path.encode('utf-8')))
            return HttpResponseRedirect(url)

    new_obj_name = check_filename_with_rename(dst_repo_id, dst_path, obj_name)

    try:
        msg_url = reverse('repo', args=[dst_repo_id]) + u'?p=' + urllib2.quote(dst_path.encode('utf-8'))
        if op == 'cp':
            seafserv_threaded_rpc.copy_file (src_repo_id, src_path, obj_name,
                                             dst_repo_id, dst_path, new_obj_name,
                                             request.user.username)
            messages.add_message(request, messages.INFO, u'%s 复制成功：<a href="%s">查看</a>' % (obj_name, msg_url))
        elif op == 'mv':
            seafserv_threaded_rpc.move_file (src_repo_id, src_path, obj_name,
                                             dst_repo_id, dst_path, new_obj_name,
                                             request.user.username)
            messages.add_message(request, messages.INFO, u'%s 移动成功：<a href="%s">查看</a>' % (obj_name, msg_url))
    except Exception, e:
        return render_error(request, str(e))

    url = reverse('repo', args=[src_repo_id]) + ('?p=%s' % urllib2.quote(src_path.encode('utf-8')))

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
            return render_permission_error(request, u'取消共享失败')
        seafserv_threaded_rpc.remove_share(repo_id, from_email, to_email)
    else:
        try:
            group_id_int = int(group_id)
        except:
            return render_error(request, u'group id 不是有效参数')

        if not check_group_staff(group_id_int, request.user) \
                and request.user.username != from_email: 
            return render_permission_error(request, u'取消共享失败')

        if is_org_group(group_id_int):
            org_id = get_org_id_by_group(group_id_int)
            del_org_group_repo(repo_id, org_id, group_id_int)
        else:
            from group.views import group_unshare_repo
            group_unshare_repo(request, repo_id, group_id_int, from_email)

    messages.add_message(request, messages.INFO, '操作成功')
        
    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = settings.SITE_ROOT

    return HttpResponseRedirect(next)
    
@login_required
@sys_staff_required
def sys_seafadmin(request):
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
        if is_org_repo(repo.id):
            repo.owner = get_org_repo_owner(repo.id)
        else:
            try:
                repo.owner = seafserv_threaded_rpc.get_repo_owner(repo.id)
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
@sys_staff_required
def sys_useradmin(request):
    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
        per_page= int(request.GET.get('per_page', '25'))
    except ValueError:
        current_page = 1
        per_page = 25
    users_plus_one = get_emailusers(per_page * (current_page - 1), per_page + 1)
    if len(users_plus_one) == per_page + 1:
        page_next = True
    else:
        page_next = False

    users = users_plus_one[:per_page]
    for user in users:
        if user.props.id == request.user.id:
            user.is_self = True
            
    return render_to_response(
        'sys_useradmin.html', {
            'users': users,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
        },
        context_instance=RequestContext(request))

@login_required
@sys_staff_required
def user_info(request, email):
    owned_repos = []
    quota_usage = 0

    owned_repos = seafserv_threaded_rpc.list_owned_repos(email)
    quota_usage = seafserv_threaded_rpc.get_user_quota_usage(email)

    # Repos that are share to user
    in_repos = seafserv_threaded_rpc.list_share_repos(email, 'to_email',
                                                      -1, -1)

    return render_to_response(
        'userinfo.html', {
            'owned_repos': owned_repos,
            'quota_usage': quota_usage,
            "in_repos": in_repos,
            'email': email
            }, context_instance=RequestContext(request))

@login_required
@sys_staff_required
def user_remove(request, user_id):
    """Remove user, also remove group relationship."""
    try:
        user = User.objects.get(id=int(user_id))
        user.delete()
    except User.DoesNotExist:
        pass
    
    return HttpResponseRedirect(reverse('sys_useradmin'))

@login_required
@sys_staff_required
def activate_user(request, user_id):
    try:
        user = User.objects.get(id=int(user_id))
        user.is_active = True
        user.save()
    except User.DoesNotExist:
        pass

    return HttpResponseRedirect(reverse('sys_useradmin'))

def send_user_reset_email(request, email, password):
    """
    Send email when reset user password.
    """
    use_https = request.is_secure()
    domain = RequestSite(request).domain
    
    t = loader.get_template('user_reset_email.html')
    c = {
        'email': email,
        'password': password,
        }
    try:
        send_mail(u'密码重置', t.render(Context(c)),
                  None, [email], fail_silently=False)
        messages.add_message(request, messages.INFO, '通知邮件已成功。')
    except:
        messages.add_message(request, messages.ERROR, '邮件发送失败。')

@login_required
@sys_staff_required
def user_reset(request, user_id):
    """Reset password for user."""
    try:
        user = User.objects.get(id=int(user_id))
        user.set_password(INIT_PASSWD)
        user.save()

        messages.add_message(request, messages.INFO, u'密码重置成功。')

        if hasattr(settings, 'EMAIL_HOST'):
            send_user_reset_email(request, user.email, INIT_PASSWD)
    except User.DoesNotExist:
        msg  =u'密码重置失败，用户不存在。'
        messages.add_message(request, messages.ERROR, msg)

    return HttpResponseRedirect(reverse('sys_useradmin'))
    
def send_user_add_mail(request, email, password):
    """Send email when add new user."""
    
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
        messages.add_message(request, messages.INFO, '邮件发送成功。')
    except:
        messages.add_message(request, messages.ERROR, '邮件发送失败。')

@login_required
def user_add(request):
    """Add a user"""

    if not request.user.is_staff and not request.user.org['is_staff']:
        raise Http404

    base_template = 'org_admin_base.html' if request.user.org else 'admin_base.html'
    
    if request.method == 'POST':
        form = AddUserForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data['email']
            password = form.cleaned_data['password1']

            user = User.objects.create_user(email, password,
                                            is_staff=False,
                                            is_active=True)
            
            if request.user.org:
                org_id = request.user.org['org_id']
                url_prefix = request.user.org['url_prefix']
                ccnet_threaded_rpc.add_org_user(org_id, email, 0)
                if hasattr(settings, 'EMAIL_HOST'):
                    send_user_add_mail(request, email, password)
                    
                return HttpResponseRedirect(reverse('org_useradmin',
                                                    args=[url_prefix]))
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


@login_required
@sys_staff_required
def sys_group_admin(request):
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

@login_required
@sys_staff_required
def sys_org_admin(request):
    try:
        orgs = ccnet_threaded_rpc.get_all_orgs(0, MAX_INT)
    except:
        orgs = []

    return render_to_response('sys_org_admin.html', {
            'orgs': orgs,
            }, context_instance=RequestContext(request))

@login_required
@sys_staff_required
def org_remove(request, org_id):
    try:
        org_id_int = int(org_id)
    except ValueError:
        return HttpResponseRedirect(reverse('sys_org_admin'))

    # Remove repos in that org
    seafserv_threaded_rpc.remove_org_repo_by_org_id(org_id_int)
    
    # TODO: Remove repos in org's groups
    
    ccnet_threaded_rpc.remove_org(org_id_int)
    
    return HttpResponseRedirect(reverse('sys_org_admin'))

# @login_required
# def org_info(request):
#     if not request.user.org:
#         raise Http404

#     org = request.user.org
    
#     org_members = ccnet_threaded_rpc.get_org_emailusers(org.url_prefix, 0, MAX_INT)
#     for member in org_members:
#         member.short_username = member.email.split('@')[0]

#     groups = get_org_groups(org.org_id, -1, -1)
    
#     return render_to_response('org_info.html', {
#             'org': org,
#             'org_users': org_members,
#             'groups': groups,
#             }, context_instance=RequestContext(request))

@login_required
def file_upload_progress_page(request):
    '''
    As iframe in repo_upload_file.html, for solving problem in chrome.

    '''
    uuid = request.GET.get('uuid', '')
    httpserver_root = get_httpserver_root()

    return render_to_response('file_upload_progress_page.html', {
        'uuid': uuid,
        'httpserver_root': httpserver_root,
            }, context_instance=RequestContext(request))

@login_required        
def repo_new_dir(request):        
    result = {}
    content_type = 'application/json; charset=utf-8'
    
    form = RepoNewDirForm(request.POST)
    if form.is_valid():
        repo_id       = form.cleaned_data["repo_id"]
        parent_dir    = form.cleaned_data["parent_dir"]
        new_dir_name = form.cleaned_data["new_dir_name"]
        user          = request.user.username
    else:
        result['error'] = str(form.errors.values()[0])
        return HttpResponse(json.dumps(result), content_type=content_type)

    new_dir_name = check_filename_with_rename(repo_id, parent_dir, new_dir_name)

    try:
        seafserv_threaded_rpc.post_dir(repo_id, parent_dir, new_dir_name, user)
    except Exception, e:
        result['error'] = str(e)
        return HttpResponse(json.dumps(result), content_type=content_type)
        
    url = reverse('repo', args=[repo_id]) + \
        ('?p=%s' % urllib2.quote(parent_dir.encode('utf-8')))
    return HttpResponse(json.dumps({'success': True}),
                        content_type=content_type)
    
@login_required        
def repo_new_file(request):        
    result = {}
    content_type = 'application/json; charset=utf-8'

    form = RepoNewFileForm(request.POST)
    if form.is_valid():
        repo_id       = form.cleaned_data["repo_id"]
        parent_dir    = form.cleaned_data["parent_dir"]
        new_file_name = form.cleaned_data["new_file_name"]
        user          = request.user.username
    else:
        result['error'] = str(form.errors.values()[0])
        return HttpResponse(json.dumps(result), content_type=content_type)
        
    new_file_name = check_filename_with_rename(repo_id, parent_dir,
                                               new_file_name)

    try:
        seafserv_threaded_rpc.post_empty_file(repo_id, parent_dir,
                                              new_file_name, user)
    except Exception, e:
        result['error'] = str(e)
        return HttpResponse(json.dumps(result), content_type=content_type)
        
    url = reverse('repo', args=[repo_id]) + \
        ('?p=%s' % urllib2.quote(parent_dir.encode('utf-8')))
    return HttpResponse(json.dumps({'success': True}),
                        content_type=content_type)

@login_required    
def repo_rename_file(request):
    result = {}
    content_type = 'application/json; charset=utf-8'

    form = RepoRenameFileForm(request.POST)
    if form.is_valid():
        repo_id       = form.cleaned_data["repo_id"]
        parent_dir    = form.cleaned_data["parent_dir"]
        oldname       = form.cleaned_data["oldname"]
        newname       = form.cleaned_data["newname"]
        user          = request.user.username
    else:
        result['error'] = str(form.errors.values()[0])
        return HttpResponse(json.dumps(result), content_type=content_type)

    if newname == oldname:
        return HttpResponse(json.dumps({'success': True}),
                            content_type=content_type)

    newname = check_filename_with_rename(repo_id, parent_dir, newname)

    try:
        seafserv_threaded_rpc.rename_file (repo_id, parent_dir,
                                           oldname, newname, user)
        messages.add_message(request, messages.INFO, u'%s 已重命名为 %s。' % \
                                 (oldname, newname))
    except Exception, e:
        result['error'] = str(e)
        return HttpResponse(json.dumps(result), content_type=content_type)

    url = reverse('repo', args=[repo_id]) + \
        ('?p=%s' % urllib2.quote(parent_dir.encode('utf-8')))
    return HttpResponse(json.dumps({'success': True}),
                        content_type=content_type)

@login_required    
def validate_filename(request):
    repo_id     = request.GET.get('repo_id')
    filename    = request.GET.get('filename')

    if not (repo_id and filename):
        return render_error(request)

    result = {'ret':'yes'}

    try:
        ret = is_valid_filename(filename)
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
    if not request.is_ajax() or request.method != 'POST':
        return Http404

    result = {}
    content_type = 'application/json; charset=utf-8'
    
    form = RepoCreateForm(request.POST)
    if form.is_valid():
        repo_name = form.cleaned_data['repo_name']
        repo_desc = form.cleaned_data['repo_desc']
        passwd = form.cleaned_data['passwd']
        user = request.user.username
        
        try:
            repo_id = seafserv_threaded_rpc.create_repo(repo_name, repo_desc,
                                                        user, passwd)
        except:
            repo_id = None
        if not repo_id:
            result['error'] = u"创建目录失败"
        else:
            result['success'] = True
        return HttpResponse(json.dumps(result), content_type=content_type)
    else:
        return HttpResponseBadRequest(json.dumps(form.errors),
                                      content_type=content_type)

def render_file_revisions (request, repo_id):
    """List all history versions of a file."""
    path = request.GET.get('p', '/')
    if path[-1] == '/':
        path = path[:-1]
    u_filename = os.path.basename(path)
    filename = urllib2.quote(u_filename.encode('utf-8'))

    if not path:
        return render_error(request)

    repo = get_repo(repo_id)
    if not repo:
        error_msg = u"同步目录不存在"
        return render_error(request, error_msg)

    try:
        commits = seafserv_threaded_rpc.list_file_revisions(repo_id, path, 0)
    except SearpcError, e:
        return render_error(request, e.msg)

    if not commits:
        return render_error(request)
        
    # Check whether use is repo owner
    if validate_owner(request, repo_id):
        is_owner = True
    else:
        is_owner = False

    try:
        current_commit = get_commits(repo_id, 0, 1)[0]
        current_file_id = get_file_revision_id_size (current_commit.id, path)[0]
        for commit in commits:
            file_id, file_size = get_file_revision_id_size (commit.id, path)
            if not file_id or file_size is None:
                # do not use no file_size, since it's ok to have file_size = 0
                return render_error(request)
            commit.revision_file_size = file_size
            if file_id == current_file_id:
                commit.is_current_version = True
            else:
                commit.is_current_version = False
    except Exception, e:
        return render_error(request, str(e))

    zipped = gen_path_link(path, repo.name)

    return render_to_response('file_revisions.html', {
        'repo': repo,
        'path': path,
        'u_filename': u_filename,
        'zipped': zipped,
        'commits': commits,
        'is_owner': is_owner,
        }, context_instance=RequestContext(request))

@login_required
def repo_revert_file (request, repo_id):
    commit_id = request.GET.get('commit')
    path      = request.GET.get('p')
    from_page = request.GET.get('from')

    if not (commit_id and path and from_page):
        return render_error(request, u"参数错误")

    try:
        ret = seafserv_threaded_rpc.revert_file (repo_id, commit_id,
                            path.encode('utf-8'), request.user.username)
    except Exception, e:
        return render_error(request, str(e))
    else:
        if from_page == 'repo_history':
            # When revert file from repo history, we redirect to repo history
            url = reverse('repo', args=[repo_id]) + u'?commit_id=%s&history=y' % commit_id
        else:
            # When revert file from file history, we redirect to parent dir of this file
            parent_dir = os.path.dirname(path)
            url = reverse('repo', args=[repo_id]) + ('?p=%s' % urllib2.quote(parent_dir.encode('utf-8')))

        file_view_url = reverse('repo_view_file', args=[repo_id]) + u'?p=' + urllib2.quote(path.encode('utf-8'))
        if ret == 1:
            msg = u'<a href="%s">%s</a> 已还原到根目录下' % (file_view_url, path.lstrip('/'))
            messages.add_message(request, messages.INFO, msg)
        else:
            msg = u'<a href="%s">%s</a> 已经还原' % (file_view_url, path.lstrip('/'))
            messages.add_message(request, messages.INFO, msg)
        return HttpResponseRedirect(url)

@login_required
@ctx_switch_required
def file_revisions(request, repo_id):
    if request.method != 'GET':
        return render_error(request)

    op = request.GET.get('op')
    if not op:
        return render_file_revisions(request, repo_id)
    elif op != 'download' and op != 'view':
        return render_error(request)

    commit_id   = request.GET.get('commit')
    path        = request.GET.get('p')

    if not (commit_id and path):
        return render_error(request)

    if op == 'download':
        def handle_download():
            parent_dir = os.path.dirname(path)
            file_name  = os.path.basename(path)
            seafdir = seafserv_threaded_rpc.list_dir_by_path (commit_id, \
                                        parent_dir.encode('utf-8'))
            if not seafdir:
                return render_error(request)

            # for ...  else ...
            for dirent in seafdir:
                if dirent.obj_name == file_name:
                    break
            else:
                return render_error(request)

            url = reverse('repo_access_file', args=[repo_id, dirent.obj_id])
            url += '?file_name=%s&op=download' % urllib2.quote(file_name.encode('utf-8'))
            return HttpResponseRedirect(url)

        try:
            return handle_download()
        except Exception, e:
            return render_error(request, str(e))
    elif op == 'view':
        seafile_id = get_file_revision_id_size (commit_id, path)[0]
        if not seafile_id:
            return render_error(request)
        file_name = os.path.basename(path)
        url = reverse(repo_view_file, args=[repo_id])
        url += '?obj_id=%s&commit_id=%s&p=%s' % (seafile_id, commit_id, path)
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
        return render_error(request, '文件不存在')
    
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    access_token = seafserv_rpc.web_get_access_token(repo.id, obj_id,
                                                     'view', '')
    
    filetype, fileext = valid_previewed_file(filename)
    
    # Raw path
    raw_path = gen_file_get_url(access_token, quote_filename)

    # get file content
    err = ''
    file_content = ''
    if filetype == 'Text' or filetype == 'Markdown':
        err, file_content, encoding, newline_mode = repo_file_get(raw_path)
    
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
            'filetype': filetype,
            'fileext': fileext,
            'raw_path': raw_path,
            'username': username,
            'err': err,
            'file_content': file_content,
            }, context_instance=RequestContext(request))

@login_required
def remove_shared_link(request):
    """
    Handle request to remove file shared link.
    """
    token = request.GET.get('t', '')
    
    if not request.is_ajax():
        FileShare.objects.filter(token=token).delete()
        next = request.META.get('HTTP_REFERER', None)
        if not next:
            next = reverse('share_admin')

        messages.add_message(request, messages.INFO, u'删除成功')
        
        return HttpResponseRedirect(next)

    content_type = 'application/json; charset=utf-8'
    
    FileShare.objects.filter(token=token).delete()

    msg = '删除成功'
    data = json.dumps([{'msg': msg}])
    return HttpResponse(data, status=200, content_type=content_type)
    
@login_required
def send_shared_link(request):
    """
    Handle ajax post request to send file shared link.
    """
    if not request.is_ajax() and not request.method == 'POST':
        raise Http404

    result = {}
    content_type = 'application/json; charset=utf-8'

    form = FileLinkShareForm(request.POST)
    if form.is_valid():
        email = form.cleaned_data['email']
        file_shared_link = form.cleaned_data['file_shared_link']

        t = loader.get_template('shared_link_email.html')
        to_email_list = string2list(email)
        for to_email in to_email_list:
            # Add email to contacts.
            mail_sended.send(sender=None, user=request.user.username,
                             email=to_email)

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
                data = json.dumps({'error':u'发送失败'})
                return HttpResponse(data, status=500, content_type=content_type)

        data = json.dumps("success")
        messages.add_message(request, messages.INFO, u'发送成功')
        return HttpResponse(data, status=200, content_type=content_type)
    else:
        return HttpResponseBadRequest(json.dumps(form.errors),
                                      content_type=content_type)

def document_prepare(raw_path, obj_id, doctype):
    curl = DOCUMENT_CONVERTOR_ROOT + 'convert'
    data = {'doctype': doctype,
            'file_id': obj_id,
            'url': raw_path}
    try:
        f = urllib2.urlopen(url=curl, data=urllib.urlencode(data))
    except urllib2.URLError, e:
        return u'内部错误', False
    else:
        ret = f.read()
        ret_dict = json.loads(ret)
        if ret_dict.has_key('error'):
            return ret_dict['error'], False
        else:
            return None, ret_dict['exists']
