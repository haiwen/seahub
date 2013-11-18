# encoding: utf-8
import os
import stat
import simplejson as json
import re
import sys
import urllib
import urllib2
import logging
import chardet
from types import FunctionType
from datetime import datetime
from math import ceil
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
from django.utils.translation import ugettext as _
from django.utils import timezone
from django.utils.http import urlquote

import seaserv
from seaserv import ccnet_rpc, ccnet_threaded_rpc, get_repos, get_emailusers, \
    get_repo, get_commits, get_branches, is_valid_filename, remove_group_user,\
    seafserv_threaded_rpc, seafserv_rpc, get_binding_peerids, is_repo_owner, \
    get_personal_groups_by_user, is_inner_pub_repo, \
    del_org_group_repo, get_personal_groups, web_get_access_token, remove_repo, \
    get_group, get_shared_groups_by_repo, is_group_user, check_permission, \
    list_personal_shared_repos, is_org_group, get_org_id_by_group, is_org_repo,\
    list_inner_pub_repos, get_org_groups_by_repo, is_org_repo_owner, \
    get_org_repo_owner, is_passwd_set, get_file_size, check_quota, edit_repo,\
    get_related_users_by_repo, get_related_users_by_org_repo, \
    get_session_info, get_group_repoids, get_repo_owner, get_file_id_by_path, \
    set_repo_history_limit, \
    get_commit, MAX_DOWNLOAD_DIR_SIZE, CALC_SHARE_USAGE, count_emailusers, \
    count_inner_pub_repos, unset_inner_pub_repo, get_user_quota_usage, \
    get_user_share_usage, send_message, \
    MAX_UPLOAD_FILE_SIZE
from seaserv import seafile_api
from pysearpc import SearpcError

from seahub.auth.decorators import login_required
from seahub.auth import login as auth_login
from seahub.auth import authenticate
from seahub.base.accounts import User
from seahub.base.decorators import sys_staff_required
from seahub.base.models import UuidObjidMap, InnerPubMsg, InnerPubMsgReply, \
    UserStarredFiles
from seahub.contacts.models import Contact
from seahub.contacts.signals import mail_sended
from seahub.group.forms import MessageForm, MessageReplyForm
from seahub.group.models import GroupMessage, MessageAttachment
from seahub.group.signals import grpmsg_added
from seahub.notifications.models import UserNotification
from seahub.options.models import UserOptions, CryptoOptionNotSetError
from seahub.profile.models import Profile
from seahub.share.models import FileShare, PrivateFileDirShare, UploadLinkShare
from seahub.forms import AddUserForm, RepoCreateForm, \
    RepoPassowrdForm, SharedRepoCreateForm,\
    SetUserQuotaForm, RepoSettingForm
from seahub.signals import repo_created, repo_deleted
from seahub.utils import render_permission_error, render_error, list_to_string, \
    get_httpserver_root, get_ccnetapplet_root, gen_shared_upload_link, \
    gen_dir_share_link, gen_file_share_link, get_repo_last_modify, \
    calculate_repos_last_modify, get_file_type_and_ext, get_user_repos, \
    EMPTY_SHA1, normalize_file_path, \
    get_file_revision_id_size, get_ccnet_server_addr_port, \
    gen_file_get_url, string2list, MAX_INT, IS_EMAIL_CONFIGURED, \
    gen_file_upload_url, check_and_get_org_by_repo, \
    get_file_contributors, EVENTS_ENABLED, get_user_events, get_org_user_events, \
    get_dir_files_last_modified, show_delete_days, \
    TRAFFIC_STATS_ENABLED, get_user_traffic_stat
from seahub.utils.paginator import get_page_range
from seahub.utils.star import get_dir_starred_files
from seahub.views.modules import get_enabled_mods_by_user, MOD_PERSONAL_WIKI, \
    enable_mod_for_user, disable_mod_for_user, get_available_mods_by_user
from seahub.utils import HAS_OFFICE_CONVERTER

if HAS_OFFICE_CONVERTER:
    from seahub.utils import prepare_converted_html, OFFICE_PREVIEW_MAX_SIZE, OFFICE_PREVIEW_MAX_PAGES

import seahub.settings as settings
from seahub.settings import FILE_PREVIEW_MAX_SIZE, INIT_PASSWD, USE_PDFJS, FILE_ENCODING_LIST, \
    FILE_ENCODING_TRY_LIST, SEND_EMAIL_ON_ADDING_SYSTEM_MEMBER, SEND_EMAIL_ON_RESETTING_USER_PASSWD, \
    ENABLE_SUB_LIBRARY

# Get an instance of a logger
logger = logging.getLogger(__name__)


def root(request):
    if request.user.is_authenticated():
        return HttpResponseRedirect(reverse(myhome))
    else:
        if hasattr(settings, 'SEACLOUD_MODE'):
            return render_to_response('seacloud/home.html', {},
                                      context_instance=RequestContext(request))
        else:
            return HttpResponseRedirect(settings.LOGIN_URL)

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

def get_file_access_permission(repo_id, path, username):
    """Check user has permission to view the file.
    1. check whether this file is private shared.
    2. if failed, check whether the parent of this directory is private shared.
    """
     
    pfs = PrivateFileDirShare.objects.get_private_share_in_file(username,
                                                               repo_id, path)
    if pfs is None:
        dirs = PrivateFileDirShare.objects.list_private_share_in_dirs_by_user_and_repo(username, repo_id)
        for e in dirs:
            if path.startswith(e.path):
                return e.permission
        return None
    else:
        return pfs.permission
    
def get_repo_access_permission(repo_id, username):
    return seafile_api.check_repo_access_permission(repo_id, username)
    
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
        i = 1
        for name in paths:
            link = '/' + '/'.join(paths[:i])
            i = i + 1
            links.append(link)
    if repo_name:
        paths.insert(0, repo_name)
        links.insert(0, '/')
        
    zipped = zip(paths, links)
    
    return zipped

