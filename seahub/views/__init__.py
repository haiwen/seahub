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
from django.utils.translation import ugettext as _
from django.utils import timezone
from django.utils.http import urlquote
from django.views.decorators.http import condition

import seaserv
from seaserv import get_repo, get_commits, is_valid_filename, \
    seafserv_threaded_rpc, seafserv_rpc, is_repo_owner, check_permission, \
    is_passwd_set, get_file_size, edit_repo, \
    get_session_info, set_repo_history_limit, get_commit, \
    MAX_DOWNLOAD_DIR_SIZE, send_message, ccnet_threaded_rpc
from seaserv import seafile_api
from pysearpc import SearpcError

from seahub.avatar.util import get_avatar_file_storage
from seahub.auth.decorators import login_required, login_required_ajax
from seahub.auth import login as auth_login
from seahub.auth import get_backends
from seahub.base.accounts import User
from seahub.base.decorators import user_mods_check
from seahub.base.models import UserStarredFiles, DirFilesLastModifiedInfo
from seahub.contacts.models import Contact
from seahub.options.models import UserOptions, CryptoOptionNotSetError
from seahub.profile.models import Profile
from seahub.share.models import FileShare, PrivateFileDirShare, \
    UploadLinkShare
from seahub.forms import RepoPassowrdForm, RepoSettingForm
from seahub.utils import render_permission_error, render_error, list_to_string, \
    get_fileserver_root, gen_shared_upload_link, \
    gen_dir_share_link, gen_file_share_link, get_repo_last_modify, \
    calculate_repos_last_modify, get_file_type_and_ext, get_user_repos, \
    EMPTY_SHA1, normalize_file_path, is_valid_username, \
    get_file_revision_id_size, get_ccnet_server_addr_port, \
    gen_file_get_url, string2list, MAX_INT, IS_EMAIL_CONFIGURED, \
    gen_file_upload_url, \
    EVENTS_ENABLED, get_user_events, get_org_user_events, show_delete_days, \
    TRAFFIC_STATS_ENABLED, get_user_traffic_stat, new_merge_with_no_conflict, \
    user_traffic_over_limit, is_org_context
from seahub.utils.paginator import get_page_range
from seahub.utils.star import get_dir_starred_files
from seahub.views.modules import MOD_PERSONAL_WIKI, enable_mod_for_user, \
    disable_mod_for_user
from seahub.utils.devices import get_user_devices, do_unlink_device
import seahub.settings as settings
from seahub.settings import FILE_PREVIEW_MAX_SIZE, INIT_PASSWD, USE_PDFJS, \
    FILE_ENCODING_LIST, FILE_ENCODING_TRY_LIST, AVATAR_FILE_STORAGE, \
    SEND_EMAIL_ON_ADDING_SYSTEM_MEMBER, SEND_EMAIL_ON_RESETTING_USER_PASSWD, \
    ENABLE_SUB_LIBRARY, ENABLE_REPO_HISTORY_SETTING, REPO_PASSWORD_MIN_LENGTH

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

def get_system_default_repo_id():
    try:
        return seaserv.seafserv_threaded_rpc.get_system_default_repo_id()
    except SearpcError as e:
        logger.error(e)
        return None

def check_repo_access_permission(repo_id, user):
    """Check repo access permission of a user, always return 'rw' when repo is
    system repo and user is admin.

    Arguments:
    - `repo_id`:
    - `user`:
    """
    if get_system_default_repo_id() == repo_id and user.is_staff:
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

def get_repo_dirents(request, repo, commit, path, offset=-1, limit=-1):
    dir_list = []
    file_list = []
    dirent_more = False
    if commit.root_id == EMPTY_SHA1:
        return ([], []) if limit == -1 else ([], [], False)
    else:
        try:
            if limit == -1:
                dirs = seafile_api.list_dir_by_commit_and_path(commit.repo_id, commit.id, path, offset, limit)
            else:
                dirs = seafile_api.list_dir_by_commit_and_path(commit.repo_id, commit.id, path, offset, limit + 1)
                if len(dirs) == limit + 1:
                    dirs = dirs[:limit]
                    dirent_more = True
        except SearpcError, e:
            raise Http404
            # return render_error(self.request, e.msg)

        org_id = -1
        starred_files = get_dir_starred_files(request.user.username, repo.id, path, org_id)

        if repo.version == 0:
            last_modified_info = DirFilesLastModifiedInfo.objects.get_dir_files_last_modified(repo.id, path)

        fileshares = FileShare.objects.filter(repo_id=repo.id).filter(username=request.user.username)
        uploadlinks = UploadLinkShare.objects.filter(repo_id=repo.id).filter(username=request.user.username)

        view_dir_base = reverse('repo', args=[repo.id])
        dl_dir_base = reverse('repo_download_dir', args=[repo.id])
        view_file_base = reverse('repo_view_file', args=[repo.id])
        file_history_base = reverse('file_revisions', args=[repo.id])
        for dirent in dirs:
            if repo.version == 0:
                dirent.last_modified = last_modified_info.get(dirent.obj_name, 0)
            else:
                dirent.last_modified = dirent.mtime
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
                fpath = os.path.join(path, dirent.obj_name)
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
        dir_list.sort(lambda x, y : cmp(x.obj_name.lower(),
                                        y.obj_name.lower()))
        file_list.sort(lambda x, y : cmp(x.obj_name.lower(),
                                         y.obj_name.lower()))
        if limit == -1:
            return (file_list, dir_list)
        else:
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

    commit = seafserv_threaded_rpc.get_commit(repo.id, repo.version, commit_id)
    if not commit:
        raise Http404

    zipped = gen_path_link(path, '')
    file_list, dir_list = get_repo_dirents(request, repo, commit, basedir + path)

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

