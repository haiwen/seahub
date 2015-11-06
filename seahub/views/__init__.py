# encoding: utf-8
import hashlib
import os
import stat
import json
import mimetypes
import urllib2
import logging
from math import ceil
import posixpath

from django.core.cache import cache
from django.core.urlresolvers import reverse
from django.contrib import messages
from django.http import HttpResponse, HttpResponseBadRequest, Http404, \
    HttpResponseRedirect
from django.shortcuts import render_to_response, redirect
from django.template import RequestContext
from django.utils import timezone
from django.utils.http import urlquote
from django.utils.html import escape
from django.utils.translation import ugettext as _
from django.views.decorators.http import condition

import seaserv
from seaserv import get_repo, get_commits, is_valid_filename, \
    seafserv_threaded_rpc, seafserv_rpc, is_repo_owner, check_permission, \
    is_passwd_set, get_file_size, get_group, get_session_info, get_commit, \
    MAX_DOWNLOAD_DIR_SIZE, send_message, ccnet_threaded_rpc, \
    get_personal_groups_by_user, seafile_api
from pysearpc import SearpcError

from seahub.avatar.util import get_avatar_file_storage
from seahub.auth.decorators import login_required, login_required_ajax
from seahub.auth import login as auth_login
from seahub.auth import get_backends
from seahub.base.accounts import User
from seahub.base.decorators import user_mods_check, require_POST
from seahub.base.models import UserStarredFiles, ClientLoginToken
from seahub.contacts.models import Contact
from seahub.options.models import UserOptions, CryptoOptionNotSetError
from seahub.profile.models import Profile
from seahub.share.models import FileShare, PrivateFileDirShare, \
    UploadLinkShare
from seahub.forms import RepoPassowrdForm
from seahub.utils import render_permission_error, render_error, list_to_string, \
    get_fileserver_root, gen_shared_upload_link, is_org_context, \
    gen_dir_share_link, gen_file_share_link, get_repo_last_modify, \
    calculate_repos_last_modify, get_file_type_and_ext, get_user_repos, \
    EMPTY_SHA1, normalize_file_path, gen_file_upload_url, \
    get_file_revision_id_size, get_ccnet_server_addr_port, \
    gen_file_get_url, string2list, MAX_INT, IS_EMAIL_CONFIGURED, \
    EVENTS_ENABLED, get_user_events, get_org_user_events, show_delete_days, \
    TRAFFIC_STATS_ENABLED, get_user_traffic_stat, new_merge_with_no_conflict, \
    user_traffic_over_limit, send_perm_audit_msg, get_origin_repo_info, \
    is_org_context, get_max_upload_file_size, is_pro_version
from seahub.utils.paginator import get_page_range
from seahub.utils.star import get_dir_starred_files
from seahub.utils.timeutils import utc_to_local
from seahub.views.modules import MOD_PERSONAL_WIKI, enable_mod_for_user, \
    disable_mod_for_user
from seahub.utils.devices import get_user_devices, do_unlink_device
import seahub.settings as settings
from seahub.settings import FILE_PREVIEW_MAX_SIZE, INIT_PASSWD, USE_PDFJS, \
    FILE_ENCODING_LIST, FILE_ENCODING_TRY_LIST, AVATAR_FILE_STORAGE, \
    SEND_EMAIL_ON_ADDING_SYSTEM_MEMBER, SEND_EMAIL_ON_RESETTING_USER_PASSWD, \
    ENABLE_SUB_LIBRARY, ENABLE_FOLDER_PERM

from constance import config

# Get an instance of a logger
logger = logging.getLogger(__name__)

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

_default_repo_id = None
def get_system_default_repo_id():
    global _default_repo_id
    if not _default_repo_id:
        try:
            _default_repo_id = seaserv.seafserv_threaded_rpc.get_system_default_repo_id()
        except SearpcError as e:
            logger.error(e)
    return _default_repo_id

def check_folder_permission(request, repo_id, path):
    """Check repo/folder access permission of a user, always return 'rw'
    when repo is system repo and user is admin.

    Arguments:
    - `request`:
    - `repo_id`:
    - `path`:
    """
    username = request.user.username
    if request.user.is_staff and get_system_default_repo_id() == repo_id:
        return 'rw'

    return seafile_api.check_permission_by_path(repo_id, path, username)

def check_file_permission(request, repo_id, path):
    """Check file access permission of a user, always return 'rw'
    when repo is system repo and user is admin.

    Arguments:
    - `request`:
    - `repo_id`:
    - `path`:
    """
    username = request.user.username
    if get_system_default_repo_id() == repo_id and request.user.is_staff:
        return 'rw'

    return seafile_api.check_permission_by_path(repo_id, path, username)

def check_file_lock(repo_id, file_path, username):
    """ check if file is locked to current user
    according to returned value of seafile_api.check_file_lock:

    0: not locked
    1: locked by other
    2: locked by me
    -1: error

    return (is_locked, locked_by_me)
    """
    try:
        return_value = seafile_api.check_file_lock(repo_id,
            file_path.lstrip('/'), username)
    except SearpcError as e:
        logger.error(e)
        return (None, None)

    if return_value == 0:
        return (False, False)
    elif return_value == 1:
        return (True , False)
    elif return_value == 2:
        return (True, True)
    else:
        return (None, None)

def check_repo_access_permission(repo_id, user):
    """Check repo access permission of a user, always return 'rw' when repo is
    system repo and user is admin.

    Arguments:
    - `repo_id`:
    - `user`:
    """
    if user.is_staff and get_system_default_repo_id() == repo_id:
        return 'rw'
    else:
        return seafile_api.check_repo_access_permission(repo_id, user.username)

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

def get_file_download_link(repo_id, obj_id, path):
    """Generate file download link.

    Arguments:
    - `repo_id`:
    - `obj_id`:
    - `filename`:
    """
    return reverse('download_file', args=[repo_id, obj_id]) + '?p=' + \
        urlquote(path)