def get_repo_dirents(request, repo_id, commit, path, offset=-1, limit=-1):
    dir_list = []
    file_list = []
    dirent_more = False
    if commit.root_id == EMPTY_SHA1:
        return ([], []) if limit == -1 else ([], [], False)
    else:
        try:
            if limit == -1:
                dirs = seafile_api.list_dir_by_commit_and_path(commit.id, path, offset, limit)
            else:
                dirs = seafile_api.list_dir_by_commit_and_path(commit.id, path, offset, limit + 1)
                if len(dirs) == limit + 1:
                    dirs = dirs[:limit]
                    dirent_more = True
        except SearpcError, e:
            raise Http404
            # return render_error(self.request, e.msg)

        org_id = -1
        if hasattr(request.user, 'org') and request.user.org:
            org_id = request.user.org['org_id']
        starred_files = get_dir_starred_files(request.user.username, repo_id, path, org_id)

        last_modified_info = get_dir_files_last_modified(repo_id, path)

        fileshares = FileShare.objects.filter(repo_id=repo_id).filter(username=request.user.username)
        uploadlinks = UploadLinkShare.objects.filter(repo_id=repo_id).filter(username=request.user.username)

        for dirent in dirs:
            dirent.last_modified = last_modified_info.get(dirent.obj_name, 0)
            dirent.sharelink = ''
            dirent.uploadlink = ''
            if stat.S_ISDIR(dirent.props.mode):
                dpath = os.path.join(path, dirent.obj_name)
                if dpath[-1] != '/':
                    dpath += '/'
                for share in fileshares:
                    if dpath == share.path:
                        dirent.sharelink = gen_dir_share_link(share.token)
                        dirent.sharetoken = share.token
                        break
                for link in uploadlinks:
                    if dpath == link.path:
                        dirent.uploadlink = gen_shared_upload_link(link.token)
                        dirent.uploadtoken = link.token
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
                        dirent.sharelink = gen_file_share_link(share.token)
                        dirent.sharetoken = share.token
                        break
        dir_list.sort(lambda x, y : cmp(x.obj_name.lower(),
                                        y.obj_name.lower()))
        file_list.sort(lambda x, y : cmp(x.obj_name.lower(),
                                         y.obj_name.lower()))
        if limit == -1:
            return (file_list, dir_list)
        else:
            return (file_list, dir_list, dirent_more)

def get_unencry_rw_repos_by_user(username):
    """Get all unencrypted repos the user can read and write.
    """
    def has_repo(repos, repo):
        for r in repos:
            if repo.id == r.id:
                return True
        return False
    
    owned_repos, shared_repos, groups_repos, public_repos = get_user_repos(username)

    accessible_repos = []

    for r in owned_repos:
        if not has_repo(accessible_repos, r) and not r.encrypted:
            accessible_repos.append(r)

    for r in shared_repos + public_repos:
        # For compatibility with diffrent fields names in Repo and
        # SharedRepo objects.
        r.id = r.repo_id
        r.name = r.repo_name
        r.desc = r.repo_desc

        if not has_repo(accessible_repos, r) and not r.encrypted:
            if seafile_api.check_repo_access_permission(r.id, username) == 'rw':
                accessible_repos.append(r)

    for r in groups_repos:
        if not has_repo(accessible_repos, r) and not r.encrypted :
            if seafile_api.check_repo_access_permission(r.id, username) == 'rw':            
                accessible_repos.append(r)

    return accessible_repos


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

    search_repo_id = None
    if not repo.encrypted:
        search_repo_id = repo.id

    return render_to_response('repo_recycle_view.html', {
            'show_recycle_root': True,
            'repo': repo,
            'dir_list': dir_list,
            'file_list': file_list,
            'days': days,
            'search_repo_id': search_repo_id,
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

    search_repo_id = None
    if not repo.encrypted:
        search_repo_id = repo.id

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
            'search_repo_id': search_repo_id,
            }, context_instance=RequestContext(request))

@login_required
def repo_recycle_view(request, repo_id):
    if get_user_permission(request, repo_id) != 'rw':
        return render_permission_error(request, _(u'Unable to view recycle page'))

    commit_id = request.GET.get('commit_id', '')
    if not commit_id:
        return render_recycle_root(request, repo_id)
    else:
        return render_recycle_dir(request, repo_id, commit_id)

@login_required
def repo_save_settings(request):
    if request.method != 'POST':
        raise Http404

    username = request.user.username
    content_type = 'application/json; charset=utf-8'

    form = RepoSettingForm(request.POST)
    if form.is_valid():
        repo_id = form.cleaned_data['repo_id']
        repo_name = form.cleaned_data['repo_name']
        repo_desc = form.cleaned_data['repo_desc']
        days = form.cleaned_data['days']
        repo_owner = form.cleaned_data['repo_owner']
        
        repo = get_repo(repo_id)
        if not repo:
            err_msg = _(u'Library does not exist.')
            return HttpResponse(json.dumps({'error': err_msg}),
                                status=400, content_type=content_type)

        # check permission
        if request.user.org:
            is_owner = True if is_org_repo_owner(
                request.user.org['org_id'], repo_id, username) else False
        else:
            is_owner = True if is_repo_owner(username, repo_id) else False
        if not is_owner:
            err_msg = _(u'You do not have permission to perform this action.')
            return HttpResponse(json.dumps({'error': err_msg}),
                                status=403, content_type=content_type)

        # Edit library info (name, descryption).
        if repo.name != repo_name or repo.desc != repo_desc:
            if not edit_repo(repo_id, repo_name, repo_desc, username):
                err_msg = _(u'Failed to edit library information.')
                return HttpResponse(json.dumps({'error': err_msg}),
                                    status=500, content_type=content_type)

        # set library history
        if days != None:
            res = set_repo_history_limit(repo_id, days)
            if res != 0:
                return HttpResponse(json.dumps({'error': _(u'Failed to save settings on server')}),
                                    status=400, content_type=content_type)

        # set library owner
        if repo_owner is not None and repo_owner != username:
            seafile_api.set_repo_owner(repo_id, repo_owner)

        messages.success(request, _(u'Settings saved.'))
        return HttpResponse(json.dumps({'success': True}),
                            content_type=content_type)
    else:
        return HttpResponse(json.dumps({'error': str(form.errors.values()[0])}),
                            status=400, content_type=content_type)

