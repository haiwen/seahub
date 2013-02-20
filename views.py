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
import logging
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
from django.utils.translation import ugettext as _
from django.views.generic.base import TemplateView, TemplateResponseMixin
from django.views.generic.edit import BaseFormView, FormMixin

from auth.decorators import login_required
from auth import login as auth_login
from auth import authenticate
from seaserv import ccnet_rpc, ccnet_threaded_rpc, get_repos, get_emailusers, \
    get_repo, get_commits, get_branches, is_valid_filename, remove_group_user,\
    seafserv_threaded_rpc, seafserv_rpc, get_binding_peerids, is_repo_owner, \
    check_group_staff, get_personal_groups_by_user, is_inner_pub_repo, \
    del_org_group_repo, get_personal_groups, web_get_access_token, remove_repo, \
    get_group, get_shared_groups_by_repo, is_group_user, check_permission, \
    list_personal_shared_repos, is_org_group, get_org_id_by_group, is_org_repo,\
    list_inner_pub_repos, get_org_groups_by_repo, is_org_repo_owner, \
    get_org_repo_owner, is_passwd_set, get_file_size, check_quota, \
    get_related_users_by_repo, get_related_users_by_org_repo, HtmlDiff, \
    get_session_info, get_group_repoids, get_repo_owner, get_file_id_by_path, \
    get_repo_history_limit, set_repo_history_limit, MAX_UPLOAD_FILE_SIZE, \
    get_commit, MAX_DOWNLOAD_DIR_SIZE, CALC_SHARE_USAGE, unset_inner_pub_repo
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
from share.models import FileShare
from forms import AddUserForm, RepoCreateForm, RepoNewDirForm, RepoNewFileForm,\
    FileCommentForm, RepoRenameFileForm, RepoPassowrdForm, SharedRepoCreateForm,\
    SetUserQuotaForm, RepoSettingForm
from signals import repo_created, repo_deleted
from utils import render_permission_error, render_error, list_to_string, \
    get_httpserver_root, get_ccnetapplet_root, gen_shared_link, \
    calculate_repo_last_modify, valid_previewed_file, \
    check_filename_with_rename, get_accessible_repos, EMPTY_SHA1, \
    get_file_revision_id_size, get_ccnet_server_addr_port, \
    gen_file_get_url, string2list, MAX_INT, IS_EMAIL_CONFIGURED, \
    gen_file_upload_url, check_and_get_org_by_repo, \
    get_file_contributors, EVENTS_ENABLED, get_user_events, get_org_user_events, \
    get_starred_files, star_file, unstar_file, is_file_starred, get_dir_starred_files, \
    get_dir_files_last_modified, show_delete_days
try:
    from settings import DOCUMENT_CONVERTOR_ROOT
    if DOCUMENT_CONVERTOR_ROOT[-1:] != '/':
        DOCUMENT_CONVERTOR_ROOT += '/'
except ImportError:
    DOCUMENT_CONVERTOR_ROOT = None
from settings import FILE_PREVIEW_MAX_SIZE, INIT_PASSWD, USE_PDFJS,\
    SEND_EMAIL_ON_ADDING_SYSTEM_MEMBER, SEND_EMAIL_ON_RESETTING_USER_PASSWD

try:
    from cStringIO import StringIO
    dir(StringIO) # Placate PyFlakes
except ImportError:
    from StringIO import StringIO

try:
    from PIL import Image
    dir(Image) # Placate PyFlakes
except ImportError:
    import Image

