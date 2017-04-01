# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8
import hashlib
import os
import stat
import json
import mimetypes
import logging
import posixpath

from django.core.cache import cache
from django.core.urlresolvers import reverse
from django.contrib import messages
from django.http import HttpResponse, Http404, \
    HttpResponseRedirect
from django.shortcuts import render_to_response, redirect
from django.template import RequestContext
from django.utils.http import urlquote
from django.utils.html import escape
from django.utils.translation import ugettext as _
from django.views.decorators.http import condition

import seaserv
from seaserv import get_repo, get_commits, is_valid_filename, \
    seafserv_threaded_rpc, seafserv_rpc, is_repo_owner, \
    get_file_size, MAX_DOWNLOAD_DIR_SIZE, \
    seafile_api
from pysearpc import SearpcError

from seahub.avatar.util import get_avatar_file_storage
from seahub.auth.decorators import login_required
from seahub.auth import login as auth_login
from seahub.auth import get_backends
from seahub.base.accounts import User
from seahub.base.decorators import user_mods_check, require_POST
from seahub.base.models import ClientLoginToken
from seahub.options.models import UserOptions, CryptoOptionNotSetError
from seahub.profile.models import Profile
from seahub.share.models import FileShare, UploadLinkShare
from seahub.utils import render_permission_error, render_error, \
    get_fileserver_root, gen_shared_upload_link, is_org_context, \
    gen_dir_share_link, gen_file_share_link, get_file_type_and_ext, \
    get_user_repos, EMPTY_SHA1, gen_file_get_url, \
    new_merge_with_no_conflict, get_max_upload_file_size, \
    is_pro_version, FILE_AUDIT_ENABLED, \
    is_org_repo_creation_allowed, is_windows_operating_system
from seahub.utils.star import get_dir_starred_items
from seahub.utils.timeutils import utc_to_local
from seahub.views.modules import MOD_PERSONAL_WIKI, enable_mod_for_user, \
    disable_mod_for_user
import seahub.settings as settings
from seahub.settings import AVATAR_FILE_STORAGE, \
    ENABLE_SUB_LIBRARY, ENABLE_FOLDER_PERM