@login_required
def repo_settings(request, repo_id):
    """List and change library settings.
    """
    username = request.user.username

    repo = seafile_api.get_repo(repo_id)
    if not repo:
        raise Http404

    # no settings for virtual repo
    if ENABLE_SUB_LIBRARY and repo.is_virtual:
        raise Http404

    # check permission
    is_owner = True if seafile_api.is_repo_owner(username, repo_id) else False
    if not is_owner:
        raise Http404
    
    if request.method == 'POST':
        content_type = 'application/json; charset=utf-8'

        form = RepoSettingForm(request.POST)
        if not form.is_valid():
            return HttpResponse(json.dumps({
                        'error': str(form.errors.values()[0])
                        }), status=400, content_type=content_type)
            
        repo_name = form.cleaned_data['repo_name']
        repo_desc = form.cleaned_data['repo_desc']
        days = form.cleaned_data['days']

        # Edit library info (name, descryption).
        if repo.name != repo_name or repo.desc != repo_desc:
            if not edit_repo(repo_id, repo_name, repo_desc, username):
                err_msg = _(u'Failed to edit library information.')
                return HttpResponse(json.dumps({'error': err_msg}),
                                    status=500, content_type=content_type)

        # set library history
        if days != None:
            res = set_repo_history_limit(repo_id, days)
            if res != 0:
                return HttpResponse(json.dumps({
                            'error': _(u'Failed to save settings on server')
                            }), status=400, content_type=content_type)

        messages.success(request, _(u'Settings saved.'))
        return HttpResponse(json.dumps({'success': True}),
                            content_type=content_type)

    ### handle get request
    repo_owner = seafile_api.get_repo_owner(repo.id)
    history_limit = seaserv.get_repo_history_limit(repo.id)

    return render_to_response('repo_settings.html', {
            'repo': repo,
            'repo_owner': repo_owner,
            'history_limit': history_limit,
            }, context_instance=RequestContext(request))

@login_required
def repo_owner(request, repo_id):
    """Handle post request to transfer library owner.
    """
    if request.method != 'POST':
        raise Http404

    username = request.user.username

    repo = seafile_api.get_repo(repo_id)
    if not repo:
        raise Http404

    # check permission
    is_owner = True if seafile_api.is_repo_owner(username, repo_id) else False
    if not is_owner:
        raise Http404

    content_type = 'application/json; charset=utf-8'
    repo_owner = request.POST.get('repo_owner', '').lower()
    try:
        User.objects.get(email=repo_owner)
    except User.DoesNotExist:
        return HttpResponse(json.dumps({
                        'error': _('User %s is not found.') % repo_owner,
                        }), status=400, content_type=content_type)

    if repo_owner and repo_owner != username:
        seafile_api.set_repo_owner(repo_id, repo_owner)

    messages.success(request, _(u'Library %(repo_name)s has been transfered to %(new_owner)s.') % {'repo_name':repo.name, 'new_owner':repo_owner})
    return HttpResponse(json.dumps({'success': True}),
                        content_type=content_type)
        
    
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

def upload_file_error(request, repo_id):
    if request.method == 'GET':
        repo = get_repo(repo_id)
        if not repo:
            raise Http404
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

def update_file_error(request, repo_id):
    if request.method == 'GET':
        repo = get_repo(repo_id)
        if not repo:
            raise Http404
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
    
@login_required
def repo_history(request, repo_id):
    """
    List library modification histories.
    """
    user_perm = get_user_permission(request, repo_id)
    if not user_perm:
        return render_permission_error(request, _(u'Unable to view library modification'))

    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    username = request.user.username
    try:
        server_crypto = UserOptions.objects.is_server_crypto(username)
    except CryptoOptionNotSetError:
        # Assume server_crypto is ``False`` if this option is not set.
        server_crypto = False   
    
    password_set = False
    if repo.props.encrypted and \
            (repo.enc_version == 1 or (repo.enc_version == 2 and server_crypto)):
        try:
            ret = seafserv_rpc.is_passwd_set(repo_id, username)
            if ret == 1:
                password_set = True
        except SearpcError, e:
            return render_error(request, e.msg)

        if not password_set:
            return HttpResponseRedirect(reverse('repo', args=[repo_id]))

    try:
        current_page = int(request.GET.get('page', '1'))
        per_page = int(request.GET.get('per_page', '25'))
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

        
    search_repo_id = None
    if not repo.encrypted:
        search_repo_id = repo.id

    return render_to_response('repo_history.html', {
            "repo": repo,
            "commits": commits,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
            'user_perm': user_perm,
            'search_repo_id': search_repo_id,
            }, context_instance=RequestContext(request))