def get_repo_dirents_with_perm(request, repo, commit, path, offset=-1, limit=-1):
    """List repo dirents with perm based on commit id and path.
    Use ``offset`` and ``limit`` to do paginating.

    Returns: A tupple of (file_list, dir_list, dirent_more)

    TODO: Some unrelated parts(file sharing, stars, modified info, etc) need
    to be pulled out to multiple functions.
    """

    if get_system_default_repo_id() == repo.id:
        return get_repo_dirents(request, repo, commit, path, offset, limit)

    dir_list = []
    file_list = []
    dirent_more = False
    username = request.user.username
    if commit.root_id == EMPTY_SHA1:
        return ([], [], False) if limit == -1 else ([], [], False)
    else:
        try:
            dir_id = seafile_api.get_dir_id_by_path(repo.id, path)
            if not dir_id:
                return ([], [], False)
            dirs = seafserv_threaded_rpc.list_dir_with_perm(repo.id, path,
                                                            dir_id, username,
                                                            offset, limit)
        except SearpcError as e:
            logger.error(e)
            return ([], [], False)

        if limit != -1 and limit == len(dirs):
            dirent_more = True

        starred_files = get_dir_starred_files(username, repo.id, path)
        fileshares = FileShare.objects.filter(repo_id=repo.id).filter(username=username)
        uploadlinks = UploadLinkShare.objects.filter(repo_id=repo.id).filter(username=username)

        view_dir_base = reverse('repo', args=[repo.id])
        dl_dir_base = reverse('repo_download_dir', args=[repo.id])
        view_file_base = reverse('repo_view_file', args=[repo.id])
        file_history_base = reverse('file_revisions', args=[repo.id])
        for dirent in dirs:
            dirent.last_modified = dirent.mtime
            dirent.sharelink = ''
            dirent.uploadlink = ''
            if stat.S_ISDIR(dirent.props.mode):
                dpath = posixpath.join(path, dirent.obj_name)
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
                p_dpath = posixpath.join(path, dirent.obj_name)
                dirent.view_link = view_dir_base + '?p=' + urlquote(p_dpath)
                dirent.dl_link = dl_dir_base + '?p=' + urlquote(p_dpath)
                dir_list.append(dirent)
            else:
                file_list.append(dirent)
                if repo.version == 0:
                    dirent.file_size = get_file_size(repo.store_id, repo.version, dirent.obj_id)
                else:
                    dirent.file_size = dirent.size
                dirent.starred = False
                fpath = posixpath.join(path, dirent.obj_name)
                p_fpath = posixpath.join(path, dirent.obj_name)
                dirent.view_link = view_file_base + '?p=' + urlquote(p_fpath)
                dirent.dl_link = get_file_download_link(repo.id, dirent.obj_id,
                                                        p_fpath)
                dirent.history_link = file_history_base + '?p=' + urlquote(p_fpath)
                if fpath in starred_files:
                    dirent.starred = True
                for share in fileshares:
                    if fpath == share.path:
                        dirent.sharelink = gen_file_share_link(share.token)
                        dirent.sharetoken = share.token
                        break

        return (file_list, dir_list, dirent_more)

def get_repo_dirents(request, repo, commit, path, offset=-1, limit=-1):
    """List repo dirents based on commit id and path. Use ``offset`` and
    ``limit`` to do paginating.

    Returns: A tupple of (file_list, dir_list, dirent_more)

    TODO: Some unrelated parts(file sharing, stars, modified info, etc) need
    to be pulled out to multiple functions.
    """

    dir_list = []
    file_list = []
    dirent_more = False
    if commit.root_id == EMPTY_SHA1:
        return ([], [], False) if limit == -1 else ([], [], False)
    else:
        try:
            dirs = seafile_api.list_dir_by_commit_and_path(commit.repo_id,
                                                           commit.id, path,
                                                           offset, limit)
            if not dirs:
                return ([], [], False)
        except SearpcError as e:
            logger.error(e)
            return ([], [], False)

        if limit != -1 and limit == len(dirs):
            dirent_more = True

        username = request.user.username
        starred_files = get_dir_starred_files(username, repo.id, path)
        fileshares = FileShare.objects.filter(repo_id=repo.id).filter(username=username)
        uploadlinks = UploadLinkShare.objects.filter(repo_id=repo.id).filter(username=username)

        view_dir_base = reverse('repo', args=[repo.id])
        dl_dir_base = reverse('repo_download_dir', args=[repo.id])
        file_history_base = reverse('file_revisions', args=[repo.id])
        for dirent in dirs:
            dirent.last_modified = dirent.mtime
            dirent.sharelink = ''
            dirent.uploadlink = ''
            if stat.S_ISDIR(dirent.props.mode):
                dpath = posixpath.join(path, dirent.obj_name)
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
                p_dpath = posixpath.join(path, dirent.obj_name)
                dirent.view_link = view_dir_base + '?p=' + urlquote(p_dpath)
                dirent.dl_link = dl_dir_base + '?p=' + urlquote(p_dpath)
                dir_list.append(dirent)
            else:
                file_list.append(dirent)
                if repo.version == 0:
                    dirent.file_size = get_file_size(repo.store_id, repo.version, dirent.obj_id)
                else:
                    dirent.file_size = dirent.size
                dirent.starred = False
                fpath = posixpath.join(path, dirent.obj_name)
                p_fpath = posixpath.join(path, dirent.obj_name)
                dirent.view_link = reverse('view_lib_file', args=[repo.id, urlquote(p_fpath)])
                dirent.dl_link = get_file_download_link(repo.id, dirent.obj_id,
                                                        p_fpath)
                dirent.history_link = file_history_base + '?p=' + urlquote(p_fpath)
                if fpath in starred_files:
                    dirent.starred = True
                for share in fileshares:
                    if fpath == share.path:
                        dirent.sharelink = gen_file_share_link(share.token)
                        dirent.sharetoken = share.token
                        break

        return (file_list, dir_list, dirent_more)

def get_unencry_rw_repos_by_user(request):
    """Get all unencrypted repos the user can read and write.
    """
    username = request.user.username

    def has_repo(repos, repo):
        for r in repos:
            if repo.id == r.id:
                return True
        return False

    org_id = request.user.org.org_id if is_org_context(request) else None
    owned_repos, shared_repos, groups_repos, public_repos = get_user_repos(
        username, org_id=org_id)

    accessible_repos = []

    for r in owned_repos:
        if not has_repo(accessible_repos, r) and not r.encrypted:
            accessible_repos.append(r)

    for r in shared_repos + groups_repos + public_repos:
        if not has_repo(accessible_repos, r) and not r.encrypted:
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
    except SearpcError as e:
        logger.error(e)
        messages.error(request, _('Internal server error'))
        referer = request.META.get('HTTP_REFERER', None)
        next = settings.SITE_ROOT if referer is None else referer
        return HttpResponseRedirect(next)

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

    username = request.user.username
    if is_org_context(request):
        repo_owner = seafile_api.get_org_repo_owner(repo.id)
    else:
        repo_owner = seafile_api.get_repo_owner(repo.id)
    is_repo_owner = True if repo_owner == username else False

    enable_clean = False
    if is_repo_owner:
        enable_clean = True

    return render_to_response('repo_recycle_view.html', {
            'show_recycle_root': True,
            'repo': repo,
            'dir_list': dir_list,
            'file_list': file_list,
            'days': days,
            'enable_clean': enable_clean,
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

    try:
        commit = seafserv_threaded_rpc.get_commit(repo.id, repo.version, commit_id)
    except SearpcError as e:
        logger.error(e)
        messages.error(request, _('Internal server error'))
        referer = request.META.get('HTTP_REFERER', None)
        next = settings.SITE_ROOT if referer is None else referer
        return HttpResponseRedirect(next)

    if not commit:
        raise Http404

    zipped = gen_path_link(path, '')
    file_list, dir_list, dirent_more = get_repo_dirents(request, repo, commit,
                                                        basedir + path)

    days = show_delete_days(request)

    username = request.user.username
    if is_org_context(request):
        repo_owner = seafile_api.get_org_repo_owner(repo.id)
    else:
        repo_owner = seafile_api.get_repo_owner(repo.id)
    is_repo_owner = True if repo_owner == username else False

    enable_clean = False
    if is_repo_owner:
        enable_clean = True

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
            'enable_clean': enable_clean,
            }, context_instance=RequestContext(request))