@login_required
def repo_recycle_view(request, repo_id):
    if check_repo_access_permission(repo_id, request.user) != 'rw':
        return render_permission_error(request, _(u'Unable to view recycle page'))

    commit_id = request.GET.get('commit_id', '')
    if not commit_id:
        return render_recycle_root(request, repo_id)
    else:
        return render_recycle_dir(request, repo_id, commit_id)

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
    except SearpcError, e:
        messages.error(request, _('Internal server error'))
        return HttpResponseRedirect(next)

    return HttpResponseRedirect(next)

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
    if is_org_context(request):
        repo_owner = seafile_api.get_org_repo_owner(repo.id)
    else:
        repo_owner = seafile_api.get_repo_owner(repo.id)
    is_owner = True if username == repo_owner else False
    if not is_owner:
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
    if not ENABLE_REPO_HISTORY_SETTING:
        full_history_enabled = no_history_enabled = partial_history_enabled = False
        days_enabled = False

    if history_limit <= 0:
        days_enabled = False

    return render_to_response('repo_settings.html', {
            'repo': repo,
            'repo_owner': repo_owner,
            'history_limit': history_limit if history_limit > 0 else '',
            'full_history_checked': full_history_checked,
            'no_history_checked': no_history_checked,
            'partial_history_checked': partial_history_checked,
            'full_history_enabled': full_history_enabled,
            'no_history_enabled': no_history_enabled,
            'partial_history_enabled': partial_history_enabled,
            'days_enabled': days_enabled,
            'repo_password_min_length': REPO_PASSWORD_MIN_LENGTH,
            }, context_instance=RequestContext(request))

@login_required_ajax
def repo_change_basic_info(request, repo_id):
    """Handle post request to change library basic info.
    """
    if request.method != 'POST':
        raise Http404

    content_type = 'application/json; charset=utf-8'
    username = request.user.username

    repo = seafile_api.get_repo(repo_id)
    if not repo:
        raise Http404

    # no settings for virtual repo
    if ENABLE_SUB_LIBRARY and repo.is_virtual:
        raise Http404

    # check permission
    if is_org_context(request):
        repo_owner = seafile_api.get_org_repo_owner(repo.id)
    else:
        repo_owner = seafile_api.get_repo_owner(repo.id)
    is_owner = True if username == repo_owner else False
    if not is_owner:
        raise Http404

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
    if days is not None and ENABLE_REPO_HISTORY_SETTING:
        res = set_repo_history_limit(repo_id, days)
        if res != 0:
            return HttpResponse(json.dumps({
                        'error': _(u'Failed to save settings on server')
                        }), status=400, content_type=content_type)

    messages.success(request, _(u'Settings saved.'))
    return HttpResponse(json.dumps({'success': True}),
                        content_type=content_type)