LIBRARY_TEMPLATES = getattr(settings, 'LIBRARY_TEMPLATES', {})

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
    """Check repo/folder/file access permission of a user, always return 'rw'
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
        starred_items = get_dir_starred_items(username, repo.id, path)
        fileshares = FileShare.objects.filter(repo_id=repo.id).filter(username=username)
        uploadlinks = UploadLinkShare.objects.filter(repo_id=repo.id).filter(username=username)


        view_dir_base = reverse("view_common_lib_dir", args=[repo.id, ''])
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
                dirent.view_link = reverse('view_lib_file', args=[repo.id, p_fpath])
                dirent.dl_link = get_file_download_link(repo.id, dirent.obj_id,
                                                        p_fpath)
                dirent.history_link = file_history_base + '?p=' + urlquote(p_fpath)
                if fpath in starred_items:
                    dirent.starred = True
                for share in fileshares:
                    if fpath == share.path:
                        dirent.sharelink = gen_file_share_link(share.token)
                        dirent.sharetoken = share.token
                        break

        return (file_list, dir_list, dirent_more)

def get_unencry_rw_repos_by_user(request):
    """Get all unencrypted repos a logged-in user can read and write.
    """
    username = request.user.username
    if not username:
        return []

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
            if check_folder_permission(request, r.id, '/') == 'rw':
                accessible_repos.append(r)

    return accessible_repos

def render_recycle_root(request, repo_id, referer):
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    username = request.user.username
    if is_org_context(request):
        repo_owner = seafile_api.get_org_repo_owner(repo.id)
    else:
        repo_owner = seafile_api.get_repo_owner(repo.id)
    is_repo_owner = True if repo_owner == username else False

    enable_clean = False
    if is_repo_owner:
        enable_clean = True

    return render_to_response('repo_dir_recycle_view.html', {
            'show_recycle_root': True,
            'repo': repo,
            'repo_dir_name': repo.name,
            'enable_clean': enable_clean,
            'referer': referer,
            }, context_instance=RequestContext(request))

def render_recycle_dir(request, repo_id, commit_id, referer):
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
        referer = request.META.get('HTTP_REFERER', None)
        next = settings.SITE_ROOT if referer is None else referer
        return HttpResponseRedirect(next)

    if not commit:
        raise Http404

    zipped = gen_path_link(path, '')

    dir_entries = seafile_api.list_dir_by_commit_and_path(commit.repo_id,
                                                   commit.id, basedir+path,
                                                   -1, -1)
    for dirent in dir_entries:
        if stat.S_ISDIR(dirent.mode):
            dirent.is_dir = True
        else:
            dirent.is_dir = False

    return render_to_response('repo_dir_recycle_view.html', {
            'show_recycle_root': False,
            'repo': repo,
            'repo_dir_name': repo.name,
            'zipped': zipped,
            'dir_entries': dir_entries,
            'commit_id': commit_id,
            'basedir': basedir,
            'path': path,
            'referer': referer,
            }, context_instance=RequestContext(request))

def render_dir_recycle_root(request, repo_id, dir_path, referer):
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    return render_to_response('repo_dir_recycle_view.html', {
            'show_recycle_root': True,
            'repo': repo,
            'repo_dir_name': os.path.basename(dir_path.rstrip('/')),
            'dir_path': dir_path,
            'referer': referer,
            }, context_instance=RequestContext(request))

def render_dir_recycle_dir(request, repo_id, commit_id, dir_path, referer):
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
        referer = request.META.get('HTTP_REFERER', None)
        next = settings.SITE_ROOT if referer is None else referer
        return HttpResponseRedirect(next)

    if not commit:
        raise Http404

    zipped = gen_path_link(path, '')
    dir_entries = seafile_api.list_dir_by_commit_and_path(commit.repo_id,
                                                   commit.id, basedir+path,
                                                   -1, -1)
    for dirent in dir_entries:
        if stat.S_ISDIR(dirent.mode):
            dirent.is_dir = True
        else:
            dirent.is_dir = False

    return render_to_response('repo_dir_recycle_view.html', {
            'show_recycle_root': False,
            'repo': repo,
            'repo_dir_name': os.path.basename(dir_path.rstrip('/')),
            'zipped': zipped,
            'dir_entries': dir_entries,
            'commit_id': commit_id,
            'basedir': basedir,
            'path': path,
            'dir_path': dir_path,
            'referer': referer,
            }, context_instance=RequestContext(request))

@login_required
def repo_recycle_view(request, repo_id):
    if not seafile_api.get_dir_id_by_path(repo_id, '/') or \
        check_folder_permission(request, repo_id, '/') != 'rw':
        return render_permission_error(request, _(u'Unable to view recycle page'))

    commit_id = request.GET.get('commit_id', '')
    referer = request.GET.get('referer', '') # for back to 'dir view' page
    if not commit_id:
        return render_recycle_root(request, repo_id, referer)
    else:
        return render_recycle_dir(request, repo_id, commit_id, referer)

@login_required
def dir_recycle_view(request, repo_id):
    dir_path = request.GET.get('dir_path', '')

    if not seafile_api.get_dir_id_by_path(repo_id, dir_path) or \
        check_folder_permission(request, repo_id, dir_path) != 'rw':

        return render_permission_error(request, _(u'Unable to view recycle page'))

    commit_id = request.GET.get('commit_id', '')
    referer = request.GET.get('referer', '') # for back to 'dir view' page
    if not commit_id:
        return render_dir_recycle_root(request, repo_id, dir_path, referer)
    else:
        return render_dir_recycle_dir(request, repo_id, commit_id, dir_path, referer)

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
def repo_history(request, repo_id):
    """
    List library modification histories.
    """
    user_perm = check_folder_permission(request, repo_id, '/')
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
            return HttpResponseRedirect(reverse("view_common_lib_dir", args=[repo_id, '']))

    try:
        current_page = int(request.GET.get('page', '1'))
    except ValueError:
        current_page = 1

    per_page = 100
    commits_all = get_commits(repo_id, per_page * (current_page -1),
                              per_page + 1)
    commits = commits_all[:per_page]
    for c in commits:
        c.show = False if new_merge_with_no_conflict(c) else True

    if len(commits_all) == per_page + 1:
        page_next = True
    else:
        page_next = False

    # for 'go back'
    referer = request.GET.get('referer', '')

    return render_to_response('repo_history.html', {
            "repo": repo,
            "commits": commits,
            'current_page': current_page,
            'prev_page': current_page-1,
            'next_page': current_page+1,
            'page_next': page_next,
            'user_perm': user_perm,
            'referer': referer,
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
    perm = check_folder_permission(request, repo_id, '/')
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
            return HttpResponseRedirect(reverse("view_common_lib_dir", args=[repo_id, '']))

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
        href = reverse("view_common_lib_dir", args=[repo_id, path.encode('utf-8').strip('/')])
    else:
        if not path.startswith('/'):
            p = '/' + path
        href = reverse("view_lib_file", args=[repo_id, p.encode('utf-8')])

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

    # Disable user guide no matter user permission error or creation error,
    # so that the guide popup only show once.
    UserOptions.objects.disable_user_guide(username)

    if not request.user.permissions.can_add_repo():
        return

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
        create_default_library(request)

    folder_perm_enabled = True if is_pro_version() and ENABLE_FOLDER_PERM else False
    can_add_pub_repo = True if is_org_repo_creation_allowed(request) else False

    if request.cloud_mode and request.user.org is not None:
        org_id = request.user.org.org_id
        joined_groups = seaserv.get_org_groups_by_user(org_id, username)
    else:
        joined_groups = seaserv.get_personal_groups_by_user(username)

    if joined_groups:
        try:
            joined_groups.sort(lambda x, y: cmp(x.group_name.lower(), y.group_name.lower()))
        except Exception as e:
            logger.error(e)
            joined_groups = []

    return render_to_response('libraries.html', {
            "allow_public_share": allow_public_share,
            "guide_enabled": guide_enabled,
            "sub_lib_enabled": sub_lib_enabled,
            'enable_wiki': settings.ENABLE_WIKI,
            'enable_upload_folder': settings.ENABLE_UPLOAD_FOLDER,
            'enable_resumable_fileupload': settings.ENABLE_RESUMABLE_FILEUPLOAD,
            'max_number_of_files_for_fileupload': settings.MAX_NUMBER_OF_FILES_FOR_FILEUPLOAD,
            'enable_thumbnail': settings.ENABLE_THUMBNAIL,
            'thumbnail_default_size': settings.THUMBNAIL_DEFAULT_SIZE,
            'thumbnail_size_for_grid': settings.THUMBNAIL_SIZE_FOR_GRID,
            'enable_encrypted_library': config.ENABLE_ENCRYPTED_LIBRARY,
            'enable_repo_history_setting': config.ENABLE_REPO_HISTORY_SETTING,
            'max_upload_file_size': max_upload_file_size,
            'folder_perm_enabled': folder_perm_enabled,
            'is_pro': True if is_pro_version() else False,
            'file_audit_enabled': FILE_AUDIT_ENABLED,
            'can_add_pub_repo': can_add_pub_repo,
            'joined_groups': joined_groups,
            'library_templates': LIBRARY_TEMPLATES.keys() if \
                    isinstance(LIBRARY_TEMPLATES, dict) else []
            }, context_instance=RequestContext(request))

@login_required
def repo_set_access_property(request, repo_id):
    ap = request.GET.get('ap', '')
    seafserv_threaded_rpc.repo_set_access_property(repo_id, ap)

    return HttpResponseRedirect(reverse("view_common_lib_dir", args=[repo_id, '']))

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

    # for 'go back'
    referer = request.GET.get('referer', '')

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
        'referer': referer,
        }, context_instance=RequestContext(request))

@login_required
def file_revisions(request, repo_id):
    """List file revisions in file version history page.
    """
    repo = get_repo(repo_id)
    if not repo:
        raise Http404

    # perm check
    if check_folder_permission(request, repo_id, '/') is None:
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

    allow_download = True if check_folder_permission(request, repo_id, '/') else False

    if allow_download:

        dir_id = seafile_api.get_dir_id_by_commit_and_path(repo.id,
            repo.head_cmmt_id, path)
        try:
            total_size = seafile_api.get_dir_size(repo.store_id,
                repo.version, dir_id)
        except Exception, e:
            logger.error(str(e))
            return render_error(request, _(u'Internal Error'))

        if total_size > MAX_DOWNLOAD_DIR_SIZE:
            return render_error(request, _(u'Unable to download directory "%s": size is too large.') % dirname)

        is_windows = 0
        if is_windows_operating_system(request):
            is_windows = 1

        fake_obj_id = {
            'obj_id': dir_id,
            'dir_name': dirname,
            'is_windows': is_windows
        }

        token = seafile_api.get_fileserver_access_token(
                repo_id, json.dumps(fake_obj_id), 'download-dir', request.user.username)

    else:
        return render_error(request, _(u'Unable to download "%s"') % dirname )

    url = gen_file_get_url(token, dirname)
    from seahub.views.file import send_file_access_msg
    send_file_access_msg(request, repo, path, 'web')
    return redirect(url)

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
    if check_folder_permission(request, repo_id, '/') is None:
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
                reverse('view_lib_file', args=[repo_id, '/' + d.name]))
        elif d.status == 'mov':  # Move or Rename file
            return HttpResponseRedirect(
                reverse('view_lib_file', args=[repo_id, '/' + d.new_name]))
        elif d.status == 'newdir':
            return HttpResponseRedirect(
                reverse('view_common_lib_dir', args=[repo_id, d.name.strip('/')]))
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
            next = settings.SITE_ROOT
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
    Used for 'view_common_lib_dir' and some other urls

    As the urls start with '#',
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