@login_required
def repo_view_snapshot(request, repo_id):
    """List repo snapshots.
    """
    if not access_to_repo(request, repo_id, ''):
        return render_permission_error(request, _(u'Unable to view library snapshots'))

    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    username = request.user.username
    try:
        server_crypto = UserOptions.objects.is_server_crypto(username)
    except CryptoOptionNotSetError:
        # Assume server_crypto is ``False`` if this option is not set.
        server_crypto = False   
    
    password_set = False
    if repo.props.encrypted and \
            (repo.enc_version == 1 or (repo.enc_version == 2 and server_crypto)):
        try:
            ret = seafserv_rpc.is_passwd_set(repo_id, username)
            if ret == 1:
                password_set = True
        except SearpcError, e:
            return render_error(request, e.msg)

        if not password_set:
            return HttpResponseRedirect(reverse('repo', args=[repo_id]))

    try:
        current_page = int(request.GET.get('page', '1'))
        per_page = int(request.GET.get('per_page', '25'))
    except ValueError:
        current_page = 1
        per_page = 25

    # don't show the current commit
    commits_all = get_commits(repo_id, per_page * (current_page -1) + 1,
                              per_page + 1)
    commits = commits_all[:per_page]

    if len(commits_all) == per_page + 1:
        page_next = True
    else:
        page_next = False

    search_repo_id = None
    if not repo.encrypted:
        search_repo_id = repo.id

    return render_to_response('repo_view_snapshot.html', {
            "repo": repo,
            "commits": commits,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'per_page': per_page,
            'page_next': page_next,
            'search_repo_id': search_repo_id,
            }, context_instance=RequestContext(request))

@login_required
def repo_history_revert(request, repo_id):
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    if not access_to_repo(request, repo_id):
        return render_permission_error(request, _(u'You have no permission to restore library'))

    username = request.user.username
    try:
        server_crypto = UserOptions.objects.is_server_crypto(username)
    except CryptoOptionNotSetError:
        # Assume server_crypto is ``False`` if this option is not set.
        server_crypto = False   
    
    password_set = False
    if repo.props.encrypted and \
            (repo.enc_version == 1 or (repo.enc_version == 2 and server_crypto)):
        try:
            ret = seafserv_rpc.is_passwd_set(repo_id, username)
            if ret == 1:
                password_set = True
        except SearpcError, e:
            return render_error(request, e.msg)

        if not password_set:
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
    if not request.is_ajax():
        return Http404

    changes = {}
    content_type = 'application/json; charset=utf-8'

    if not access_to_repo(request, repo_id, ''):
        return HttpResponse(json.dumps(changes), content_type=content_type)

    repo = get_repo(repo_id)
    if not repo:
        return HttpResponse(json.dumps(changes), content_type=content_type)

    username = request.user.username
    try:
        server_crypto = UserOptions.objects.is_server_crypto(username)
    except CryptoOptionNotSetError:
        # Assume server_crypto is ``False`` if this option is not set.
        server_crypto = False   
    
    if repo.encrypted and \
            (repo.enc_version == 1 or (repo.enc_version == 2 and server_crypto)) \
            and not is_passwd_set(repo_id, username):
        return HttpResponse(json.dumps(changes), content_type=content_type)

    commit_id = request.GET.get('commit_id', '')
    if not commit_id:
        return HttpResponse(json.dumps(changes), content_type=content_type)

    changes = get_diff(repo_id, '', commit_id)

    c = get_commit(commit_id)
    if c.parent_id is None:
        # A commit is a first commit only if it's parent id is None.
        changes['cmt_desc'] = repo.desc
    elif c.second_parent_id is None:
        # Normal commit only has one parent.
        if c.desc.startswith('Changed library'):
            changes['cmt_desc'] = _('Changed library name or description')
    else:
        # A commit is a merge only if it has two parents.
        changes['cmt_desc'] = _('No conflict in the merge.')

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
            messages.error(request, err_msg)
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
            messages.success(request, _(u'Successfully deleted library "%s".') % repo.name)
        else:
            err_msg = _(u'Failed to remove library. Only staff or owner can perform this operation.')
            messages.error(request, err_msg)

    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = settings.SITE_ROOT
    return HttpResponseRedirect(next)

@login_required
def myhome(request):
    owned_repos = []

    username = request.user.username

    quota = seafserv_threaded_rpc.get_user_quota(username)

    quota_usage = 0
    share_usage = 0
    my_usage = get_user_quota_usage(username)
    if CALC_SHARE_USAGE:
        share_usage = get_user_share_usage(username)
        quota_usage = my_usage + share_usage
    else:
        quota_usage = my_usage

    # Get all personal groups I joined.
    joined_groups = get_personal_groups_by_user(username)

    def get_abbrev_origin_path(repo_name, path):
        if len(path) > 20:
            abbrev_path = path[-20:]
            return repo_name + '/...' + abbrev_path
        else:
            return repo_name + path

    # compose abbrev origin path for display

    sub_repos = []
    sub_lib_enabled = UserOptions.objects.is_sub_lib_enabled(username)
    if ENABLE_SUB_LIBRARY and sub_lib_enabled:
        sub_repos = seafile_api.get_virtual_repos_by_owner(username)
        for repo in sub_repos:
            repo.abbrev_origin_path = get_abbrev_origin_path(repo.origin_repo_name,
                                                             repo.origin_path)
        calculate_repos_last_modify(sub_repos)
        sub_repos.sort(lambda x, y: cmp(y.latest_modify, x.latest_modify))

    # Personal repos that I owned.
    owned_repos = seafserv_threaded_rpc.list_owned_repos(username)
    calculate_repos_last_modify(owned_repos)
    owned_repos.sort(lambda x, y: cmp(y.latest_modify, x.latest_modify))
    
    # Personal repos others shared to me
    in_repos = list_personal_shared_repos(username, 'to_email', -1, -1)
    # For each group I joined... 
    for grp in joined_groups:
        # Get group repos, and for each group repos...
        for r_id in get_group_repoids(grp.id):
            # No need to list my own repo
            if is_repo_owner(username, r_id):
                continue
            # Convert repo properties due to the different collumns in Repo
            # and SharedRepo
            r = get_repo(r_id)
            if not r:
                continue
            r.repo_id = r.id
            r.repo_name = r.name
            r.repo_desc = r.desc
            r.last_modified = get_repo_last_modify(r)
            r.share_type = 'group'
            r.user = get_repo_owner(r_id)
            r.user_perm = check_permission(r_id, username)
            in_repos.append(r)
    in_repos.sort(lambda x, y: cmp(y.last_modified, x.last_modified))

    # user notifications
    grpmsg_list = []
    grpmsg_reply_list = []
    joined_group_ids = [x.id for x in joined_groups]
    notes = UserNotification.objects.filter(to_user=username)
    for n in notes:
        if n.msg_type == 'group_msg':
            if int(n.detail) not in joined_group_ids:
                continue
            grp = get_group(int(n.detail))
            grpmsg_list.append(grp)
        elif n.msg_type == 'grpmsg_reply':
            grpmsg_reply_list.append(n.detail)

    # get nickname
    profiles = Profile.objects.filter(user=username)
    nickname = profiles[0].nickname if profiles else ''

    autocomp_groups = joined_groups
    contacts = Contact.objects.get_contacts_by_user(username)

    allow_public_share = False if request.cloud_mode else True

    starred_files = UserStarredFiles.objects.get_starred_files_by_username(
        username)

    traffic_stat = 0
    if TRAFFIC_STATS_ENABLED:
        # User's network traffic stat in this month
        try:
            stat = get_user_traffic_stat(username)
        except Exception as e:
            logger.error(e)
            stat = None

        if stat:
            traffic_stat = stat['file_view'] + stat['file_download'] + stat['dir_download']

    # get available modules(wiki, etc)
    mods_available = get_available_mods_by_user(username)
    mods_enabled = get_enabled_mods_by_user(username)

    # user guide
    need_guide = False
    if len(owned_repos) == 0:
        need_guide = UserOptions.objects.is_user_guide_enabled(username)
        if need_guide:
            UserOptions.objects.disable_user_guide(username)

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
            "create_shared_repo": False,
            "allow_public_share": allow_public_share,
            "starred_files": starred_files,
            "TRAFFIC_STATS_ENABLED": TRAFFIC_STATS_ENABLED,
            "traffic_stat": traffic_stat,
            "ENABLE_PAYMENT": getattr(settings, 'ENABLE_PAYMENT', False),
            "ENABLE_SUB_LIBRARY": ENABLE_SUB_LIBRARY,
            "ENABLE_EVENTS": EVENTS_ENABLED,
            "mods_enabled": mods_enabled,
            "mods_available": mods_available,
            "need_guide": need_guide,
            "sub_lib_enabled": sub_lib_enabled,
            "sub_repos": sub_repos,
            }, context_instance=RequestContext(request))