# Get an instance of a logger
logger = logging.getLogger(__name__)

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

    NOTE: This function is deprecated, use `get_user_permission`.
    """
    if not request.user.is_authenticated():
        token = request.COOKIES.get('anontoken', None)
        return True if token else False
    else:
        return True if check_permission(repo_id, request.user.username) else False

def get_user_permission(request, repo_id):
    if request.user.is_authenticated():
        return check_permission(repo_id, request.user.username)
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
    if repo_name:
        paths.insert(0, repo_name)
        links.insert(0, '/')
        
    zipped = zip(paths, links)
    
    return zipped

def get_repo_dirents(request, repo_id, commit, path):
    dir_list = []
    file_list = []
    if commit.root_id == EMPTY_SHA1:
        return ([], [])
    else:
        try:
            dirs = seafserv_threaded_rpc.list_dir_by_path(commit.id, path.encode('utf-8'))
        except SearpcError, e:
            raise Http404
            # return render_error(self.request, e.msg)

        org_id = -1
        if hasattr(request.user, 'org') and request.user.org:
            org_id = request.user.org['org_id']
        starred_files = get_dir_starred_files(request.user.username, repo_id, path, org_id)

        last_modified_info = get_dir_files_last_modified(repo_id, path)

        fileshares = FileShare.objects.filter(repo_id=repo_id).filter(username=request.user.username)
        http_or_https = request.is_secure() and 'https' or 'http'
        domain = RequestSite(request).domain

        for dirent in dirs:
            dirent.last_modified = last_modified_info.get(dirent.obj_name, 0)
            dirent.sharelink = ''
            if stat.S_ISDIR(dirent.props.mode):
                dpath = os.path.join(path, dirent.obj_name)
                if dpath[-1] != '/':
                    dpath += '/'
                for share in fileshares:
                    if dpath == share.path:
                        dirent.sharelink = gen_shared_link(request, share.token, 'd')
                        dirent.sharetoken = share.token
                        break
                dir_list.append(dirent)
            else:
                file_list.append(dirent)
                dirent.file_size = get_file_size(dirent.obj_id)
                dirent.starred = False
                fpath = os.path.join(path, dirent.obj_name)
                if fpath in starred_files:
                    dirent.starred = True
                for share in fileshares:
                    if fpath == share.path:
                        dirent.sharelink = gen_shared_link(request, share.token, 'f')
                        dirent.sharetoken = share.token
                        break
        dir_list.sort(lambda x, y : cmp(x.obj_name.lower(),
                                        y.obj_name.lower()))
        file_list.sort(lambda x, y : cmp(x.obj_name.lower(),
                                         y.obj_name.lower()))
        return (file_list, dir_list)

class RepoMixin(object):
    def get_repo_id(self):
        return self.kwargs.get('repo_id', '')

    def get_path(self):
        path = self.request.GET.get('p', '/')
        if path[-1] != '/':
            path = path + '/'
        return path

    def get_parent_dir(self):
        return self.request.GET.get('p', '/')
    
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

    def get_nav_path(self):
        zipped = gen_path_link(self.path, self.repo.name)
        return zipped

    def get_applet_root(self):
        return get_ccnetapplet_root()

    def get_current_commit(self):
        # Get newest commit by default, subclasses can override this method.
        return get_commits(self.repo.id, 0, 1)[0]

    def get_success_url(self):
        next = self.request.GET.get('next', '')
        if next:
            return next
        return reverse('repo', args=[self.repo_id])

    def prepare_property(self):
        # NOTE: order is important.
        self.repo_id = self.get_repo_id()
        self.user = self.get_user()
        self.path = self.get_path()
        self.parent_dir = self.get_parent_dir()
        self.repo = self.get_repo(self.repo_id)
        self.repo_size = self.get_repo_size()        
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
            self.file_list, self.dir_list = get_repo_dirents(self.request, self.repo_id, self.current_commit, self.path)
            self.zipped = self.get_nav_path()
            self.applet_root = self.get_applet_root()
            self.protocol = self.request.is_secure() and 'https' or 'http'
            self.domain = RequestSite(self.request).domain
            self.contacts = Contact.objects.filter(user_email=self.request.user.username)
        
    def get(self, request, *args, **kwargs):
        self.prepare_property()
        return super(RepoMixin, self).get(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        self.prepare_property()
        return super(RepoMixin, self).post(request, *args, **kwargs)
        
class RepoView(LoginRequiredMixin, CtxSwitchRequiredMixin, RepoMixin,
               TemplateResponseMixin, BaseFormView):
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
            accessible_repos = get_accessible_repos(self.request, self.repo)
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

    def is_starred_dir(self):
        org_id = -1
        if self.request.user.org:
            org_id = self.request.user.org['org_id']
        args = (self.request.user.username, self.repo.id, self.path.encode('utf-8'), org_id)
        return is_file_starred(*args)

    def is_no_quota(self):
        return True if check_quota(self.repo_id) < 0 else False

    def get_max_upload_file_size(self):
        return MAX_UPLOAD_FILE_SIZE

    def get_upload_url(self):
        if get_user_permission(self.request, self.repo_id) == 'rw':
            token = web_get_access_token(self.repo_id,
                                         'dummy', 'upload',
                                         self.request.user.username)
            return gen_file_upload_url(token, 'upload')
        else:
            return ''

    def get_httpserver_root(self):
        return get_httpserver_root()

    def get_update_url(self):
        if get_user_permission(self.request, self.repo_id) == 'rw':
            token = web_get_access_token(self.repo_id,
                                         'dummy', 'update',
                                         self.request.user.username)
            return gen_file_upload_url(token, 'update')
        else:
            return ''

    def get_fileshare(self, repo_id, user, path):
        if path == '/':    # no shared link for root dir
            return None
        
        l = FileShare.objects.filter(repo_id=repo_id).filter(\
            username=user).filter(path=path)
        fileshare = l[0] if len(l) > 0 else None
        return fileshare

    def get_shared_link(self, fileshare):
        # dir shared link
        http_or_https = self.request.is_secure() and 'https' or 'http'
        domain = RequestSite(self.request).domain
        
        if fileshare:
            dir_shared_link = gen_shared_link(self.request, fileshare.token, 'd')
        else:
            dir_shared_link = ''
        return dir_shared_link

    def is_repo_owner(self, username, repo_id):
        if self.request.user.org:
            return is_org_repo_owner(self.request.user.org['org_id'],
                                     repo_id, username)
        else:
            return is_repo_owner(username, repo_id)
    
    def get_context_data(self, **kwargs):
        kwargs['repo'] = self.repo
        kwargs['user_perm'] = self.user_perm
        kwargs['is_repo_owner'] = self.is_repo_owner(self.get_user().username, self.repo.id)
        kwargs['current_commit'] = self.get_current_commit()
        kwargs['password_set'] = self.password_set
        kwargs['repo_size'] = self.repo_size
        kwargs['dir_list'] = self.dir_list
        kwargs['file_list'] = self.file_list
        kwargs['path'] = self.path
        kwargs['parent_dir'] = self.parent_dir
        kwargs['zipped'] = self.zipped
        kwargs['accessible_repos'] = self.get_accessible_repos()
        kwargs['applet_root'] = self.applet_root
        kwargs['groups'] = self.get_repo_shared_groups()
        kwargs['is_starred'] = self.is_starred_dir()
        kwargs['next'] = self.get_success_url()
        if len(kwargs['groups']) > 1:
            ctx = {}
            ctx['groups'] = kwargs['groups']
            repogrp_str = render_to_string("snippets/repo_group_list.html", ctx)
            kwargs['repo_group_str'] = repogrp_str
        else:
            kwargs['repo_group_str'] = ''
        kwargs['no_quota'] = self.is_no_quota()
        kwargs['max_upload_file_size'] = self.get_max_upload_file_size()
        kwargs['upload_url'] = self.get_upload_url()
        kwargs['update_url'] = self.get_update_url()
        kwargs['httpserver_root'] = self.get_httpserver_root()
        kwargs['head_id'] = self.repo.head_cmmt_id
        kwargs['protocol'] = self.protocol
        kwargs['domain'] = self.domain
        kwargs['contacts'] = self.contacts
        kwargs['fileshare'] = self.get_fileshare(\
            self.repo_id, self.request.user.username, self.path)
        kwargs['dir_shared_link'] = self.get_shared_link(kwargs['fileshare'])
        kwargs['history_limit'] = get_repo_history_limit(self.repo.id)

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
        kwargs['user_perm'] = self.user_perm
        kwargs['current_commit'] = self.get_current_commit()
        kwargs['password_set'] = self.password_set
        kwargs['repo_size'] = self.repo_size
        kwargs['dir_list'] = self.dir_list
        kwargs['file_list'] = self.file_list
        kwargs['path'] = self.path
        kwargs['zipped'] = self.zipped
        return kwargs

def render_recycle_root(request, repo_id):
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    days = show_delete_days(request)

    try:
        deleted_entries = seafserv_threaded_rpc.get_deleted(repo_id, days)
    except:
        deleted_entries = []

    dir_list = []
    file_list = []
    for dirent in deleted_entries:
        if stat.S_ISDIR(dirent.mode):
            dir_list.append(dirent)
        else:
            file_list.append(dirent)

    # Entries sort by deletion time in descending order.
    dir_list.sort(lambda x, y : cmp(y.delete_time,
                                    x.delete_time))
    file_list.sort(lambda x, y : cmp(y.delete_time,
                                     x.delete_time))

    return render_to_response('repo_recycle_view.html', {
            'show_recycle_root': True,
            'repo': repo,
            'dir_list': dir_list,
            'file_list': file_list,
            'days': days,
            }, context_instance=RequestContext(request))

def render_recycle_dir(request, repo_id, commit_id):
    basedir = request.GET.get('base', '')
    path = request.GET.get('p', '')
    if not basedir or not path:
        return render_recycle_root(request, repo_id)

    if basedir[0] != '/':
        basedir = '/' + basedir
    if path[-1] != '/':
        path += '/'

    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    commit = seafserv_threaded_rpc.get_commit(commit_id)
    if not commit:
        raise Http404

    zipped = gen_path_link(path, '')
    file_list, dir_list = get_repo_dirents(request, repo_id, commit, basedir + path)

    days = show_delete_days(request)

    return render_to_response('repo_recycle_view.html', {
            'show_recycle_root': False,
            'repo': repo,
            'zipped': zipped,
            'dir_list': dir_list,
            'file_list': file_list,
            'commit_id': commit_id,
            'basedir': basedir,
            'path': path,
            'days': days,
            }, context_instance=RequestContext(request))

@login_required
@ctx_switch_required
def repo_recycle_view(request, repo_id):
    if get_user_permission(request, repo_id) != 'rw':
        return render_permission_error(request, _(u'Unable to view recycle page'))

    commit_id = request.GET.get('commit_id', '')
    if not commit_id:
        return render_recycle_root(request, repo_id)
    else:
        return render_recycle_dir(request, repo_id, commit_id)

@login_required
@ctx_switch_required
def repo_save_settings(request):
    if request.method == 'POST':
        content_type = 'application/json; charset=utf-8'

        form = RepoSettingForm(request.POST)
        if form.is_valid():
            repo_id = form.cleaned_data['repo_id']
            days = form.cleaned_data['days']

            res = set_repo_history_limit(repo_id, days)
            if res == 0:
                messages.success(request, _(u'Settings saved.'))
                return HttpResponse(json.dumps({'success': True}), content_type=content_type)
            else:
                return HttpResponse(json.dumps({'error': _(u'Failed to save settings on server')}),
                        status=400, content_type=content_type)
        else:
            return HttpResponse(json.dumps({'error': str(form.errors.values()[0])}),
                    status=400, content_type=content_type)

def upload_error_msg (code):
    err_msg = _(u'Internal Server Error')
    if (code == 0):
        err_msg = _(u'Filename contains invalid character')
    elif (code == 1):
        err_msg = _(u'Duplicated filename')
    elif (code == 2):
        err_msg = _(u'File does not exist')
    elif (code == 3):
        err_msg = _(u'File size surpasses the limit')
    elif (code == 4):
        err_msg = _(u'The space of owner is used up, upload failed')
    elif (code == 5):
        err_msg = _(u'An error occurs during file transfer')
    return err_msg

@ctx_switch_required
def upload_file_error(request, repo_id):
    if request.method == 'GET':
        repo = get_repo(repo_id)
        parent_dir = request.GET.get('p')
        filename = request.GET.get('fn', '')
        err = request.GET.get('err')
        if not parent_dir or not err:
            return render_error(request, _(u'Invalid url'))

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
            return render_error(request, _(u'Invalid url'))

        zipped = gen_path_link (target_file, repo.name)

        code = int(err)
        err_msg = upload_error_msg(code)

        return render_to_response('update_file_error.html', {
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
    List library modification histories.
    """
    user_perm = get_user_permission(request, repo_id)
    if not user_perm:
        return render_permission_error(request, _(u'Unable to view library modification'))

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
            'user_perm': user_perm,
            }, context_instance=RequestContext(request))