@login_required_ajax
def repo_transfer_owner(request, repo_id):
    """Handle post request to transfer library owner.
    """
    if request.method != 'POST':
        raise Http404

    content_type = 'application/json; charset=utf-8'
    username = request.user.username

    repo = seafile_api.get_repo(repo_id)
    if not repo:
        raise Http404

    # check permission
    if is_org_context(request):
        repo_owner = seafile_api.get_org_repo_owner(repo.id)
    else:
        repo_owner = seafile_api.get_repo_owner(repo.id)
    is_owner = True if username == repo_owner else False
    if not is_owner:
        raise Http404

    # check POST arg
    repo_owner = request.POST.get('repo_owner', '').lower()
    if not is_valid_username(repo_owner):
        return HttpResponse(json.dumps({
                        'error': _('Username %s is not valid.') % repo_owner,
                        }), status=400, content_type=content_type)

    try:
        User.objects.get(email=repo_owner)
    except User.DoesNotExist:
        return HttpResponse(json.dumps({
                        'error': _('User %s is not found.') % repo_owner,
                        }), status=400, content_type=content_type)

    if is_org_context(request):
        org_id = request.user.org.org_id
        if not seaserv.ccnet_threaded_rpc.org_user_exists(org_id, repo_owner):
            return HttpResponse(json.dumps({
                        'error': _('User %s is not in current organization.') %
                        repo_owner,}), status=400, content_type=content_type)

    if repo_owner and repo_owner != username:
        if is_org_context(request):
            org_id = request.user.org.org_id
            seafile_api.set_org_repo_owner(org_id, repo_id, repo_owner)
        else:
            if ccnet_threaded_rpc.get_orgs_by_user(repo_owner):
                return HttpResponse(json.dumps({
                       'error': _('Can not transfer library to organization user %s.') % repo_owner,
                       }), status=400, content_type=content_type)
            else:
                seafile_api.set_repo_owner(repo_id, repo_owner)

    messages.success(request,
                     _(u'Library %(repo_name)s has been transfered to %(new_owner)s.') %
                     {'repo_name': repo.name, 'new_owner': repo_owner})
    return HttpResponse(json.dumps({'success': True}),
                        content_type=content_type)