def render_dir_recycle_root(request, repo_id, dir_path):
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    days = show_delete_days(request)

    try:
        deleted_entries = seafserv_threaded_rpc.get_deleted(repo_id,
                                                            days,
                                                            dir_path)
    except SearpcError as e:
        logger.error(e)
        messages.error(request, _('Internal server error'))
        referer = request.META.get('HTTP_REFERER', None)
        next = settings.SITE_ROOT if referer is None else referer
        return HttpResponseRedirect(next)

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

    return render_to_response('dir_recycle_view.html', {
            'show_recycle_root': True,
            'repo': repo,
            'dir_list': dir_list,
            'file_list': file_list,
            'days': days,
            'dir_name': os.path.basename(dir_path.rstrip('/')),
            'dir_path': dir_path,
            }, context_instance=RequestContext(request))

def render_dir_recycle_dir(request, repo_id, commit_id, dir_path):
    basedir = request.GET.get('base', '')
    path = request.GET.get('p', '')
    if not basedir or not path:
        return render_dir_recycle_root(request, repo_id, dir_path)

    if basedir[0] != '/':
        basedir = '/' + basedir
    if path[-1] != '/':
        path += '/'

    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    try :
        commit = seafserv_threaded_rpc.get_commit(repo.id, repo.version, commit_id)
    except SearpcError as e:
        logger.error(e)
        messages.error(request, _('Internal server error'))
        referer = request.META.get('HTTP_REFERER', None)
        next = settings.SITE_ROOT if referer is None else referer
        return HttpResponseRedirect(next)

    if not commit:
        raise Http404

    zipped = gen_path_link(path, '')
    file_list, dir_list, dirent_more = get_repo_dirents(request, repo, commit,
                                                        basedir + path)

    days = show_delete_days(request)

    return render_to_response('dir_recycle_view.html', {
            'show_recycle_root': False,
            'repo': repo,
            'zipped': zipped,
            'dir_list': dir_list,
            'file_list': file_list,
            'commit_id': commit_id,
            'basedir': basedir,
            'path': path,
            'days': days,
            'dir_name': os.path.basename(dir_path.rstrip('/')),
            'dir_path': dir_path,
            }, context_instance=RequestContext(request))

@login_required
def repo_recycle_view(request, repo_id):
    if check_folder_permission(request, repo_id, '/') != 'rw':
        return render_permission_error(request, _(u'Unable to view recycle page'))

    commit_id = request.GET.get('commit_id', '')
    if not commit_id:
        return render_recycle_root(request, repo_id)
    else:
        return render_recycle_dir(request, repo_id, commit_id)

@login_required
def dir_recycle_view(request, repo_id):
    dir_path = request.GET.get('dir_path', '')
    if check_folder_permission(request, repo_id, dir_path) != 'rw':
        return render_permission_error(request, _(u'Unable to view recycle page'))

    commit_id = request.GET.get('commit_id', '')
    if not commit_id:
        return render_dir_recycle_root(request, repo_id, dir_path)
    else:
        return render_dir_recycle_dir(request, repo_id, commit_id, dir_path)

@login_required
def repo_online_gc(request, repo_id):
    if request.method != 'POST':
        raise Http404

    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    referer = request.META.get('HTTP_REFERER', None)
    next = settings.SITE_ROOT if referer is None else referer

    username = request.user.username
    if is_org_context(request):
        repo_owner = seafile_api.get_org_repo_owner(repo.id)
    else:
        repo_owner = seafile_api.get_repo_owner(repo.id)
    is_repo_owner = True if repo_owner == username else False
    if not is_repo_owner:
        messages.error(request, _('Permission denied'))
        return HttpResponseRedirect(next)

    day = int(request.POST.get('day'))
    try:
        seafile_api.clean_up_repo_history(repo.id, day)
    except SearpcError as e:
        logger.error(e)
        messages.error(request, _('Internal server error'))
        return HttpResponseRedirect(next)

    return HttpResponseRedirect(next)

def can_access_repo_setting(request, repo_id, username):
    repo = seafile_api.get_repo(repo_id)
    if not repo:
        return (False, None)

    # no settings for virtual repo
    if ENABLE_SUB_LIBRARY and repo.is_virtual:
        return (False, None)

    # check permission
    if is_org_context(request):
        repo_owner = seafile_api.get_org_repo_owner(repo_id)
    else:
        repo_owner = seafile_api.get_repo_owner(repo_id)
    is_owner = True if username == repo_owner else False
    if not is_owner:
        return (False, None)

    return (True, repo)

@login_required
def repo_basic_info(request, repo_id):
    """List and change library basic info.
    """
    username = request.user.username
    can_access, repo = can_access_repo_setting(request, repo_id, username)

    if not can_access:
        raise Http404

    history_limit = seaserv.get_repo_history_limit(repo.id)
    full_history_checked = no_history_checked = partial_history_checked = False
    if history_limit > 0:
        partial_history_checked = True
    elif history_limit == 0:
        no_history_checked = True
    else:
        full_history_checked = True

    full_history_enabled = no_history_enabled = partial_history_enabled = True
    days_enabled = True
    if not config.ENABLE_REPO_HISTORY_SETTING:
        full_history_enabled = no_history_enabled = partial_history_enabled = False
        days_enabled = False

    if history_limit <= 0:
        days_enabled = False

    return render_to_response('repo_basic_info.html', {
            'repo': repo,
            'history_limit': history_limit if history_limit > 0 else '',
            'full_history_checked': full_history_checked,
            'no_history_checked': no_history_checked,
            'partial_history_checked': partial_history_checked,
            'full_history_enabled': full_history_enabled,
            'no_history_enabled': no_history_enabled,
            'partial_history_enabled': partial_history_enabled,
            'days_enabled': days_enabled,
            'ENABLE_FOLDER_PERM': ENABLE_FOLDER_PERM,
            }, context_instance=RequestContext(request))

@login_required
def repo_transfer_owner(request, repo_id):
    """Show transfer repo owner page.
    """
    username = request.user.username
    can_access, repo = can_access_repo_setting(request, repo_id, username)

    if not can_access:
        raise Http404

    return render_to_response('repo_transfer_owner.html', {
            'repo': repo,
            'ENABLE_FOLDER_PERM': ENABLE_FOLDER_PERM,
            }, context_instance=RequestContext(request))