@login_required
@ctx_switch_required
def repo_view_snapshot(request, repo_id):
    if not access_to_repo(request, repo_id, ''):
        return render_permission_error(request, _(u'Unable to view library snapshots'))

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

    # don't show the current commit
    commits_all = get_commits(repo_id, per_page * (current_page -1) + 1,
                              per_page + 2)
    commits = commits_all[:per_page]

    if len(commits_all) == per_page + 1:
        page_next = True
    else:
        page_next = False

    return render_to_response('repo_view_snapshot.html', {
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
        return render_permission_error(request, _(u'You have no permission to restore library'))

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
        return render_error(request, _(u'Please specify history ID'))

    try:
        seafserv_threaded_rpc.revert_on_server(repo_id, commit_id, request.user.username)
    except SearpcError, e:
        if e.msg == 'Bad arguments':
            return render_error(request, _(u'Invalid arguments'))
        elif e.msg == 'No such repo':
            return render_error(request, _(u'Library does not exist'))
        elif e.msg == "Commit doesn't exist":
            return render_error(request, _(u'History you specified does not exist'))
        else:
            return render_error(request, _(u'Unknown error'))

    return HttpResponseRedirect(reverse(repo_history, args=[repo_id]))

def fpath_to_link(repo_id, path, is_dir=False):
    """Translate file path of a repo to its view link"""
    if is_dir:
        url = reverse("repo", args=[repo_id])
    else:
        url = reverse("repo_view_file", args=[repo_id])

    href = url + '?p=/%s' % urllib2.quote(path.encode('utf-8'))

    return '<a href="%s">%s</a>' % (href, path)

def get_diff(repo_id, arg1, arg2):
    lists = {'new' : [], 'removed' : [], 'renamed' : [], 'modified' : [], \
                 'newdir' : [], 'deldir' : []}

    diff_result = seafserv_threaded_rpc.get_diff(repo_id, arg1, arg2)
    if not diff_result:
        return lists

    for d in diff_result:
        if d.status == "add":
            lists['new'].append(fpath_to_link(repo_id, d.name))
        elif d.status == "del":
            lists['removed'].append(d.name)
        elif d.status == "mov":
            lists['renamed'].append(d.name + " ==> " + fpath_to_link(repo_id, d.new_name))
        elif d.status == "mod":
            lists['modified'].append(fpath_to_link(repo_id, d.name))
        elif d.status == "newdir":
            lists['newdir'].append(fpath_to_link(repo_id, d.name, is_dir=True))
        elif d.status == "deldir":
            lists['deldir'].append(d.name)

    return lists

@login_required
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

    if repo.encrypted and not is_passwd_set(repo_id, request.user.username):
        return HttpResponse(json.dumps(changes),
                            content_type=content_type)

    commit_id = request.GET.get('commit_id', '')
    if not commit_id:
        return HttpResponse(json.dumps(changes),
                            content_type=content_type)

    changes = get_diff(repo_id, '', commit_id)

    if get_commit(commit_id).parent_id is None:
        # A commit is a first commit only if it's parent id is None.
        changes['init_commit'] = True
        changes['cmt_desc'] = repo.desc
    else:
        changes['init_commit'] = False
    
    return HttpResponse(json.dumps(changes), content_type=content_type)

@login_required
def modify_token(request, repo_id):
    if not validate_owner(request, repo_id):
        return HttpResponseRedirect(reverse('repo', args=[repo_id]))

    token = request.POST.get('token', '')
    if token:
        seafserv_threaded_rpc.set_repo_token(repo_id, token)

    return HttpResponseRedirect(reverse('repo', args=[repo_id]))

@login_required
def repo_remove(request, repo_id):
    repo = get_repo(repo_id)
    if not repo:
        return render_error(request, _(u'Library does not exist'))
        
    user = request.user.username
    org, base_template = check_and_get_org_by_repo(repo_id, user)
    if org:
        # Remove repo in org context, only repo owner or org staff can
        # perform this operation.
        if request.user.is_staff or org.is_staff or \
                is_org_repo_owner(org.org_id, repo_id, user):
            # Must get related useres before remove the repo
            usernames = get_related_users_by_org_repo(org.org_id, repo_id)
            remove_repo(repo_id)
            repo_deleted.send(sender=None,
                              org_id=org.org_id,
                              usernames=usernames,
                              repo_owner=user,
                              repo_id=repo_id,
                              repo_name=repo.name,
                          )
        else:
            err_msg = _(u'Failed to remove library. Only staff or owner can perform this operation.')
            return render_permission_error(request, err_msg)
    else:
        # Remove repo in personal context, only repo owner or site staff can
        # perform this operation.
        if validate_owner(request, repo_id) or request.user.is_staff:
            usernames = get_related_users_by_repo(repo_id)
            remove_repo(repo_id)
            repo_deleted.send(sender=None,
                              org_id=-1,
                              usernames=usernames,
                              repo_owner=user,
                              repo_id=repo_id,
                              repo_name=repo.name,
                          )
        else:
            err_msg = _(u'Failed to remove library. Only staff or owner can perform this operation.')
            return render_permission_error(request, err_msg)

    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = settings.SITE_ROOT
    return HttpResponseRedirect(next)
    
@login_required
def myhome(request):
    owned_repos = []

    email = request.user.username

    quota = seafserv_threaded_rpc.get_user_quota(email)

    quota_usage = 0
    share_usage = 0
    my_usage = 0
    my_usage = seafserv_threaded_rpc.get_user_quota_usage(email)
    if CALC_SHARE_USAGE:
        try:
            share_usage = seafserv_threaded_rpc.get_user_share_usage(email)
        except SearpcError, e:
            share_usage = 0
        quota_usage = my_usage + share_usage
    else:
        quota_usage = my_usage

    # Get all personal groups I joined.
    joined_groups = get_personal_groups_by_user(request.user.username)

    # Personal repos that I owned.
    owned_repos = seafserv_threaded_rpc.list_owned_repos(email)
    calculate_repo_last_modify(owned_repos)
    owned_repos.sort(lambda x, y: cmp(y.latest_modify, x.latest_modify))
    
    # Personal repos others shared to me
    in_repos = list_personal_shared_repos(email,'to_email', -1, -1)
    # For each group I joined... 
    for grp in joined_groups:
        # Get group repos, and for each group repos...
        for r_id in get_group_repoids(grp.id):
            # No need to list my own repo
            if is_repo_owner(email, r_id):
                continue
            # Convert repo properties due to the different collumns in Repo
            # and SharedRepo
            r = get_repo(r_id)
            if not r:
                continue
            r.repo_id = r.id
            r.repo_name = r.name
            r.repo_desc = r.desc
            last_commit = get_commits(r_id, 0, 1)[0]
            r.last_modified = last_commit.ctime if last_commit else 0
            r.share_type = 'group'
            r.user = get_repo_owner(r_id)
            r.user_perm = check_permission(r_id, email)
            in_repos.append(r)
    in_repos.sort(lambda x, y: cmp(y.last_modified, x.last_modified))

    # user notifications
    grpmsg_list = []
    grpmsg_reply_list = []
    orgmsg_list = []
    notes = UserNotification.objects.filter(to_user=request.user.username)
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

    # get nickname
    profiles = Profile.objects.filter(user=request.user.username)
    nickname = profiles[0].nickname if profiles else ''

    if request.cloud_mode:
        allow_public_share = False
        # In cloud mode, list joined groups and registered contacts for
        # autocompletion.
        autocomp_groups = joined_groups
        contacts = [ c for c in Contact.objects.filter(user_email=email) \
                         if is_registered_user(c.contact_email) ]
    else:
        allow_public_share = True

        # Clear org messages just in case. Should never happen in production
        # environment.
        orgmsg_list = []        
        
        # List all personal groups and all registered users for autocompletion.
        autocomp_groups = get_personal_groups(-1, -1)
        contacts = []
        for u in get_emailusers(-1, -1):
            if u.email == request.user.username:
                continue
            u.contact_email = u.email
            contacts.append(u)

    # events
    if EVENTS_ENABLED:
        events = True
    else:
        events = None

    starred_files = get_starred_files(request.user.username)

    return render_to_response('myhome.html', {
            "nickname": nickname,
            "owned_repos": owned_repos,
            "quota": quota,
            "quota_usage": quota_usage,
            "CALC_SHARE_USAGE": CALC_SHARE_USAGE,
            "share_usage": share_usage,
            "my_usage": my_usage,
            "in_repos": in_repos,
            "contacts": contacts,
            "joined_groups": joined_groups,
            "autocomp_groups": autocomp_groups,
            "notes": notes,
            "grpmsg_list": grpmsg_list,
            "grpmsg_reply_list": grpmsg_reply_list,
            "orgmsg_list": orgmsg_list,
            "create_shared_repo": False,
            "allow_public_share": allow_public_share,
            "events": events,
            "starred_files": starred_files,
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
    
    form = SharedRepoCreateForm(request.POST)
    if form.is_valid():
        repo_name = form.cleaned_data['repo_name']
        repo_desc = form.cleaned_data['repo_desc']
        permission = form.cleaned_data['permission']
        passwd = form.cleaned_data['passwd']
        user = request.user.username

        try:
            # create a repo 
            repo_id = seafserv_threaded_rpc.create_repo(repo_name, repo_desc,
                                                        user, passwd)
            # set this repo as inner pub
            seafserv_threaded_rpc.set_inner_pub_repo(repo_id, permission)
        except:
            repo_id = None
        if not repo_id:
            result['error'] = _(u'Failed to create library')
        else:
            result['success'] = True
            repo_created.send(sender=None,
                              org_id=-1,
                              creator=user,
                              repo_id=repo_id,
                              repo_name=repo_name)

        return HttpResponse(json.dumps(result), content_type=content_type)
    else:
        return HttpResponseBadRequest(json.dumps(form.errors),
                                      content_type=content_type)

@login_required
def unset_inner_pub_repo(request, repo_id):
    try:
        unset_inner_pub_repo(repo_id)
        messages.success(request, _('Operation successful'))
    except SearpcError:
        messages.error(request, _('Operation failed'))

    return HttpResponseRedirect(reverse('share_admin'))

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
    if get_user_permission(request, repo_id) != 'rw':
        return render_permission_error(request, _('Failed to delete file.'))

    parent_dir = request.GET.get("p", "/")
    file_name = request.GET.get("file_name")
    user = request.user.username
    try:
        seafserv_threaded_rpc.del_file(repo_id, parent_dir,file_name, user)
        messages.success(request, _(u'%s successfully deleted.') % file_name)
    except:
        messages.error(request, _(u'Internal error. Failed to delete %s.') % file_name)

    url = reverse('repo', args=[repo_id]) + ('?p=%s' % urllib2.quote(parent_dir.encode('utf-8')))
    return HttpResponseRedirect(url)

@ctx_switch_required
def repo_view_file(request, repo_id):
    """
    Preview file on web, including files in current worktree and history.
    """
    repo = get_repo(repo_id)
    if not repo:
        raise Http404
    
    http_server_root = get_httpserver_root()
    path = request.GET.get('p', '/')
    u_filename = os.path.basename(path)
    filename = urllib2.quote(u_filename.encode('utf-8'))
    comment_open = request.GET.get('comment_open', '')
    page_from = request.GET.get('from', '')

    commit_id = request.GET.get('commit_id', '')
    view_history = True if commit_id else False
    current_commit = seafserv_threaded_rpc.get_commit(commit_id)
    if not current_commit:
        current_commit = get_commits(repo_id, 0, 1)[0]

    basedir = ''
    days = 0
    if page_from == 'recycle':
        basedir = request.GET.get('base', '')
        if not basedir:
            raise Http404
        days = show_delete_days(request)

    if view_history:
        obj_id = request.GET.get('obj_id', '')
    else:
        try:
            obj_id = seafserv_threaded_rpc.get_file_id_by_path(repo_id, path)
        except:
            obj_id = None

    if not obj_id:
        return render_error(request, _(u'File does not exist'))

    if repo.encrypted and not is_passwd_set(repo_id, request.user.username):
        # Redirect uesr to decrypt repo page.
        return render_to_response('decrypt_repo_form.html', {
                'repo': repo,
                'next': request.get_full_path(),
                }, context_instance=RequestContext(request))
    permission = get_user_permission(request, repo_id)
    if permission:
        # Get a token to visit file
        token = seafserv_rpc.web_get_access_token(repo_id,
                                                  obj_id,
                                                  'view',
                                                  request.user.username)
    else:
        return render_permission_error(request, _(u'Unable to view file'))

    read_only = True if permission == 'r' else False

    # generate path and link
    if page_from == 'recycle':
        zipped = gen_path_link(path, '')
    else:
        zipped = gen_path_link(path, repo.name)

    # determin whether file can preview on web
    filetype, fileext = valid_previewed_file(filename)
        
    # raw path
    raw_path = gen_file_get_url(token, filename)
   
    # get file content
    err, file_content, swf_exists, filetype = get_file_content(filetype, raw_path, obj_id, fileext)

    img_prev = None
    img_next = None
    if filetype == 'Image' and not view_history:
        parent_dir = os.path.dirname(path)
        try:
            dirs = seafserv_threaded_rpc.list_dir_by_path(current_commit.id, parent_dir.encode('utf-8'))
        except SearpcError, e:
            raise Http404

        img_list = []
        for dirent in dirs:
            if not stat.S_ISDIR(dirent.props.mode):
                fltype, flext = valid_previewed_file(dirent.obj_name)
                if fltype == 'Image':
                    img_list.append(dirent.obj_name)

        if len(img_list) > 1:
            img_list.sort(lambda x, y : cmp(x.lower(), y.lower()))
            cur_img_index = img_list.index(u_filename) 
            if cur_img_index != 0:
                img_prev = os.path.join(parent_dir, img_list[cur_img_index - 1])
            if cur_img_index != len(img_list) - 1:
                img_next = os.path.join(parent_dir, img_list[cur_img_index + 1])

    if view_history:
        return render_to_response('history_file_view.html', {
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
                'err': err,
                'file_content': file_content,
                'swf_exists': swf_exists,
                'DOCUMENT_CONVERTOR_ROOT': DOCUMENT_CONVERTOR_ROOT,
                'page_from': page_from,
                'basedir': basedir,
                'days': days,
                }, context_instance=RequestContext(request))
    
    # file share link
    l = FileShare.objects.filter(repo_id=repo_id).filter(\
        username=request.user.username).filter(path=path)
    fileshare = l[0] if len(l) > 0 else None

    http_or_https = request.is_secure() and 'https' or 'http'
    domain = RequestSite(request).domain
    if fileshare:
        file_shared_link = gen_shared_link(request, fileshare.token, 'f')
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
            
    file_path_hash = md5_constructor(urllib2.quote(path.encode('utf-8'))).hexdigest()[:12]            
    comments = FileComment.objects.filter(file_path_hash=file_path_hash, repo_id=repo_id)

    contributors, last_modified, last_commit_id = get_file_contributors(repo_id, path.encode('utf-8'), file_path_hash, obj_id)
    latest_contributor = contributors[0] if contributors else None

    if len(groups) > 1:
        ctx = {}
        ctx['groups'] = groups
        repogrp_str = render_to_string("snippets/repo_group_list.html", ctx)
    else:
        repogrp_str = '' 

    is_starred = False
    org_id = -1
    if request.user.org:
        org_id = request.user.org['org_id']
    is_starred = is_file_starred(request.user.username, repo.id, path.encode('utf-8'), org_id)

    user_perm = get_user_permission(request, repo_id)
        
    return render_to_response('file_view.html', {
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
            'comment_open':comment_open,
            'swf_exists': swf_exists,
            'DOCUMENT_CONVERTOR_ROOT': DOCUMENT_CONVERTOR_ROOT,
            'contributors': contributors,
            'latest_contributor': latest_contributor,
            'last_modified': last_modified,
            'last_commit_id': last_commit_id,
            'read_only': read_only,
            'page_from': page_from,
            'repo_group_str': repogrp_str,
            'is_starred': is_starred,
            'user_perm': user_perm,
            'img_prev': img_prev,
            'img_next': img_next,
            }, context_instance=RequestContext(request))

def file_comment(request):
    if request.method == 'POST':
        # handle post request to leave comment on a file
        content_type = 'application/json; charset=utf-8'
        path = request.GET.get('p', '');
        
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

            # Get repo groups
            org, base_template = check_and_get_org_by_repo(repo_id,
                                                           request.user.username)
            if org:
                repo_shared_groups = get_org_groups_by_repo(org.org_id,
                                                            repo_id)
            else:
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

            comments = FileComment.objects.filter(file_path_hash=file_path_hash,
                                                  repo_id=repo_id)
            html = render_to_string("file_comments.html", {
                    'comments':comments})
            return HttpResponse(json.dumps({'html': html}),
                                content_type=content_type)
    
   
def repo_file_get(raw_path):
    err = ''
    file_content = ''
    encoding = ''
    try:
        file_response = urllib2.urlopen(raw_path)
        if long(file_response.headers['Content-Length']) > FILE_PREVIEW_MAX_SIZE:
            err = _(u'File size surpasses 10M, can not be previewed online.')
            return err, '', ''
        else:
            content = file_response.read()
    except urllib2.HTTPError, e:
        err = _(u'HTTPError: failed to open file online')
        return err, '', ''
    except urllib2.URLError as e:
        err = _(u'URLError: failed to open file online')
        return err, '', ''
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
                err = _(u'Unknown file encoding')
                return err, '', ''

        file_content = u_content

    return err, file_content, encoding

def get_file_content(filetype, raw_path, obj_id, fileext):
    err = ''
    file_content = ''
    swf_exists = False

    if filetype == 'Image':
        img = Image.open(StringIO(urllib2.urlopen(raw_path).read()))
        file_content = {}
        file_content['img_w'], file_content['img_h'] = img.size

    if filetype == 'Text' or filetype == 'Markdown' or filetype == 'Sf':
        err, file_content, encoding = repo_file_get(raw_path)
    elif filetype == 'Document':
        if DOCUMENT_CONVERTOR_ROOT:
            err, swf_exists = flash_prepare(raw_path, obj_id, fileext)
        else:
            filetype = 'Unknown'
    elif filetype == 'PDF':
        if USE_PDFJS:
            # use pdfjs to preview PDF
            pass
        elif DOCUMENT_CONVERTOR_ROOT:
            # use flash to prefiew PDF
            err, swf_exists = flash_prepare(raw_path, obj_id, fileext)
        else:
            # can't preview PDF
            filetype = 'Unknown'
    
    return err, file_content, swf_exists, filetype

def file_edit_submit(request, repo_id):
    content_type = 'application/json; charset=utf-8'
    def error_json(error_msg=_(u'Internal Error'), op=None):
        return HttpResponse(json.dumps({'error': error_msg, 'op': op}),
                            status=400,
                            content_type=content_type)

    if get_user_permission(request, repo_id) != 'rw':
        return error_json(_(u'Permission denied'))
        
    repo = get_repo(repo_id)
    if not repo:
        return error_json(_(u'The library does not exist.'))
    if repo.encrypted:
        repo.password_set = seafserv_rpc.is_passwd_set(repo_id, request.user.username)
        if not repo.password_set:
            return error_json(_(u'The library is encrypted.'), 'decrypt')

    content = request.POST.get('content')
    encoding = request.POST.get('encoding')
    path = request.GET.get('p')
    if content is None or not path or encoding not in ["gbk", "utf-8"]:
        return error_json(_(u'Invalid arguments'))
    head_id = request.GET.get('head', None)

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
        seafserv_threaded_rpc.put_file(repo_id, tmpfile, parent_dir,
                                 filename, request.user.username, head_id)
        remove_tmp_file()
        return HttpResponse(json.dumps({'status': 'ok'}), content_type=content_type)
    except SearpcError, e:
        remove_tmp_file()
        return error_json(str(e))


@login_required
@ctx_switch_required
def file_edit(request, repo_id):
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    if request.method == 'POST':
        return file_edit_submit(request, repo_id)

    if get_user_permission(request, repo_id) != 'rw':
        return render_permission_error(request, _(u'Unable to edit file'))

    path = request.GET.get('p', '/')
    if path[-1] == '/':
        path = path[:-1]
    u_filename = os.path.basename(path)
    filename = urllib2.quote(u_filename.encode('utf-8'))

    head_id = repo.head_cmmt_id

    try:
        obj_id = seafserv_threaded_rpc.get_file_id_by_path(repo_id, path)
    except:
        obj_id = None
    if not obj_id:
        return render_error(request, _(u'The file does not exist.'))

    if access_to_repo(request, repo_id, ''):
        token = seafserv_rpc.web_get_access_token(repo_id, obj_id,
                                                  'view', request.user.username)
    else:
        return render_permission_error(request, _(u'Unable to view file'))

    # generate path and link
    zipped = gen_path_link(path, repo.name)

    filetype, fileext = valid_previewed_file(filename)

    op = None
    err = ''
    file_content = None
    encoding = ''
    if filetype == 'Text' or filetype == 'Markdown' or filetype == 'Sf': 
        if repo.encrypted:
            repo.password_set = seafserv_rpc.is_passwd_set(repo_id, request.user.username)
            if not repo.password_set:
                op = 'decrypt'
        if not op:
            raw_path = gen_file_get_url(token, filename)
            err, file_content, encoding = repo_file_get(raw_path)
    else:
        err = _(u'Edit online is not offered for this type of file.')

    return render_to_response('file_edit.html', {
        'repo':repo,
        'u_filename':u_filename,
        'path':path,
        'zipped':zipped,
        'filetype':filetype,
        'fileext':fileext,
        'op':op,
        'err':err,
        'file_content':file_content,
        'encoding': encoding,
        'head_id': head_id,
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
        return render_permission_error(request, _(u'Unable to access file'))

    redirect_url = gen_file_get_url(token, file_name)
    return HttpResponseRedirect(redirect_url)

def get_repo_download_url(request, repo_id):
    repo = seafserv_threaded_rpc.get_repo(repo_id)    
    repo_name = repo.props.name
    quote_repo_name = quote(repo_name.encode('utf-8'))
    encrypted = repo.props.encrypted
    if encrypted:
        enc = '1'
    else:
        enc = ''
    relay_id = get_session_info().id
    if not relay_id:
        return '', _(u"Failed to download library, unable to find server")

    try:
        token = seafserv_threaded_rpc.get_repo_token_nonnull \
                (repo_id, request.user.username)
    except Exception, e:
        return '', str(e)

    addr, port = get_ccnet_server_addr_port ()

    if not (addr and port):
        return '', _(u"Invalid server setting")

    ccnet_applet_root = get_ccnetapplet_root()
    email = urllib2.quote(request.user.username)

    url = ccnet_applet_root + "/repo/download/"
    
    url += "?relay_id=%s&relay_addr=%s&relay_port=%s" % (relay_id, addr, port)
    url += "&email=%s&token=%s" % (email, token)
    url += "&repo_id=%s&repo_name=%s" % (repo_id, quote_repo_name)
    if enc:
        url += "&encrypted=1&magic=%s" % repo.magic

    return url, ''
 
@login_required
def repo_download(request):
    repo_id = request.GET.get('repo_id', '')

    download_url, err = get_repo_download_url(request, repo_id)
    if err:
        return render_to_response('error.html', {
            "error_msg": err
        }, context_instance=RequestContext(request))

    return HttpResponseRedirect(download_url)

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

    # check file path
    if len(dst_path+obj_name) > settings.MAX_PATH:
        messages.error(request, _('Destination path is too long.'))
        url = reverse('repo', args=[src_repo_id]) + ('?p=%s' % urllib2.quote(src_path.encode('utf-8')))
        return HttpResponseRedirect(url)
    
    # check whether user has write permission to dest repo
    if check_permission(dst_repo_id, request.user.username) != 'rw':
        messages.error(request, _('You can not modify that library.'))
        url = reverse('repo', args=[src_repo_id]) + ('?p=%s' % urllib2.quote(src_path.encode('utf-8')))
        return HttpResponseRedirect(url)
        
    # do nothing when dst is the same as src
    if src_repo_id == dst_repo_id and src_path == dst_path:
        url = reverse('repo', args=[src_repo_id]) + ('?p=%s' % urllib2.quote(src_path.encode('utf-8')))
        return HttpResponseRedirect(url)

    # Error when moving/copying a dir to its subdir
    if obj_type == 'dir':
        src_dir = os.path.join(src_path, obj_name)
        if dst_path.startswith(src_dir):
            error_msg = _(u'Can not %(op)s directory %(src)s to its subdirectory %(des)s') \
                        % {'op': _(u"copy") if op == 'cp' else _(u"move"),
                           'src': src_dir,
                           'des': dst_path}
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
            messages.success(request, _(u'Successfully copying %(name)s：<a href="%(url)s">view</a>') % \
                                 {"name":obj_name, "url":msg_url})
        elif op == 'mv':
            seafserv_threaded_rpc.move_file (src_repo_id, src_path, obj_name,
                                             dst_repo_id, dst_path, new_obj_name,
                                             request.user.username)
            messages.success(request, _(u'Successfully moving %(name)s <a href="%(url)s">view</a>') % \
                                 {"name":obj_name, "url":msg_url})
    except Exception, e:
        return render_error(request, str(e))

    url = reverse('repo', args=[src_repo_id]) + ('?p=%s' % urllib2.quote(src_path.encode('utf-8')))

    return HttpResponseRedirect(url)

@login_required
def seafile_access_check(request):
    repo_id = request.GET.get('repo_id', '')
    applet_root = get_ccnetapplet_root()
    download_url, err = get_repo_download_url (request, repo_id)
    if err:
        return render_to_response('error.html', {
            "error_msg": err
        }, context_instance=RequestContext(request))
    
    return render_to_response(
        'seafile_access_check.html', {
            'repo_id': repo_id,
            'applet_root': applet_root,
            'download_url': download_url,
        },
        context_instance=RequestContext(request))

    
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
            repo.owner = get_repo_owner(repo.id)
            
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
    if request.method == 'POST':
        result = {}
        content_type = 'application/json; charset=utf-8'

        f = SetUserQuotaForm(request.POST)
        if f.is_valid():
            email = f.cleaned_data['email']
            quota_mb = f.cleaned_data['quota']
            quota = quota_mb * (1 << 20)

            try:
                seafserv_threaded_rpc.set_user_quota(email, quota)
            except:
                result['error'] = _(u'Failed to set quota: internal error')
                return HttpResponse(json.dumps(result), content_type=content_type)

            result['success'] = True
            return HttpResponse(json.dumps(result), content_type=content_type)
        else:
            result['error'] = str(f.errors.values()[0])
            return HttpResponse(json.dumps(result), content_type=content_type)

    owned_repos = []

    owned_repos = seafserv_threaded_rpc.list_owned_repos(email)

    quota = seafserv_threaded_rpc.get_user_quota(email)
    quota_usage = 0
    share_usage = 0
    my_usage = 0
    my_usage = seafserv_threaded_rpc.get_user_quota_usage(email)
    if CALC_SHARE_USAGE:
        try:
            share_usage = seafserv_threaded_rpc.get_user_share_usage(email)
        except SearcpError, e:
            share_usage = 0
        quota_usage = my_usage + share_usage
    else:
        quota_usage = my_usage

    # Repos that are share to user
    in_repos = seafserv_threaded_rpc.list_share_repos(email, 'to_email',
                                                      -1, -1)

    # get nickname
    if not Profile.objects.filter(user=email):
        nickname = ''
    else:
        profile = Profile.objects.filter(user=email)[0]
        nickname = profile.nickname
    
    return render_to_response(
        'userinfo.html', {
            'owned_repos': owned_repos,
            'quota': quota,
            'quota_usage': quota_usage,
            'CALC_SHARE_USAGE': CALC_SHARE_USAGE,
            'share_usage': share_usage,
            'my_usage': my_usage,
            'in_repos': in_repos,
            'email': email,
            'nickname': nickname,
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
        'site_name': settings.SITE_NAME,
        }
    send_mail(_(u'Password Reset'), t.render(Context(c)),
              None, [email], fail_silently=False)
    
@login_required
@sys_staff_required
def user_reset(request, user_id):
    """Reset password for user."""
    try:
        user = User.objects.get(id=int(user_id))
        user.set_password(INIT_PASSWD)
        user.save()

        if IS_EMAIL_CONFIGURED:
            if SEND_EMAIL_ON_RESETTING_USER_PASSWD:
                try:
                    send_user_reset_email(request, user.email, INIT_PASSWD)
                    msg = _('Successfully resetted password to %(passwd)s, an email has been sent to %(user)s.') % \
                        {'passwd': INIT_PASSWD, 'user': user.email}
                    messages.success(request, msg)
                except Exception, e:
                    logger.error(str(e))
                    msg = _('Successfully resetted password to %(passwd)s, but failed to send email to %(user)s, please check your email configuration.') % \
                        {'passwd':INIT_PASSWD, 'user': user.email}
                    messages.success(request, msg)
            else:
                messages.success(request, _(u'Successfully resetted password to %(passwd)s for user %(user)s.') % \
                                     {'passwd':INIT_PASSWD,'user': user.email})
        else:
            messages.success(request, _(u'Successfully resetted password to %(passwd)s for user %(user)s. But email notification can not be sent, because Email service is not properly configured.') % \
                                 {'passwd':INIT_PASSWD,'user': user.email})
    except User.DoesNotExist:
        msg = _(u'Failed to reset password: user does not exist')
        messages.error(request, msg)

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
        'site_name': settings.SITE_NAME,
        }
    send_mail(_(u'Seafile Registration Information'), t.render(Context(c)),
              None, [email], fail_silently=False)

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

            user = User.objects.create_user(email, password, is_staff=False,
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
                if IS_EMAIL_CONFIGURED:
                    if SEND_EMAIL_ON_ADDING_SYSTEM_MEMBER:
                        try:
                            send_user_add_mail(request, email, password)
                            messages.success(request, _(u'Successfully added user %s. An email notification has been sent.') % email)
                        except Exception, e:
                            logger.error(str(e))
                            messages.success(request, _(u'Successfully added user %s. An error accurs when sending email notification, please check your email configuration.') % email)
                    else:
                        messages.success(request, _(u'Successfully added user %s.') % email)
                else:
                    messages.success(request, _(u'Successfully added user %s. But email notification can not be sent, because Email service is not properly configured.') % email)

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

@login_required
def file_upload_progress_page(request):
    '''
    As iframe in repo_upload_file.html, for solving problem in chrome.

    '''
    uuid = request.GET.get('uuid', '')
    httpserver_root = get_httpserver_root()
    upload_progress_con_id = request.GET.get('upload_progress_con_id', '')
    return render_to_response('file_upload_progress_page.html', {
            'uuid': uuid,
            'httpserver_root': httpserver_root,
            'upload_progress_con_id': upload_progress_con_id,
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
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    if get_user_permission(request, repo_id) != 'rw':
        result['error'] = _('Permission denied')
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    new_dir_name = check_filename_with_rename(repo_id, parent_dir, new_dir_name)

    try:
        seafserv_threaded_rpc.post_dir(repo_id, parent_dir, new_dir_name, user)
    except Exception, e:
        result['error'] = str(e)
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)
        
    url = reverse('repo', args=[repo_id]) + \
        ('?p=%s' % urllib2.quote(parent_dir.encode('utf-8')))
    return HttpResponse(json.dumps({'success': True}), content_type=content_type)
    
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
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    if get_user_permission(request, repo_id) != 'rw':
        result['error'] = _('Permission denied')
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)
        
    new_file_name = check_filename_with_rename(repo_id, parent_dir,
                                               new_file_name)

    try:
        seafserv_threaded_rpc.post_empty_file(repo_id, parent_dir,
                                              new_file_name, user)
    except Exception, e:
        result['error'] = str(e)
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)
        
    url = reverse('repo', args=[repo_id]) + \
        ('?p=%s' % urllib2.quote(parent_dir.encode('utf-8')))
    return HttpResponse(json.dumps({'success': True}), content_type=content_type)

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
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    if get_user_permission(request, repo_id) != 'rw':
        result['error'] = _('Permission denied')
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    if newname == oldname:
        return HttpResponse(json.dumps({'success': True}),
                            content_type=content_type)

    newname = check_filename_with_rename(repo_id, parent_dir, newname)

    try:
        seafserv_threaded_rpc.rename_file (repo_id, parent_dir,
                                           oldname, newname, user)
        messages.success(request, _(u'Successfully renamed %(old)s to %(new)s') % \
                             {"old":oldname, "new":newname})
    except Exception, e:
        result['error'] = str(e)
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    url = reverse('repo', args=[repo_id]) + \
        ('?p=%s' % urllib2.quote(parent_dir.encode('utf-8')))
    return HttpResponse(json.dumps({'success': True}), content_type=content_type)

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
            result['error'] = _(u"Failed to create library")
        else:
            result['success'] = True
            repo_created.send(sender=None,
                              org_id=-1,
                              creator=user,
                              repo_id=repo_id,
                              repo_name=repo_name)
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
        error_msg = _(u"Library does not exist")
        return render_error(request, error_msg)

    filetype = valid_previewed_file(u_filename)[0].lower()
    if filetype == 'text' or filetype == 'markdown':
        can_compare = True
    else:
        can_compare = False

    try:
        commits = seafserv_threaded_rpc.list_file_revisions(repo_id, path, 0)
    except SearpcError, e:
        return render_error(request, e.msg)

    if not commits:
        return render_error(request)
        
    # Check whether user is repo owner
    if validate_owner(request, repo_id):
        is_owner = True
    else:
        is_owner = False

    try:
        for commit in commits:
            file_id, file_size = get_file_revision_id_size (commit.id, path)
            if not file_id or file_size is None:
                # do not use 'not file_size', since it's ok to have file_size = 0
                return render_error(request)
            commit.revision_file_size = file_size
            commit.file_id = file_id
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
        'can_compare': can_compare,
        }, context_instance=RequestContext(request))

@login_required
def repo_revert_file (request, repo_id):
    commit_id = request.GET.get('commit')
    path      = request.GET.get('p')
    from_page = request.GET.get('from')

    if not (commit_id and path and from_page):
        return render_error(request, _(u"Invalid arguments"))

    try:
        ret = seafserv_threaded_rpc.revert_file (repo_id, commit_id,
                            path.encode('utf-8'), request.user.username)
    except Exception, e:
        return render_error(request, str(e))
    else:
        if from_page == 'repo_history':
            # When revert file from repo history, we redirect to repo history
            url = reverse('repo', args=[repo_id]) + u'?commit_id=%s&history=y' % commit_id
        elif from_page == 'recycle':
            # When revert from recycle page, redirect to recycle page.
            url = reverse('repo_recycle_view', args=[repo_id])
        else:
            # When revert file from file history, we redirect to parent dir of this file
            parent_dir = os.path.dirname(path)
            url = reverse('repo', args=[repo_id]) + ('?p=%s' % urllib2.quote(parent_dir.encode('utf-8')))

        if ret == 1:
            root_url = reverse('repo', args=[repo_id]) + u'?p=/'
            msg = _(u'Successfully revert %(path)s to <a href="%(root)s">root directory.</a>') % {"path":path.lstrip('/'), "root":root_url}
            messages.add_message(request, messages.INFO, msg)
        else:
            file_view_url = reverse('repo_view_file', args=[repo_id]) + u'?p=' + urllib2.quote(path.encode('utf-8'))
            msg = _(u'Successfully revert <a href="%(url)s">%(path)s</a>') % {"url":file_view_url, "path":path.lstrip('/')}
            messages.add_message(request, messages.INFO, msg)
        return HttpResponseRedirect(url)

@login_required
def repo_revert_dir (request, repo_id):
    commit_id = request.GET.get('commit')
    path      = request.GET.get('p')

    if not (commit_id and path):
        return render_error(request, _(u"Invalid arguments"))

    try:
        ret = seafserv_threaded_rpc.revert_dir (repo_id, commit_id,
                            path.encode('utf-8'), request.user.username)
    except Exception, e:
        return render_error(request, str(e))
    else:
        url = reverse('repo_recycle_view', args=[repo_id])

        if ret == 1:
            root_url = reverse('repo', args=[repo_id]) + u'?p=/'
            msg = _(u'Successfully revert %(path)s to <a href="%(url)s">root directory.</a>') % {"path":path.lstrip('/'), "url":root_url}
            messages.add_message(request, messages.INFO, msg)
        else:
            dir_view_url = reverse('repo', args=[repo_id]) + u'?p=' + urllib2.quote(path.encode('utf-8'))
            msg = _(u'Successfully revert <a href="%(url)s">%(path)s</a>') % {"url":dir_view_url, "path":path.lstrip('/')}
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
    elif op != 'download':
        return render_error(request)

    commit_id  = request.GET.get('commit')
    path = request.GET.get('p')

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
    if path[-1] == '/':         # Normalize file path 
        path = path[:-1]
    filename = os.path.basename(path)
    quote_filename = urllib2.quote(filename.encode('utf-8'))

    try:
        obj_id = seafserv_threaded_rpc.get_file_id_by_path(repo_id, path)
    except:
        obj_id = None

    if not obj_id:
        return render_error(request, _(u'File does not exist'))
    
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    access_token = seafserv_rpc.web_get_access_token(repo.id, obj_id,
                                                     'view', '')
    
    filetype, fileext = valid_previewed_file(filename)
    
    # Raw path
    raw_path = gen_file_get_url(access_token, quote_filename)

    # get file content
    err, file_content, swf_exists, filetype = get_file_content(filetype, raw_path, obj_id, fileext)
    
    # Increase file shared link view_cnt, this operation should be atomic
    fileshare = FileShare.objects.get(token=token)
    fileshare.view_cnt = F('view_cnt') + 1
    fileshare.save()
    
    return render_to_response('shared_file_view.html', {
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
            'swf_exists': swf_exists,
            'DOCUMENT_CONVERTOR_ROOT': DOCUMENT_CONVERTOR_ROOT,
            }, context_instance=RequestContext(request))

def view_shared_dir(request, token):
    assert token is not None    # Checked by URLconf

    try:
        fileshare = FileShare.objects.get(token=token)
    except FileShare.DoesNotExist:
        raise Http404

    username = fileshare.username
    repo_id = fileshare.repo_id
    path = request.GET.get('p', '')
    path = fileshare.path if not path else path
    if path[-1] != '/':         # Normalize dir path 
        path += '/'
    
    if not path.startswith(fileshare.path): 
        path = fileshare.path   # Can not view upper dir of shared dir

    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    dir_name = os.path.basename(path[:-1])
    current_commit = get_commits(repo_id, 0, 1)[0]
    file_list, dir_list = get_repo_dirents(request, repo_id, current_commit,
                                           path)
    zipped = gen_path_link(path, '')

    if path == fileshare.path:  # When user view the shared dir..
        # increase shared link view_cnt, 
        fileshare = FileShare.objects.get(token=token)
        fileshare.view_cnt = F('view_cnt') + 1
        fileshare.save()
    
    return render_to_response('view_shared_dir.html', {
            'repo': repo,
            'token': token,
            'path': path,
            'username': username,
            'dir_name': dir_name,
            'file_list': file_list,
            'dir_list': dir_list,
            'zipped': zipped,
            }, context_instance=RequestContext(request))

def view_file_via_shared_dir(request, token):
    assert token is not None    # Checked by URLconf

    try:
        fileshare = FileShare.objects.get(token=token)
    except FileShare.DoesNotExist:
        raise Http404

    username = fileshare.username
    repo_id = fileshare.repo_id
    path = request.GET.get('p', '')
    if not path:
        raise Http404
    
    if not path.startswith(fileshare.path): # Can not view upper dir of shared dir
        raise Http404

    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    file_name = os.path.basename(path)
    quote_filename = urllib2.quote(file_name.encode('utf-8'))
    file_id = get_file_id_by_path(repo_id, path)
    if not file_id:
        return render_error(request, _(u'File does not exist'))

    access_token = seafserv_rpc.web_get_access_token(repo.id, file_id,
                                                     'view', '')
    filetype, fileext = valid_previewed_file(file_name)
    # Raw path
    raw_path = gen_file_get_url(access_token, quote_filename)
    # get file content
    err, file_content, swf_exists, filetype = get_file_content(filetype, raw_path, obj_id, fileext)

    zipped = gen_path_link(path, '')
        
    return render_to_response('shared_file_view.html', {
            'repo': repo,
            'obj_id': file_id,
            'path': path,
            'file_name': file_name,
            'shared_token': token,
            'access_token': access_token,
            'filetype': filetype,
            'fileext': fileext,
            'raw_path': raw_path,
            'username': username,
            'err': err,
            'file_content': file_content,
            'swf_exists': swf_exists,
            'DOCUMENT_CONVERTOR_ROOT': DOCUMENT_CONVERTOR_ROOT,
            'zipped': zipped,
            'token': token,
            }, context_instance=RequestContext(request))
    
def flash_prepare(raw_path, obj_id, doctype):
    curl = DOCUMENT_CONVERTOR_ROOT + 'convert'
    data = {'doctype': doctype,
            'file_id': obj_id,
            'url': raw_path}
    try:
        f = urllib2.urlopen(url=curl, data=urllib.urlencode(data))
    except urllib2.URLError, e:
        return _(u'Internal error'), False
    else:
        ret = f.read()
        ret_dict = json.loads(ret)
        if ret_dict.has_key('error'):
            return ret_dict['error'], False
        else:
            return None, ret_dict['exists']

def demo(request):
    """
    Login as demo account.
    """

    redirect_to = settings.SITE_ROOT

    auth_login(request, authenticate(username='demo@seafile.com',
                                     password='demo'))

    return HttpResponseRedirect(redirect_to)

@login_required
def pubinfo(request):
    """
    Show public information.
    """
    if request.cloud_mode:
        # Users are not allowed to see public information when in cloud mode.
        raise Http404
    else:
        public_repos = list_inner_pub_repos(request.user.username)
        groups = get_personal_groups(-1, -1)
        users = get_emailusers(-1, -1)
        return render_to_response('pubinfo.html', {
                'groups': groups,
                'users': users,
                'public_repos': public_repos,
                'create_shared_repo': True,
                }, context_instance=RequestContext(request))
    
def repo_set_password(request):
    content_type = 'application/json; charset=utf-8'

    form = RepoPassowrdForm(request.POST)
    if form.is_valid():
        return HttpResponse(json.dumps({'success': True}), content_type=content_type)
    else:
        return HttpResponse(json.dumps({'error': str(form.errors.values()[0])}),
                status=400, content_type=content_type)

def get_file_content_by_commit_and_path(request, repo_id, commit_id, path):
    try:
        obj_id = seafserv_threaded_rpc.get_file_id_by_commit_and_path( \
                                        commit_id, path)
    except:
        return None, 'bad path'

    if not obj_id or obj_id == EMPTY_SHA1:
        return '', None
    else:
        permission = get_user_permission(request, repo_id)
        if permission:
            # Get a token to visit file
            token = seafserv_rpc.web_get_access_token(repo_id,
                                                      obj_id,
                                                      'view',
                                                      request.user.username)
        else:
            return None, 'permission denied'

        filename = os.path.basename(path)
        raw_path = gen_file_get_url(token, urllib2.quote(filename))

        try:
            err, file_content, encoding = repo_file_get(raw_path)
        except Exception, e:
            return None, 'error when read file from httpserver: %s' % e
        return file_content, err

@login_required    
def text_diff(request, repo_id):
    commit_id = request.GET.get('commit', '')
    path = request.GET.get('p', '')
    u_filename = os.path.basename(path)

    if not (commit_id and path):
        return render_error(request, 'bad params')
        
    repo = get_repo(repo_id)
    if not repo:
        return render_error(request, 'bad repo')

    current_commit = seafserv_threaded_rpc.get_commit(commit_id)
    if not current_commit:
        return render_error(request, 'bad commit id')

    prev_commit = seafserv_threaded_rpc.get_commit(current_commit.parent_id)
    if not prev_commit:
        return render_error('bad commit id')

    path = path.encode('utf-8')

    current_content, err = get_file_content_by_commit_and_path(request, \
                                    repo_id, current_commit.id, path)
    if err:
        return render_error(request, err)
        
    prev_content, err = get_file_content_by_commit_and_path(request, \
                                    repo_id, prev_commit.id, path)
    if err:
        return render_error(request, err)

    is_new_file = False
    diff_result_table = ''
    if prev_content == '' and current_content == '':
        is_new_file = True
    else:
        diff = HtmlDiff()
        diff_result_table = diff.make_table(prev_content.splitlines(),
                                        current_content.splitlines(), True)

    zipped = gen_path_link(path, repo.name)

    return render_to_response('text_diff.html', {
        'u_filename':u_filename,
        'repo': repo,
        'path': path,
        'zipped': zipped,
        'current_commit': current_commit,
        'prev_commit': prev_commit,
        'diff_result_table': diff_result_table,
        'is_new_file': is_new_file,
    }, context_instance=RequestContext(request))

def i18n(request):
    """
    Set client language preference, lasts for one month

    """
    from django.conf import settings
    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = settings.SITE_ROOT
    
    lang = request.GET.get('lang', 'en')

    res = HttpResponseRedirect(next)
    res.set_cookie(settings.LANGUAGE_COOKIE_NAME, lang, max_age=30*24*60*60)

    return res

@login_required    
def repo_star_file(request, repo_id):
    path = request.POST.get('path')
    state = request.POST.get('state');

    content_type = 'application/json; charset=utf-8'

    if not (path and state):
        return HttpResponse(json.dumps({'error': _(u'Invalid arguments')}),
                            status=400, content_type=content_type)

    org_id = int(request.POST.get('org_id'))
    path = urllib2.unquote(path.encode('utf-8'))
    is_dir = False
    if state == 'unstarred':
        star_file(request.user.username, repo_id, path, is_dir, org_id=org_id)
    else:
        unstar_file(request.user.username, repo_id, path)
    return HttpResponse(json.dumps({'success':True}), content_type=content_type)

def repo_download_dir(request, repo_id):
    repo = get_repo(repo_id)
    if not repo:
        return render_error(request, _(u'Library does not exist'))

    path = request.GET.get('p', '/')
    if path[-1] != '/':         # Normalize dir path
        path += '/'

    if len(path) > 1:
        dirname = os.path.basename(path.rstrip('/')) # Here use `rstrip` to cut out last '/' in path
    else:
        dirname = repo.name
        
    allow_download = False
    fileshare_token = request.GET.get('t', '')
    if fileshare_token:         # download dir from dir shared link
        try:
            fileshare = FileShare.objects.get(token=fileshare_token)
        except FileShare.DoesNotExist:
            raise Http404

        # Can not download upper dir of shared dir.
        allow_download = True if path.startswith(fileshare.path) else False
    else:
        allow_download = True if get_user_permission(request, repo_id) else False

    if allow_download:
        dir_id = seafserv_threaded_rpc.get_dirid_by_path (repo.head_cmmt_id,
                                                          path.encode('utf-8'))

        try:
            total_size = seafserv_threaded_rpc.get_dir_size(dir_id)
        except Exception, e:
            logger.error(str(e))
            return render_error(request, _(u'Internal Error'))

        if total_size > MAX_DOWNLOAD_DIR_SIZE:
            return render_error(request, _(u'Unable to download directory "%s": size is too large.') % dirname)

        token = seafserv_rpc.web_get_access_token(repo_id,
                                                  dir_id,
                                                  'download-dir',
                                                  request.user.username)
    else:
        return render_error(request, _(u'Unable to download "%s"') % dirname )

    url = gen_file_get_url(token, dirname)
    return redirect(url)

def events(request):
    username = request.user.username
    start = int(request.GET.get('start', 0))
    if request.cloud_mode:
        org_id = request.GET.get('org_id')
        events = get_org_user_events(org_id, username, start)
    else:
        events = get_user_events(username, start)
   
    events_more = False
    if len(events) == 11:
        events_more = True
        events = events[:10]

    ctx = {}
    ctx['events'] = events
    html = render_to_string("snippets/events_.html", ctx)

    return HttpResponse(json.dumps({'html':html, 'more':events_more}),
                            content_type='application/json; charset=utf-8')

def pdf_full_view(request):
    '''For pdf view with pdf.js.'''
    
    repo_id = request.GET.get('repo_id', '')
    obj_id = request.GET.get('obj_id', '')
    file_name = request.GET.get('file_name', '')
    token = seafserv_rpc.web_get_access_token(repo_id, obj_id,
                                              'view', request.user.username)
    file_src = gen_file_get_url(token, file_name)
    return render_to_response('pdf_full_view.html', {
            'file_src': file_src,
           }, context_instance=RequestContext(request))