@login_required
def client_mgmt(request):
    username = request.user.username

    clients = []
    try:
        clients = seafile_api.list_repo_tokens_by_email(username)
    except:
        pass

    if clients:
        clients.sort(key=lambda client: client.repo_name)
        for i, client in enumerate(clients):
            if i > 0 and client.repo_name == clients[i - 1].repo_name:
                client.not_show_repo_name = True

    # get available modules(wiki, etc)
    mods_available = get_available_mods_by_user(username)
    mods_enabled = get_enabled_mods_by_user(username)
        
    return render_to_response('client_mgmt.html', {
            'clients': clients,
            "mods_enabled": mods_enabled,
            "mods_available": mods_available,
            }, context_instance=RequestContext(request))

@login_required
def client_unsync(request):
    if not request.is_ajax():
        raise Http404

    content_type = 'application/json; charset=utf-8'

    repo_id = request.GET.get('repo_id', '')
    token = request.GET.get('token', '')

    if not (repo_id and token):
        return HttpResponse(json.dumps({'error': _(u'Argument missing')}),
                status=400, content_type=content_type)

    username = request.user.username
    try:
        seafile_api.delete_repo_token(repo_id, token, username)
        return HttpResponse(json.dumps({'success': True}),
                content_type=content_type)
    except:
        return HttpResponse(json.dumps({'error': _(u'Internal server error')}),
                status=500, content_type=content_type)

# @login_required
# def innerpub_msg_reply(request, msg_id):
#     """Show inner pub message replies, and process message reply in ajax"""
    
#     content_type = 'application/json; charset=utf-8'
#     if request.is_ajax():
#         ctx = {}
#         if request.method == 'POST':
#             form = MessageReplyForm(request.POST)

#             # TODO: invalid form
#             if form.is_valid():
#                 msg = form.cleaned_data['message']
#                 try:
#                     innerpub_msg = InnerPubMsg.objects.get(id=msg_id)
#                 except InnerPubMsg.DoesNotExist:
#                     return HttpResponseBadRequest(content_type=content_type)
            
#                 msg_reply = InnerPubMsgReply()
#                 msg_reply.reply_to = innerpub_msg
#                 msg_reply.from_email = request.user.username
#                 msg_reply.message = msg
#                 msg_reply.save()

#                 ctx['reply'] = msg_reply
#                 html = render_to_string("group/group_reply_new.html", ctx)

#         else:
#             try:
#                 msg = InnerPubMsg.objects.get(id=msg_id)
#             except InnerPubMsg.DoesNotExist:
#                 raise HttpResponse(status=400)

#             replies = InnerPubMsgReply.objects.filter(reply_to=msg)
#             ctx['replies'] = replies
#             html = render_to_string("group/group_reply_list.html", ctx)