def repo_transfer_success(request, repo_id):

    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    return render_to_response('repo_transfer_success.html', {
            'repo': repo,
            }, context_instance=RequestContext(request))

@login_required
def repo_change_password(request, repo_id):
    """Show change library password page.
    """
    username = request.user.username
    can_access, repo = can_access_repo_setting(request, repo_id, username)

    if not can_access:
        raise Http404

    return render_to_response('repo_change_password.html', {
            'repo': repo,
            'repo_password_min_length': config.REPO_PASSWORD_MIN_LENGTH,
            'ENABLE_FOLDER_PERM': ENABLE_FOLDER_PERM,
            }, context_instance=RequestContext(request))

@login_required
def repo_shared_link(request, repo_id):
    """List and change library shared links.
    """
    username = request.user.username
    can_access, repo = can_access_repo_setting(request, repo_id, username)

    if not can_access:
        raise Http404

    # download links
    fileshares = FileShare.objects.filter(repo_id=repo_id)
    p_fileshares = []
    for fs in fileshares:
        if fs.is_file_share_link():
            if seafile_api.get_file_id_by_path(repo.id, fs.path) is None:
                fs.delete()
                continue
            fs.filename = os.path.basename(fs.path)
            fs.shared_link = gen_file_share_link(fs.token)

            path = fs.path.rstrip('/')  # Normalize file path
            obj_id = seafile_api.get_file_id_by_path(repo.id, path)
            fs.filesize = seafile_api.get_file_size(repo.store_id, repo.version,
                                                obj_id)
        else:
            if seafile_api.get_dir_id_by_path(repo.id, fs.path) is None:
                fs.delete()
                continue
            if fs.path != '/':
                fs.filename = os.path.basename(fs.path.rstrip('/'))
            else:
                fs.filename = fs.path
            fs.shared_link = gen_dir_share_link(fs.token)

            path = fs.path
            if path[-1] != '/':         # Normalize dir path
                path += '/'
            #get dir size
            dir_id = seafserv_threaded_rpc.get_dirid_by_path(
                repo.id, repo.head_cmmt_id, path)
            fs.filesize = seafserv_threaded_rpc.get_dir_size(repo.store_id,
                                                         repo.version, dir_id)
        p_fileshares.append(fs)

    # upload links
    uploadlinks = UploadLinkShare.objects.filter(repo_id=repo_id)
    p_uploadlinks = []
    for link in uploadlinks:
        if seafile_api.get_dir_id_by_path(repo.id, link.path) is None:
            link.delete()
            continue
        if link.path != '/':
            link.dir_name = os.path.basename(link.path.rstrip('/'))
        else:
            link.dir_name = link.path
        link.shared_link = gen_shared_upload_link(link.token)
        p_uploadlinks.append(link)

    return render_to_response('repo_shared_link.html', {
            'repo': repo,
            'fileshares': p_fileshares,
            'uploadlinks': p_uploadlinks,
            'ENABLE_FOLDER_PERM': ENABLE_FOLDER_PERM,
            }, context_instance=RequestContext(request))

@login_required
def repo_share_manage(request, repo_id):
    """Manage share of this library.
    """
    username = request.user.username
    can_access, repo = can_access_repo_setting(request, repo_id, username)

    if not can_access:
        raise Http404

    # sharing management
    repo_share_user = []
    repo_share_group = []

    if is_org_context(request):
        org_id = request.user.org.org_id
        repo_share_user = seafile_api.get_org_share_out_repo_list(org_id, username, -1, -1)
        repo_share_group = seafserv_threaded_rpc.get_org_group_repos_by_owner(org_id, username)
    else:
        repo_share_user = seafile_api.get_share_out_repo_list(username, -1, -1)
        repo_share_group = seaserv.get_group_repos_by_owner(username)

    repo_share_user = filter(lambda i: i.repo_id == repo_id, repo_share_user)
    repo_share_group = filter(lambda i: i.repo_id == repo_id, repo_share_group)
    for share in repo_share_group:
        share.group_name = get_group(share.group_id).group_name

    return render_to_response('repo_share_manage.html', {
            'repo': repo,
            'repo_share_user': repo_share_user,
            'repo_share_group': repo_share_group,
            'ENABLE_FOLDER_PERM': ENABLE_FOLDER_PERM,
            }, context_instance=RequestContext(request))

@login_required
def repo_folder_perm(request, repo_id):
    """Manage folder permmission of this library.
    """
    username = request.user.username
    can_access, repo = can_access_repo_setting(request, repo_id, username)

    if not can_access or not ENABLE_FOLDER_PERM:
        raise Http404

    def not_need_delete(perm):
        repo_id = perm.repo_id
        path = perm.path
        group_id = perm.group_id if hasattr(perm, 'group_id') else None
        email = perm.user if hasattr(perm, 'user') else None

        repo = get_repo(repo_id)
        dir_id = seafile_api.get_dir_id_by_path(repo_id, path)

        if group_id is not None:
            # is a group folder perm
            group = get_group(group_id)
            if repo is None or dir_id is None or group is None:
                seafile_api.rm_folder_group_perm(repo_id, path, group_id)
                return False

        if email is not None:
            # is a user folder perm
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                user = None

            if repo is None or dir_id is None or user is None:
                seafile_api.rm_folder_user_perm(repo_id, path, email)
                return False

        return True

    # for user folder permission
    user_folder_perms = seafile_api.list_folder_user_perm_by_repo(repo_id)
    user_folder_perms = filter(lambda x: not_need_delete(x), user_folder_perms)

    user_folder_perms.reverse()

    for folder_perm in user_folder_perms:
        folder_path = folder_perm.path
        folder_perm.folder_link = reverse('repo', args=[repo_id]) + '?p=' + urlquote(folder_path)
        if folder_path == '/':
            folder_perm.folder_name = _(u'Root Directory')
        else:
            folder_perm.folder_name = os.path.basename(folder_path)

    # for group folder permission
    group_folder_perms = seafile_api.list_folder_group_perm_by_repo(repo_id)
    group_folder_perms = filter(lambda x: not_need_delete(x), group_folder_perms)

    group_folder_perms.reverse()

    for folder_perm in group_folder_perms:
        folder_path = folder_perm.path
        folder_perm.folder_link = reverse('repo', args=[repo_id]) + '?p=' + urlquote(folder_path)
        if folder_path == '/':
            folder_perm.folder_name = _(u'Root Directory')
        else:
            folder_perm.folder_name = os.path.basename(folder_path)

        folder_perm.group_name = get_group(folder_perm.group_id).group_name

    # contacts that already registered
    sys_contacts = []
    contacts = Contact.objects.get_contacts_by_user(username)
    for contact in contacts:
        try:
            user = User.objects.get(email = contact.contact_email)
        except User.DoesNotExist:
            user = None

        if user is not None:
            sys_contacts.append(contact.contact_email)

    return render_to_response('repo_folder_perm.html', {
            'repo': repo,
            'user_folder_perms': user_folder_perms,
            'group_folder_perms': group_folder_perms,
            'contacts': sys_contacts,
            }, context_instance=RequestContext(request))

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
    user_perm = check_repo_access_permission(repo_id, request.user)
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
    for c in commits:
        c.show = False if new_merge_with_no_conflict(c) else True

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
@require_POST
def repo_revert_history(request, repo_id):

    next = request.META.get('HTTP_REFERER', None)
    if not next:
        next = settings.SITE_ROOT

    repo = get_repo(repo_id)
    if not repo:
        messages.error(request, _("Library does not exist"))
        return HttpResponseRedirect(next)

    # perm check
    perm = check_repo_access_permission(repo.id, request.user)
    username = request.user.username
    repo_owner = seafile_api.get_repo_owner(repo.id)

    if perm is None or repo_owner != username:
        messages.error(request, _("Permission denied"))
        return HttpResponseRedirect(next)

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

    return HttpResponseRedirect(next)