@login_required_ajax
def repo_change_passwd(request, repo_id):
    """Handle ajax post request to change library password.
    """
    if request.method != 'POST':
        raise Http404

    content_type = 'application/json; charset=utf-8'
    username = request.user.username

    repo = seafile_api.get_repo(repo_id)
    if not repo:
        raise Http404

    # check permission
    if is_org_context(request):
        repo_owner = seafile_api.get_org_repo_owner(repo.id)
    else:
        repo_owner = seafile_api.get_repo_owner(repo.id)
    is_owner = True if username == repo_owner else False
    if not is_owner:
        return HttpResponse(json.dumps({
                    'error': _('Faied to change password, you are not owner.')}),
                    status=400, content_type=content_type)

    old_passwd = request.POST.get('old_passwd', '')
    new_passwd = request.POST.get('new_passwd', '')
    try:
        seafile_api.change_repo_passwd(repo_id, old_passwd, new_passwd, username)
    except SearpcError, e:
        return HttpResponse(json.dumps({
                    'error': e.msg,
                    }), status=400, content_type=content_type)

    messages.success(request, _(u'Successfully updated the password of Library %(repo_name)s.') %
                     {'repo_name': repo.name})
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
def repo_view_snapshot(request, repo_id):
    """List repo snapshots.
    """
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    # perm check
    if check_repo_access_permission(repo.id, request.user) is None:
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

    # perm check
    if check_repo_access_permission(repo.id, request.user) is None:
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
    username = request.user.username

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
        sub_repos = get_virtual_repos_by_owner(request)
        for repo in sub_repos:
            repo.abbrev_origin_path = get_abbrev_origin_path(repo.origin_repo_name,
                                                             repo.origin_path)
        calculate_repos_last_modify(sub_repos)
        sub_repos.sort(lambda x, y: cmp(y.latest_modify, x.latest_modify))

    # mine
    owned_repos = get_owned_repo_list(request)
    calculate_repos_last_modify(owned_repos)
    owned_repos.sort(lambda x, y: cmp(y.latest_modify, x.latest_modify))

    # misc
    if request.cloud_mode and request.user.org is None:
        allow_public_share = False
    else:
        allow_public_share = True

    # user guide
    user_can_add_repo = request.user.permissions.can_add_repo()
    need_guide = False
    if len(owned_repos) == 0:
        need_guide = UserOptions.objects.is_user_guide_enabled(username)
        if need_guide:
            UserOptions.objects.disable_user_guide(username)
            if user_can_add_repo:
                # create a default library for user
                create_default_library(request)
                # refetch owned repos
                owned_repos = get_owned_repo_list(request)
                calculate_repos_last_modify(owned_repos)

    repo_create_url = reverse("repo_create")

    return render_to_response('myhome.html', {
            "owned_repos": owned_repos,
            "create_shared_repo": False,
            "allow_public_share": allow_public_share,
            "ENABLE_SUB_LIBRARY": ENABLE_SUB_LIBRARY,
            "need_guide": need_guide,
            "sub_lib_enabled": sub_lib_enabled,
            "sub_repos": sub_repos,
            "repo_create_url": repo_create_url,
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
def unsetinnerpub(request, repo_id):
    """Unshare repos in organization or in share admin page.

    Only system admin, organization admin or repo owner can perform this op.
    """
    repo = get_repo(repo_id)
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
def repo_del_file(request, repo_id):
    if check_repo_access_permission(repo_id, request.user) != 'rw':
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
    """Delete or download file.
    TODO: need to be rewrite.

    **NOTE**: download file is moved to file.py::download_file
    """
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

    if from_shared_link:
        # check whether owner's traffic over the limit
        if user_traffic_over_limit(fileshare.username):
            return render_permission_error(request,
                                           _(u'Unable to access file: share link traffic is used up.'))

    username = request.user.username
    path = request.GET.get('p', '')
    if check_repo_access_permission(repo_id, request.user) or \
            get_file_access_permission(repo_id, path, username) or from_shared_link:
        # Get a token to access file
        token = seafserv_rpc.web_get_access_token(repo_id, obj_id, op, username)
    else:
        return render_permission_error(request, _(u'Unable to access file'))

    redirect_url = gen_file_get_url(token, file_name)

    if from_shared_link:
        # send stats message
        try:
            file_size = seafserv_threaded_rpc.get_file_size(repo.store_id, repo.version, obj_id)
            send_message('seahub.stats', 'file-download\t%s\t%s\t%s\t%s' % \
                         (repo.id, shared_by, obj_id, file_size))
        except Exception, e:
            logger.error('Error when sending file-download message: %s' % str(e))

    return HttpResponseRedirect(redirect_url)

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

    cur_path = path
    for commit in commits:
        commit.path = cur_path
        if commit.rev_renamed_old_path:
            cur_path = '/' + commit.rev_renamed_old_path

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
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    # perm check
    if check_repo_access_permission(repo.id, request.user) is None:
        raise Http404
    
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
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    # perm check
    if check_repo_access_permission(repo.id, request.user) is None:
        raise Http404
    
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

    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    # perm check
    if check_repo_access_permission(repo.id, request.user) is None:
        raise Http404

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
            seafdir = seafile_api.list_dir_by_commit_and_path (repo_id,
                                                               commit_id,
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

def demo(request):
    """
    Login as demo account.
    """
    user = User.objects.get(email='demo@seafile.com')
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

@login_required
def pubgrp(request):
    """
    Show public groups.
    """
    if not request.user.permissions.can_view_org():
        raise Http404

    if request.cloud_mode and request.user.org is not None:
        org_id = request.user.org.org_id
        groups = seaserv.get_org_groups(org_id, -1, -1)
        return render_to_response('organizations/pubgrp.html', {
                'groups': groups,
                }, context_instance=RequestContext(request))

    if not request.cloud_mode:
        groups = seaserv.get_personal_groups(-1, -1)
        return render_to_response('pubgrp.html', {
                'groups': groups,
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
        users_plus_one = seaserv.get_emailusers('DB', start, limit)
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
    have_ldap_user = True if len(seaserv.get_emailusers('LDAP', 0, 1)) > 0 else False

    try:
        ldap = True if int(request.GET.get('ldap', 0)) == 1 else False
    except ValueError:
        ldap = False

    if ldap and have_ldap_user:
        users_plus_one = seaserv.get_emailusers('LDAP',
                                                per_page * (current_page - 1),
                                                per_page + 1)
    else:
        users_plus_one = get_pub_users(request, per_page * (current_page - 1),
                                       per_page + 1)

    has_prev = False if current_page == 1 else True
    has_next = True if len(users_plus_one) == per_page + 1 else False

    if ldap and have_ldap_user:
        emailusers_count = seaserv.ccnet_threaded_rpc.count_emailusers('LDAP')
    else:
        emailusers_count = count_pub_users(request)

    num_pages = int(ceil(emailusers_count / float(per_page)))
    page_range = get_page_range(current_page, num_pages)
    show_paginator = True if len(page_range) > 1 else False

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

    users = filter(lambda u: u.is_active, users)

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

    # set language code to user profile
    p = Profile.objects.get_profile_by_user(request.user.username)
    if p is not None:
        p.set_lang_code(lang)

    # set language code to client
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
        allow_download = True if check_repo_access_permission(
            repo_id, request.user) else False

    if from_shared_link:
        # check whether owner's traffic over the limit
        if user_traffic_over_limit(fileshare.username):
            return render_permission_error(request,
                                           _(u'Unable to access file: share link traffic is used up.'))

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
    # e.timestamp is a datetime.datetime in UTC
    # change from UTC timezone to current seahub timezone
    def utc_to_local(dt):
        tz = timezone.get_default_timezone()
        utc = dt.replace(tzinfo=timezone.utc)
        local = timezone.make_naive(utc, tz)
        return local

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

def pdf_full_view(request):
    '''For pdf view with pdf.js.'''

    repo_id = request.GET.get('repo_id', '')
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    # perm check
    if check_repo_access_permission(repo.id, request.user) is None:
        raise Http404

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


storage = get_avatar_file_storage()
def latest_entry(request, filename):
    return storage.modified_time(filename)

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
    response = HttpResponse(content=file_content, mimetype=content_type)
    response['Content-Disposition'] = 'inline; filename=%s' % filename
    if content_encoding:
        response['Content-Encoding'] = content_encoding
    return response