#         serialized_data = json.dumps({"html": html})
#         return HttpResponse(serialized_data, content_type=content_type)
#     else:
#         return HttpResponseBadRequest(content_type=content_type)

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
    if not form.is_valid():
        result['error'] = str(form.errors.values()[0])
        return HttpResponseBadRequest(json.dumps(result),
                                      content_type=content_type)

    repo_name = form.cleaned_data['repo_name']
    repo_desc = form.cleaned_data['repo_desc']
    permission = form.cleaned_data['permission']
    encryption = int(form.cleaned_data['encryption'])

    uuid = form.cleaned_data['uuid']
    magic_str = form.cleaned_data['magic_str']
    encrypted_file_key = form.cleaned_data['encrypted_file_key']

    user = request.user.username

    try:
        if not encryption:
            repo_id = seafile_api.create_repo(repo_name, repo_desc, user, None)
        else:
            repo_id = seafile_api.create_enc_repo(uuid, repo_name, repo_desc, user, magic_str, encrypted_file_key, enc_version=2)

        # set this repo as inner pub
        seafile_api.add_inner_pub_repo(repo_id, permission)
        #seafserv_threaded_rpc.set_inner_pub_repo(repo_id, permission)
    except SearpcError as e:
        repo_id = None
        logger.error(e)

    if not repo_id:
        result['error'] = _(u'Internal Server Error')
        return HttpResponse(json.dumps(result), status=500,
                                      content_type=content_type)
    else:
        result['success'] = True
        repo_created.send(sender=None,
                          org_id=-1,
                          creator=user,
                          repo_id=repo_id,
                          repo_name=repo_name)
        return HttpResponse(json.dumps(result), content_type=content_type)

@login_required
def unsetinnerpub(request, repo_id):
    repo = get_repo(repo_id)
    if not repo:
        messages.error(request, _('Failed to unshare the library, as it does not exist.'))
        return HttpResponseRedirect(reverse('share_admin'))

    try:
        unset_inner_pub_repo(repo_id)
        messages.success(request, _('Unshare "%s" successfully.') % repo.name)
    except SearpcError:
        messages.error(request, _('Failed to unshare "%s".') % repo.name)
    return HttpResponseRedirect(reverse('share_admin'))

# @login_required
# def ownerhome(request, owner_name):
#     owned_repos = []
#     quota_usage = 0

#     owned_repos = seafserv_threaded_rpc.list_owned_repos(owner_name)
#     quota_usage = seafserv_threaded_rpc.get_user_quota_usage(owner_name)

#     user_dict = user_info(request, owner_name)
    
#     return render_to_response('ownerhome.html', {
#             "owned_repos": owned_repos,
#             "quota_usage": quota_usage,
#             "owner": owner_name,
#             "user_dict": user_dict,
#             }, context_instance=RequestContext(request))

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
        seafserv_threaded_rpc.del_file(repo_id, parent_dir, file_name, user)
        messages.success(request, _(u'%s successfully deleted.') % file_name)
    except:
        messages.error(request, _(u'Internal error. Failed to delete %s.') % file_name)

    url = reverse('repo', args=[repo_id]) + ('?p=%s' % urllib2.quote(parent_dir.encode('utf-8')))
    return HttpResponseRedirect(url)
   
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
    fileshare = FileShare.objects.get(token=share_token) if share_token else None
    shared_by = None
    if fileshare:
        from_shared_link = True
        shared_by = fileshare.username
    else:
        from_shared_link = False

    username = request.user.username
    path = request.GET.get('p', '')
    if get_repo_access_permission(repo_id, username) or \
            get_file_access_permission(repo_id, path, username) or from_shared_link:
        # Get a token to access file
        token = seafserv_rpc.web_get_access_token(repo_id, obj_id, op, username)
    else:
        return render_permission_error(request, _(u'Unable to access file'))

    redirect_url = gen_file_get_url(token, file_name)

    if from_shared_link:
        # send stats message
        try:
            file_size = seafserv_threaded_rpc.get_file_size(obj_id)
            send_message('seahub.stats', 'file-download\t%s\t%s\t%s\t%s' % \
                         (repo.id, shared_by, obj_id, file_size))
        except Exception, e:
            logger.error('Error when sending file-download message: %s' % str(e))

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
        token = seafserv_threaded_rpc.generate_repo_token \
                (repo_id, request.user.username)
    except Exception, e:
        return '', str(e)

    addr, port = get_ccnet_server_addr_port ()

    if not (addr and port):
        return '', _(u"Invalid server setting")

    ccnet_applet_root = get_ccnetapplet_root()
    email = urllib2.quote(request.user.username.encode('utf-8'))

    url = ccnet_applet_root + "/repo/download/"
    
    url += "?relay_id=%s&relay_addr=%s&relay_port=%s" % (relay_id, addr, port)
    url += "&email=%s&token=%s" % (email, token)
    url += "&repo_id=%s&repo_name=%s" % (repo_id, quote_repo_name)
    if enc:
        url += "&encrypted=1&magic=%s&enc_ver=%s" % (repo.magic, repo.enc_version)
        if repo.enc_version == 2 and repo.random_key:
            url += "&key=%s" % repo.random_key

    return url, ''
 
@login_required
def repo_download(request):
    repo_id = request.GET.get('repo_id', '')
    repo = get_repo(repo_id)
    if repo is None:
        raise Http404
    
    download_url, err = get_repo_download_url(request, repo_id)
    if err:
        return render_to_response('error.html', {
            "error_msg": err
        }, context_instance=RequestContext(request))

    return HttpResponseRedirect(download_url)

@login_required
def seafile_access_check(request):
    repo_id = request.GET.get('repo_id', '')
    repo = get_repo(repo_id)
    if repo is None:
        raise Http404

    applet_root = get_ccnetapplet_root()
    download_url, err = get_repo_download_url (request, repo_id)
    if err:
        return render_to_response('error.html', {
                "error_msg": err
                }, context_instance=RequestContext(request))
    
    return render_to_response('seafile_access_check.html', {
            'repo_id': repo_id,
            'applet_root': applet_root,
            'download_url': download_url,
            }, context_instance=RequestContext(request))


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
    if not form.is_valid():
        result['error'] = str(form.errors.values()[0])
        return HttpResponseBadRequest(json.dumps(result),
                                      content_type=content_type)

    repo_name = form.cleaned_data['repo_name']
    repo_desc = form.cleaned_data['repo_desc']
    encryption = int(form.cleaned_data['encryption'])

    uuid = form.cleaned_data['uuid']
    magic_str = form.cleaned_data['magic_str']
    encrypted_file_key = form.cleaned_data['encrypted_file_key']

    username = request.user.username

    try:
        if not encryption:
            repo_id = seafile_api.create_repo(repo_name, repo_desc, username,
                                              None)
        else:
            repo_id = seafile_api.create_enc_repo(
                uuid, repo_name, repo_desc, username,
                magic_str, encrypted_file_key, enc_version=2)
    except SearpcError, e:
        repo_id = None

    if not repo_id:
        result['error'] = _(u"Internal Server Error")
        return HttpResponse(json.dumps(result), status=500,
                            content_type=content_type)
    else:
        result = {
            'repo_id': repo_id,
            'repo_name': repo_name,
            'repo_desc': repo_desc,
        }
        repo_created.send(sender=None,
                          org_id=-1,
                          creator=username,
                          repo_id=repo_id,
                          repo_name=repo_name)
        return HttpResponse(json.dumps(result), content_type=content_type)