def fpath_to_link(repo_id, path, is_dir=False):
    """Translate file path of a repo to its view link"""
    if is_dir:
        href = reverse("view_common_lib_dir", args=[repo_id, urllib2.quote(path.encode('utf-8')).strip('/')])
    else:
        if not path.startswith('/'):
            p = '/' + path
        href = reverse("view_lib_file", args=[repo_id, urllib2.quote(p.encode('utf-8'))])

    return '<a href="%s">%s</a>' % (href, escape(path))

def get_diff(repo_id, arg1, arg2):
    lists = {'new': [], 'removed': [], 'renamed': [], 'modified': [],
             'newdir': [], 'deldir': []}

    diff_result = seafserv_threaded_rpc.get_diff(repo_id, arg1, arg2)
    if not diff_result:
        return lists

    for d in diff_result:
        if d.status == "add":
            lists['new'].append(fpath_to_link(repo_id, d.name))
        elif d.status == "del":
            lists['removed'].append(escape(d.name))
        elif d.status == "mov":
            lists['renamed'].append(escape(d.name) + " ==> " + fpath_to_link(repo_id, d.new_name))
        elif d.status == "mod":
            lists['modified'].append(fpath_to_link(repo_id, d.name))
        elif d.status == "newdir":
            lists['newdir'].append(fpath_to_link(repo_id, d.name, is_dir=True))
        elif d.status == "deldir":
            lists['deldir'].append(escape(d.name))

    return lists

def create_default_library(request):
    """Create a default library for user.

    Arguments:
    - `username`:
    """
    username = request.user.username
    if is_org_context(request):
        org_id = request.user.org.org_id
        default_repo = seafile_api.create_org_repo(name=_("My Library"),
                                                   desc=_("My Library"),
                                                   username=username,
                                                   passwd=None,
                                                   org_id=org_id)
    else:
        default_repo = seafile_api.create_repo(name=_("My Library"),
                                               desc=_("My Library"),
                                               username=username,
                                               passwd=None)
    sys_repo_id = get_system_default_repo_id()
    if sys_repo_id is None:
        return

    try:
        dirents = seafile_api.list_dir_by_path(sys_repo_id, '/')
        for e in dirents:
            obj_name = e.obj_name
            seafile_api.copy_file(sys_repo_id, '/', obj_name,
                                  default_repo, '/', obj_name, username, 0)
    except SearpcError as e:
        logger.error(e)
        return

    UserOptions.objects.set_default_repo(username, default_repo)

    return default_repo

def get_owned_repo_list(request):
    """List owned repos.
    """
    username = request.user.username
    if is_org_context(request):
        org_id = request.user.org.org_id
        return seafile_api.get_org_owned_repo_list(org_id, username)
    else:
        return seafile_api.get_owned_repo_list(username)

def get_virtual_repos_by_owner(request):
    """List virtual repos.

    Arguments:
    - `request`:
    """
    username = request.user.username
    if is_org_context(request):
        org_id = request.user.org.org_id
        return seaserv.seafserv_threaded_rpc.get_org_virtual_repos_by_owner(
            org_id, username)
    else:
        return seafile_api.get_virtual_repos_by_owner(username)

@login_required
@user_mods_check
def myhome(request):
    return HttpResponseRedirect(reverse('libraries'))

@login_required
@user_mods_check
def libraries(request):
    """
    New URL to replace myhome
    """
    username = request.user.username

    # options
    if request.cloud_mode and request.user.org is None:
        allow_public_share = False
    else:
        allow_public_share = True
    sub_lib_enabled = UserOptions.objects.is_sub_lib_enabled(username)
    max_upload_file_size = get_max_upload_file_size()
    guide_enabled = UserOptions.objects.is_user_guide_enabled(username)
    if guide_enabled:
        if request.user.permissions.can_add_repo():
            create_default_library(request)
        # only show guide once
        UserOptions.objects.disable_user_guide(username)

    folder_perm_enabled = True if is_pro_version() and ENABLE_FOLDER_PERM else False
    return render_to_response('libraries.html', {
            "allow_public_share": allow_public_share,
            "guide_enabled": guide_enabled,
            "sub_lib_enabled": sub_lib_enabled,
            'enable_upload_folder': settings.ENABLE_UPLOAD_FOLDER,
            'enable_resumable_fileupload': settings.ENABLE_RESUMABLE_FILEUPLOAD,
            'enable_thumbnail': settings.ENABLE_THUMBNAIL,
            'enable_encrypted_library': config.ENABLE_ENCRYPTED_LIBRARY,
            'max_upload_file_size': max_upload_file_size,
            'folder_perm_enabled': folder_perm_enabled,
            'is_pro': True if is_pro_version() else False,
            }, context_instance=RequestContext(request))

@login_required
@user_mods_check
def starred(request):
    """List starred files.

    Arguments:
    - `request`:
    """
    username = request.user.username
    starred_files = UserStarredFiles.objects.get_starred_files_by_username(
        username)

    return render_to_response('starred.html', {
            "starred_files": starred_files,
            }, context_instance=RequestContext(request))


@login_required
@user_mods_check
def devices(request):
    """List user devices"""
    username = request.user.username
    user_devices = get_user_devices(username)

    return render_to_response('devices.html', {
            "devices": user_devices,
            }, context_instance=RequestContext(request))

@login_required_ajax
@require_POST
def unlink_device(request):
    content_type = 'application/json; charset=utf-8'

    platform = request.POST.get('platform', '')
    device_id = request.POST.get('device_id', '')

    if not platform or not device_id:
        return HttpResponseBadRequest(json.dumps({'error': _(u'Argument missing')}),
                content_type=content_type)

    try:
        do_unlink_device(request.user.username, platform, device_id)
    except:
        return HttpResponse(json.dumps({'error': _(u'Internal server error')}),
                status=500, content_type=content_type)

    return HttpResponse(json.dumps({'success': True}), content_type=content_type)

@login_required
@require_POST
def unsetinnerpub(request, repo_id):
    """Unshare repos in organization or in share admin page.

    Only system admin, organization admin or repo owner can perform this op.
    """
    repo = get_repo(repo_id)
    perm = request.GET.get('permission', None)
    if perm is None:
        return render_error(request, _(u'Argument is not valid'))
    if not repo:
        messages.error(request, _('Failed to unshare the library, as it does not exist.'))
        return HttpResponseRedirect(reverse('share_admin'))

    # permission check
    username = request.user.username
    if is_org_context(request):
        org_id = request.user.org.org_id
        repo_owner = seafile_api.get_org_repo_owner(repo.id)
        is_repo_owner = True if repo_owner == username else False
        if not (request.user.org.is_staff or is_repo_owner):
            raise Http404
    else:
        repo_owner = seafile_api.get_repo_owner(repo.id)
        is_repo_owner = True if repo_owner == username else False
        if not (request.user.is_staff or is_repo_owner):
            raise Http404

    try:
        if is_org_context(request):
            org_id = request.user.org.org_id
            seaserv.seafserv_threaded_rpc.unset_org_inner_pub_repo(org_id,
                                                                   repo.id)
        else:
            seaserv.unset_inner_pub_repo(repo.id)

            origin_repo_id, origin_path = get_origin_repo_info(repo.id)
            if origin_repo_id is not None:
                perm_repo_id = origin_repo_id
                perm_path = origin_path
            else:
                perm_repo_id = repo.id
                perm_path =  '/'

            send_perm_audit_msg('delete-repo-perm', username, 'all',
                                perm_repo_id, perm_path, perm)

        messages.success(request, _('Unshare "%s" successfully.') % repo.name)
    except SearpcError:
        messages.error(request, _('Failed to unshare "%s".') % repo.name)

    referer = request.META.get('HTTP_REFERER', None)
    next = settings.SITE_ROOT if referer is None else referer

    return HttpResponseRedirect(next)

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
def file_upload_progress_page(request):
    '''
    As iframe in repo_upload_file.html, for solving problem in chrome.

    '''
    uuid = request.GET.get('uuid', '')
    fileserver_root = get_fileserver_root()
    upload_progress_con_id = request.GET.get('upload_progress_con_id', '')
    return render_to_response('file_upload_progress_page.html', {
            'uuid': uuid,
            'fileserver_root': fileserver_root,
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

def render_file_revisions (request, repo_id):
    """List all history versions of a file."""

    days_str = request.GET.get('days', '')
    try:
        days = int(days_str)
    except ValueError:
        days = 7

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
        commits = seafile_api.get_file_revisions(repo_id, path, -1, -1, days)
    except SearpcError, e:
        logger.error(e.msg)
        return render_error(request, e.msg)

    if not commits:
        return render_error(request, _(u'No revisions found'))

    # Check whether user is repo owner
    if validate_owner(request, repo_id):
        is_owner = True
    else:
        is_owner = False

    cur_path = path
    for commit in commits:
        commit.path = cur_path
        if commit.rev_renamed_old_path:
            cur_path = '/' + commit.rev_renamed_old_path

    zipped = gen_path_link(path, repo.name)

    can_revert_file = True
    username = request.user.username

    is_locked, locked_by_me = check_file_lock(repo_id, path, username)
    if seafile_api.check_permission_by_path(repo_id, path, username) != 'rw' or \
        (is_locked and not locked_by_me):
        can_revert_file = False

    return render_to_response('file_revisions.html', {
        'repo': repo,
        'path': path,
        'u_filename': u_filename,
        'zipped': zipped,
        'commits': commits,
        'is_owner': is_owner,
        'can_compare': can_compare,
        'can_revert_file': can_revert_file,
        'days': days,
        }, context_instance=RequestContext(request))

@login_required
@require_POST
def repo_revert_file(request, repo_id):
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    commit_id = request.GET.get('commit')
    path      = request.GET.get('p')
    from_page = request.GET.get('from')

    if not (commit_id and path and from_page):
        return render_error(request, _(u"Invalid arguments"))

    referer = request.META.get('HTTP_REFERER', None)
    next = settings.SITE_ROOT if referer is None else referer

    username = request.user.username
    # perm check
    if check_folder_permission(request, repo.id, path) != 'rw':
        messages.error(request, _("Permission denied"))
        return HttpResponseRedirect(next)

    is_locked, locked_by_me = check_file_lock(repo_id, path, username)
    if (is_locked, locked_by_me) == (None, None):
        messages.error(request, _("Check file lock error"))
        return HttpResponseRedirect(next)

    if is_locked and not locked_by_me:
        messages.error(request, _("File is locked"))
        return HttpResponseRedirect(next)

    try:
        ret = seafile_api.revert_file(repo_id, commit_id, path, username)
    except Exception as e:
        logger.error(e)
        messages.error(request, _('Failed to restore, please try again later.'))
        return HttpResponseRedirect(next)
    else:
        if from_page == 'repo_history':
            # When revert file from repo history, we redirect to repo history
            url = reverse('repo', args=[repo_id]) + u'?commit_id=%s&history=y' % commit_id
        elif from_page == 'recycle':
            # When revert from repo recycle page, redirect to recycle page.
            url = reverse('repo_recycle_view', args=[repo_id])
        elif from_page == 'dir_recycle':
            # When revert from dir recycle page, redirect to recycle page.
            dir_path = request.GET.get('dir_path', '')
            url = next if not dir_path else reverse('dir_recycle_view', args=[repo_id]) + '?dir_path=' + urlquote(dir_path)
        else:
            # When revert file from file history, we reload page
            url = next

        if ret == 1:
            root_url = reverse('view_common_lib_dir', args=[repo_id, '/'])
            msg = _(u'Successfully revert %(path)s to <a href="%(root)s">root directory.</a>') % {"path": escape(path.lstrip('/')), "root": root_url}
            messages.success(request, msg, extra_tags='safe')
        else:
            file_view_url = reverse('view_lib_file', args=[repo_id, urllib2.quote(path.encode('utf-8'))])
            msg = _(u'Successfully revert <a href="%(url)s">%(path)s</a>') % {"url": file_view_url, "path": escape(path.lstrip('/'))}
            messages.success(request, msg, extra_tags='safe')
        return HttpResponseRedirect(url)

@login_required
@require_POST
def repo_revert_dir(request, repo_id):
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    commit_id = request.GET.get('commit')
    path      = request.GET.get('p')
    from_page = request.GET.get('from')

    if not (commit_id and path and from_page):
        return render_error(request, _(u"Invalid arguments"))

    referer = request.META.get('HTTP_REFERER', None)
    next = settings.SITE_ROOT if referer is None else referer

    # perm check
    if check_folder_permission(request, repo.id, path) != 'rw':
        messages.error(request, _("Permission denied"))
        return HttpResponseRedirect(next)

    try:
        ret = seafile_api.revert_dir(repo_id, commit_id, path, request.user.username)
    except Exception as e:
        logger.error(e)
        messages.error(request, _('Failed to restore, please try again later.'))
        return HttpResponseRedirect(next)
    else:
        if from_page == 'repo_history':
            # When revert file from repo history, we redirect to repo history
            url = reverse('repo', args=[repo_id]) + u'?commit_id=%s&history=y' % commit_id
        elif from_page == 'recycle':
            # When revert from repo recycle page, redirect to recycle page.
            url = reverse('repo_recycle_view', args=[repo_id])
        elif from_page == 'dir_recycle':
            # When revert from dir recycle page, redirect to dir recycle page.
            dir_path = request.GET.get('dir_path', '')
            url = next if not dir_path else reverse('dir_recycle_view', args=[repo_id]) + '?dir_path=' + urlquote(dir_path)
        else:
            # When revert file from file history, we redirect to parent dir of this file
            parent_dir = os.path.dirname(path)
            url = reverse('repo', args=[repo_id]) + ('?p=%s' % urllib2.quote(parent_dir.encode('utf-8')))

        if ret == 1:
            root_url = reverse('repo', args=[repo_id]) + u'?p=/'
            msg = _(u'Successfully revert %(path)s to <a href="%(url)s">root directory.</a>') % {"path": escape(path.lstrip('/')), "url": root_url}
            messages.success(request, msg, extra_tags='safe')
        else:
            dir_view_url = reverse('repo', args=[repo_id]) + u'?p=' + urllib2.quote(path.encode('utf-8'))
            msg = _(u'Successfully revert <a href="%(url)s">%(path)s</a>') % {"url": dir_view_url, "path": escape(path.lstrip('/'))}
            messages.success(request, msg, extra_tags='safe')
        return HttpResponseRedirect(url)

@login_required
def file_revisions(request, repo_id):
    """List file revisions in file version history page.
    """
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    # perm check
    if check_repo_access_permission(repo.id, request.user) is None:
        raise Http404

    return render_file_revisions(request, repo_id)

def demo(request):
    """
    Login as demo account.
    """
    user = User.objects.get(email=settings.CLOUD_DEMO_USER)
    for backend in get_backends():
        user.backend = "%s.%s" % (backend.__module__, backend.__class__.__name__)

    auth_login(request, user)

    redirect_to = settings.SITE_ROOT
    return HttpResponseRedirect(redirect_to)

def list_inner_pub_repos(request):
    """List inner pub repos.
    """
    username = request.user.username
    if is_org_context(request):
        org_id = request.user.org.org_id
        return seaserv.list_org_inner_pub_repos(org_id, username)

    if not request.cloud_mode:
        return seaserv.list_inner_pub_repos(username)

    return []

@login_required
def pubrepo(request):
    """
    Show public libraries.
    """
    if not request.user.permissions.can_view_org():
        raise Http404

    username = request.user.username

    if request.cloud_mode and request.user.org is not None:
        org_id = request.user.org.org_id
        public_repos = seaserv.list_org_inner_pub_repos(org_id, username)
        for r in public_repos:
            if r.user == username:
                r.share_from_me = True
        return render_to_response('organizations/pubrepo.html', {
                'public_repos': public_repos,
                'create_shared_repo': True,
                }, context_instance=RequestContext(request))

    if not request.cloud_mode:
        public_repos = seaserv.list_inner_pub_repos(username)
        for r in public_repos:
            if r.user == username:
                r.share_from_me = True
        return render_to_response('pubrepo.html', {
                'public_repos': public_repos,
                'create_shared_repo': True,
                }, context_instance=RequestContext(request))

    raise Http404

def get_pub_users(request, start, limit):
    if is_org_context(request):
        url_prefix = request.user.org.url_prefix
        users_plus_one = seaserv.get_org_users_by_url_prefix(url_prefix,
                                                             start, limit)

    elif request.cloud_mode:
        raise Http404           # no pubuser in cloud mode

    else:
        users_plus_one = seaserv.get_emailusers('DB', start,
                                                limit, is_active=True)
    return users_plus_one

def count_pub_users(request):
    if is_org_context(request):
        url_prefix = request.user.org.url_prefix
        # TODO: need a new api to count org users.
        org_users = seaserv.get_org_users_by_url_prefix(url_prefix, -1, -1)
        return len(org_users)
    elif request.cloud_mode:
        return 0
    else:
        return seaserv.ccnet_threaded_rpc.count_emailusers('DB')

@login_required
def pubuser(request):
    """
    Show public users in database or ldap depending on request arg ``ldap``.
    """
    if not request.user.permissions.can_view_org():
        raise Http404

    # Make sure page request is an int. If not, deliver first page.
    try:
        current_page = int(request.GET.get('page', '1'))
    except ValueError:
        current_page = 1
    per_page = 20           # show 20 users per-page

    # Show LDAP users or Database users.
    have_ldap_user = False
    if len(seaserv.get_emailusers('LDAPImport', 0, 1, is_active=True)) > 0:
        have_ldap_user = True

    try:
        ldap = True if int(request.GET.get('ldap', 0)) == 1 else False
    except ValueError:
        ldap = False

    if ldap and have_ldap_user:
        # return ldap imported active users
        users_plus_one = seaserv.get_emailusers('LDAPImport',
                                                per_page * (current_page - 1),
                                                per_page + 1,
                                                is_active=True)
    else:
        users_plus_one = get_pub_users(request, per_page * (current_page - 1),
                                       per_page + 1)

    has_prev = False if current_page == 1 else True
    has_next = True if len(users_plus_one) == per_page + 1 else False

    if ldap and have_ldap_user:
        # return the number of ldap imported active users
        emailusers_count = seaserv.ccnet_threaded_rpc.count_emailusers('LDAP')
    else:
        emailusers_count = count_pub_users(request)

    num_pages = int(ceil(emailusers_count / float(per_page)))
    page_range = get_page_range(current_page, num_pages)
    show_paginator = True if len(page_range) > 1 else False

    users = users_plus_one[:per_page]

    return render_to_response('pubuser.html', {
                'users': users,
                'current_page': current_page,
                'has_prev': has_prev,
                'has_next': has_next,
                'page_range': page_range,
                'show_paginator': show_paginator,
                'have_ldap_user': have_ldap_user,
                'ldap': ldap,
                }, context_instance=RequestContext(request))

@login_required_ajax
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
    next = request.META.get('HTTP_REFERER', settings.SITE_ROOT)

    lang = request.GET.get('lang', settings.LANGUAGE_CODE)
    if lang not in [e[0] for e in settings.LANGUAGES]:
        # language code is not supported, use default.
        lang = settings.LANGUAGE_CODE

    # set language code to user profile if user is logged in
    if not request.user.is_anonymous():
        p = Profile.objects.get_profile_by_user(request.user.username)
        if p is not None:
            # update exist record
            p.set_lang_code(lang)
        else:
            # add new record
            Profile.objects.add_or_update(request.user.username, '', '', lang)

    # set language code to client
    res = HttpResponseRedirect(next)
    res.set_cookie(settings.LANGUAGE_COOKIE_NAME, lang, max_age=30*24*60*60)
    return res

@login_required
def repo_download_dir(request, repo_id):
    repo = get_repo(repo_id)
    if not repo:
        return render_error(request, _(u'Library does not exist'))

    path = request.GET.get('p', '/')
    if path[-1] != '/':         # Normalize dir path
        path += '/'

    if not seafile_api.get_dir_id_by_path(repo.id, path):
        return render_error(request, _('"%s" does not exist.') % path)

    if len(path) > 1:
        dirname = os.path.basename(path.rstrip('/')) # Here use `rstrip` to cut out last '/' in path
    else:
        dirname = repo.name

    allow_download = True if check_repo_access_permission(
        repo_id, request.user) else False
    if allow_download:
        dir_id = seafserv_threaded_rpc.get_dirid_by_path (repo.id,
                                                          repo.head_cmmt_id,
                                                          path.encode('utf-8'))

        try:
            total_size = seafserv_threaded_rpc.get_dir_size(repo.store_id, repo.version,
                                                            dir_id)
        except Exception, e:
            logger.error(str(e))
            return render_error(request, _(u'Internal Error'))

        if total_size > MAX_DOWNLOAD_DIR_SIZE:
            return render_error(request, _(u'Unable to download directory "%s": size is too large.') % dirname)

        token = seafile_api.get_fileserver_access_token(repo_id,
                                                        dir_id,
                                                        'download-dir',
                                                        request.user.username)

    else:
        return render_error(request, _(u'Unable to download "%s"') % dirname )

    url = gen_file_get_url(token, dirname)
    return redirect(url)

@login_required
@user_mods_check
def activities(request):
    if not EVENTS_ENABLED:
        raise Http404

    events_count = 15
    username = request.user.username
    start = int(request.GET.get('start', 0))

    if is_org_context(request):
        org_id = request.user.org.org_id
        events, start = get_org_user_events(org_id, username, start, events_count)
    else:
        events, start = get_user_events(username, start, events_count)

    events_more = True if len(events) == events_count else False

    event_groups = group_events_data(events)

    return render_to_response('activities.html', {
        'event_groups': event_groups,
        'events_more': events_more,
        'new_start': start,
            }, context_instance=RequestContext(request))

def group_events_data(events):
    """
    Group events according to the date.
    """
    event_groups = []
    for e in events:
        e.time = utc_to_local(e.timestamp)
        e.date = e.time.strftime("%Y-%m-%d")
        if e.etype == 'repo-update':
            e.author = e.commit.creator_name
        elif e.etype == 'repo-create':
            e.author = e.creator
        else:
            e.author = e.repo_owner

        if len(event_groups) == 0 or \
            len(event_groups) > 0 and e.date != event_groups[-1]['date']:
            event_group = {}
            event_group['date'] = e.date
            event_group['events'] = [e]
            event_groups.append(event_group)
        else:
            event_groups[-1]['events'].append(e)

    return event_groups

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
    if check_repo_access_permission(repo_id, request.user) is None:
        raise Http404

    diff_result = seafserv_threaded_rpc.get_diff(repo_id, '', cmmt_id)
    if not diff_result:
        raise Http404

    for d in diff_result:
        if name not in d.name:
            # skip to next diff_result if file/folder user clicked does not
            # match the diff_result
            continue

        if d.status == 'add' or d.status == 'mod':  # Add or modify file
            return HttpResponseRedirect(
                reverse('view_lib_file', args=[repo_id, '/' + urlquote(d.name)]))
        elif d.status == 'mov':  # Move or Rename file
            return HttpResponseRedirect(
                reverse('view_lib_file', args=[repo_id, '/' + urlquote(d.new_name)]))
        elif d.status == 'newdir':
            return HttpResponseRedirect(
                reverse('view_common_lib_dir', args=[repo_id, urlquote(d.name).strip('/')]))
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


storage = get_avatar_file_storage()
def latest_entry(request, filename):
    try:
        return storage.modified_time(filename)
    except Exception as e:
        logger.error(e)
        return None

@condition(last_modified_func=latest_entry)
def image_view(request, filename):
    if AVATAR_FILE_STORAGE is None:
        raise Http404

    # read file from cache, if hit
    filename_md5 = hashlib.md5(filename).hexdigest()
    cache_key = 'image_view__%s' % filename_md5
    file_content = cache.get(cache_key)
    if file_content is None:
        # otherwise, read file from database and update cache
        image_file = storage.open(filename, 'rb')
        if not image_file:
            raise Http404
        file_content = image_file.read()
        cache.set(cache_key, file_content, 365 * 24 * 60 * 60)

    # Prepare response
    content_type, content_encoding = mimetypes.guess_type(filename)
    response = HttpResponse(content=file_content, content_type=content_type)
    response['Content-Disposition'] = 'inline; filename=%s' % filename
    if content_encoding:
        response['Content-Encoding'] = content_encoding
    return response

def shib_login(request):
    return HttpResponseRedirect(request.GET.get("next",reverse('myhome')))

def underscore_template(request, template):
    """Serve underscore template through Django, mainly for I18n.

    Arguments:
    - `request`:
    - `template`:
    """
    if not template.startswith('js'):  # light security check
        raise Http404

    return render_to_response(template, {},
                              context_instance=RequestContext(request))

def fake_view(request, **kwargs):
    """
    Used for 'view_common_lib_dir' and 'view_group' url

    As the two urls aboved starts with '#',
    http request will not access this function
    """
    pass

def client_token_login(request):
    """Login from desktop client with a generated token.
    """
    tokenstr = request.GET.get('token', '')
    user = None
    if len(tokenstr) == 32:
        try:
            username = ClientLoginToken.objects.get_username(tokenstr)
        except ClientLoginToken.DoesNotExist:
            pass
        else:
            try:
                user = User.objects.get(email=username)
                for backend in get_backends():
                    user.backend = "%s.%s" % (backend.__module__, backend.__class__.__name__)
            except User.DoesNotExist:
                pass

    if user:
        if request.user.is_authenticated() and request.user.username == user.username:
            pass
        else:
            request.client_token_login = True
            auth_login(request, user)

    return HttpResponseRedirect(request.GET.get("next", reverse('libraries')))