def render_file_revisions (request, repo_id):
    """List all history versions of a file."""
    path = request.GET.get('p', '/')
    if path[-1] == '/':
        path = path[:-1]
    u_filename = os.path.basename(path)

    if not path:
        return render_error(request)

    repo = get_repo(repo_id)
    if not repo:
        error_msg = _(u"Library does not exist")
        return render_error(request, error_msg)

    filetype = get_file_type_and_ext(u_filename)[0].lower()
    if filetype == 'text' or filetype == 'markdown':
        can_compare = True
    else:
        can_compare = False

    try:
        commits = seafserv_threaded_rpc.list_file_revisions(repo_id, path,
                                                            -1, -1)
    except SearpcError, e:
        logger.error(e.msg)
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

    search_repo_id = None
    if not repo.encrypted:
        search_repo_id = repo.id

    return render_to_response('file_revisions.html', {
        'repo': repo,
        'path': path,
        'u_filename': u_filename,
        'zipped': zipped,
        'commits': commits,
        'is_owner': is_owner,
        'can_compare': can_compare,
        'search_repo_id': search_repo_id,
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
            seafdir = seafile_api.list_dir_by_commit_and_path (commit_id,
                                                               parent_dir)
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

def view_shared_upload_link(request, token):
    assert token is not None    # Checked by URLconf

    try:
        uploadlink = UploadLinkShare.objects.get(token=token)
    except UploadLinkShare.DoesNotExist:
        raise Http404

    username = uploadlink.username
    repo_id = uploadlink.repo_id
    path = uploadlink.path
    dir_name = os.path.basename(path[:-1])

    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    uploadlink.view_cnt = F('view_cnt') + 1
    uploadlink.save()

    max_upload_file_size = MAX_UPLOAD_FILE_SIZE
    no_quota = True if seaserv.check_quota(repo_id) < 0 else False

    token = seafile_api.get_httpserver_access_token(repo_id, 'dummy',
                                                    'upload', request.user.username)
    ajax_upload_url = gen_file_upload_url(token, 'upload-api').replace('api', 'aj')

    return render_to_response('view_shared_upload_link.html', {
            'repo': repo,
            'token': token,
            'path': path,
            'username': username,
            'dir_name': dir_name,
            'max_upload_file_size': max_upload_file_size,
            'no_quota': no_quota,
            'ajax_upload_url': ajax_upload_url
            }, context_instance=RequestContext(request))

def demo(request):
    """
    Login as demo account.
    """

    redirect_to = settings.SITE_ROOT

    auth_login(request, authenticate(username='demo@seafile.com',
                                     password='demo'))

    return HttpResponseRedirect(redirect_to)

@login_required
def pubrepo(request):
    """
    Show public libraries.
    """
    if request.cloud_mode:
        # Users are not allowed to see public information when in cloud mode.
        raise Http404
    else:
        public_repos = list_inner_pub_repos(request.user.username)
        pubrepos_count = len(public_repos)
        groups_count = len(get_personal_groups(-1, -1))
        emailusers_count = count_emailusers()
        return render_to_response('pubrepo.html', {
                'public_repos': public_repos,
                'create_shared_repo': True,
                'pubrepos_count': pubrepos_count,
                'groups_count': groups_count,
                'emailusers_count': emailusers_count,
                }, context_instance=RequestContext(request))

@login_required
def pubgrp(request):
    """
    Show public groups.
    """
    if request.cloud_mode:
        # Users are not allowed to see public information when in cloud mode.
        raise Http404
    else:
        groups = get_personal_groups(-1, -1)
        pubrepos_count = count_inner_pub_repos()
        groups_count = len(groups)
        emailusers_count = count_emailusers()
        return render_to_response('pubgrp.html', {
                'groups': groups,
                'pubrepos_count': pubrepos_count,
                'groups_count': groups_count,
                'emailusers_count': emailusers_count,
                }, context_instance=RequestContext(request))

@login_required
def pubuser(request):
    """
    Show public users.
    """
    if request.cloud_mode:
        # Users are not allowed to see public information when in cloud mode.
        raise Http404
    else:
        emailusers_count = seaserv.count_emailusers()
        pubrepos_count = seaserv.count_inner_pub_repos()
        groups_count = len(seaserv.get_personal_groups(-1, -1))

        '''paginate'''
        # Make sure page request is an int. If not, deliver first page.
        try:
            current_page = int(request.GET.get('page', '1'))
        except ValueError:
            current_page = 1
        per_page = 20           # show 20 users per-page
        users_plus_one = seaserv.get_emailusers(per_page * (current_page - 1),
                                                per_page + 1)
        has_prev = False if current_page == 1 else True
        has_next = True if len(users_plus_one) == per_page + 1 else False
        num_pages = int(ceil(emailusers_count / float(per_page)))
        page_range = get_page_range(current_page, num_pages)

        users = users_plus_one[:per_page]
        username = request.user.username
        contacts = Contact.objects.get_contacts_by_user(username)
        contact_emails = [] 
        for c in contacts:
            contact_emails.append(c.contact_email)
        for u in users:
            if u.email == username or u.email in contact_emails:
                u.can_be_contact = False
            else:
                u.can_be_contact = True 

        return render_to_response('pubuser.html', {
                'users': users,
                'pubrepos_count': pubrepos_count,
                'groups_count': groups_count,
                'emailusers_count': emailusers_count,
                'current_page': current_page,
                'has_prev': has_prev,
                'has_next': has_next,
                'page_range': page_range, 
                }, context_instance=RequestContext(request))
   
def repo_set_password(request):
    content_type = 'application/json; charset=utf-8'

    form = RepoPassowrdForm(request.POST)
    if form.is_valid():
        return HttpResponse(json.dumps({'success': True}), content_type=content_type)
    else:
        return HttpResponse(json.dumps({'error': str(form.errors.values()[0])}),
                status=400, content_type=content_type)

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
    from_shared_link = False
    shared_by = None
    if fileshare_token:         # download dir from dir shared link
        try:
            fileshare = FileShare.objects.get(token=fileshare_token)
        except FileShare.DoesNotExist:
            raise Http404

        # Can not download upper dir of shared dir.
        allow_download = True if path.startswith(fileshare.path) else False
        from_shared_link = True
        shared_by = fileshare.username
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

        if from_shared_link:
            try:
                send_message('seahub.stats', 'dir-download\t%s\t%s\t%s\t%s' % \
                             (repo_id, shared_by, dir_id, total_size))
            except Exception, e:
                logger.error('Error when sending dir-download message: %s' % str(e))
    else:
        return render_error(request, _(u'Unable to download "%s"') % dirname )


    url = gen_file_get_url(token, dirname)
    return redirect(url)

@login_required
def events(request):
    if not request.is_ajax():
        raise Http404

    events_count = 15
    username = request.user.username
    start = int(request.GET.get('start', 0))

    if request.cloud_mode:
        org_id = request.GET.get('org_id')
        events, start = get_org_user_events(org_id, username, start, events_count)
    else:
        events, start = get_user_events(username, start, events_count)
    events_more = True if len(events) == events_count else False

    event_groups = group_events_data(events)
    ctx = {'event_groups': event_groups}
    html = render_to_string("snippets/events_body.html", ctx)

    return HttpResponse(json.dumps({'html':html, 'events_more':events_more,
                                    'new_start': start}),
                            content_type='application/json; charset=utf-8')

def group_events_data(events):
    """
    Group events according to the date.
    """
    event_groups = []
    for e in events:
        if e.etype == 'repo-update':
            e.time = datetime.fromtimestamp(int(e.commit.ctime)) # e.commit.ctime is a timestamp
            e.author = e.commit.creator_name
        else:
            # e.timestamp is a datetime.datetime in UTC
            # change from UTC timezone to current seahub timezone
            def utc_to_local(dt):
                tz = timezone.get_default_timezone()
                utc = dt.replace(tzinfo=timezone.utc)
                local = timezone.make_naive(utc, tz)
                return local

            e.time = utc_to_local(e.timestamp)
            if e.etype == 'repo-create':
                e.author = e.creator
            else:
                e.author = e.repo_owner
        e.date = (e.time).strftime("%Y-%m-%d")
        
        if len(event_groups) == 0 or \
            len(event_groups) > 0 and e.date != event_groups[-1]['date']:
            event_group = {}
            event_group['date'] = e.date
            event_group['events'] = [e]
            event_groups.append(event_group)
        else:
            event_groups[-1]['events'].append(e)

    return event_groups

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

@login_required
def convert_cmmt_desc_link(request):
    """Return user to file/directory page based on the changes in commit.
    """
    repo_id = request.GET.get('repo_id')
    cmmt_id = request.GET.get('cmmt_id')
    name = request.GET.get('nm')

    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    # perm check
    if get_user_permission(request, repo_id) is None:
        raise Http404
    
    diff_result = seafserv_threaded_rpc.get_diff(repo_id, '', cmmt_id)
    if not diff_result:
        raise Http404

    for d in diff_result:
        if name not in d.name:
            # skip to next diff_result if file/folder user clicked does not
            # match the diff_result
            continue            

        if d.status == 'add' or d.status == 'mod': # Add or modify file
            return HttpResponseRedirect(reverse('repo_view_file', args=[repo_id]) + \
                                            '?p=/%s' % urlquote(d.name))
        elif d.status == 'mov': # Move or Rename file
            return HttpResponseRedirect(reverse('repo_view_file', args=[repo_id]) + \
                                            '?p=/%s' % urlquote(d.new_name))
        elif d.status == 'newdir':
            return HttpResponseRedirect(reverse('repo', args=[repo_id]) + \
                                            '?p=/%s' % urlquote(d.name))
        else:
            continue

    # Shoud never reach here.
    logger.warn('OUT OF CONTROL!')
    logger.warn('repo_id: %s, cmmt_id: %s, name: %s' % (repo_id, cmmt_id, name))
    for d in diff_result:
        logger.warn('diff_result: %s' % (d.__dict__))
    raise Http404

@login_required
def toggle_modules(request):
    """Enable or disable modules.
    """
    if request.method != 'POST':
        raise Http404

    referer = request.META.get('HTTP_REFERER', None)
    next = settings.SITE_ROOT if referer is None else referer
    
    username = request.user.username
    personal_wiki = request.POST.get('personal_wiki', 'off')
    if personal_wiki == 'on':
        enable_mod_for_user(username, MOD_PERSONAL_WIKI)
        messages.success(request, _('Successfully enable "Personal Wiki".'))
    else:
        disable_mod_for_user(username, MOD_PERSONAL_WIKI)
        if referer.find('wiki') > 0:
            next = reverse('myhome')
        messages.success(request, _('Successfully disable "Personal Wiki".'))

    return HttpResponseRedirect(next)

