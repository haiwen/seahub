# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
import os
import stat
import logging
import json
import posixpath
import csv
import chardet
import StringIO

from django.core.urlresolvers import reverse
from django.http import HttpResponse, Http404, HttpResponseBadRequest
from django.template import RequestContext
from django.template.loader import render_to_string
from django.utils.http import urlquote
from django.utils.html import escape
from django.utils.translation import ugettext as _
from django.contrib import messages
from django.conf import settings as dj_settings
from django.template.defaultfilters import filesizeformat

import seaserv
from seaserv import seafile_api, is_passwd_set, ccnet_api, \
    get_related_users_by_repo, get_related_users_by_org_repo, \
    seafserv_threaded_rpc, ccnet_threaded_rpc, edit_repo
from pysearpc import SearpcError

from seahub.auth.decorators import login_required_ajax
from seahub.base.decorators import require_POST
from seahub.contacts.models import Contact
from seahub.forms import RepoNewDirentForm, RepoRenameDirentForm, \
    RepoCreateForm, SharedRepoCreateForm, RepoSettingForm
from seahub.options.models import UserOptions, CryptoOptionNotSetError
from seahub.notifications.models import UserNotification
from seahub.notifications.views import add_notice_from_info
from seahub.message.models import UserMessage
from seahub.share.models import UploadLinkShare
from seahub.group.models import PublicGroup
from seahub.signals import upload_file_successful, repo_created, repo_deleted
from seahub.views import validate_owner, \
    get_unencry_rw_repos_by_user, is_registered_user, \
    get_system_default_repo_id, get_diff, \
    get_owned_repo_list, check_folder_permission, is_registered_user
from seahub.views.modules import get_enabled_mods_by_group, \
    get_available_mods_by_group, enable_mod_for_group, \
    disable_mod_for_group, MOD_GROUP_WIKI, MOD_PERSONAL_WIKI, \
    enable_mod_for_user, disable_mod_for_user
from seahub.group.views import is_group_staff
from seahub.group.utils import is_group_member, is_group_admin_or_owner, \
    get_group_member_info
import seahub.settings as settings
from seahub.settings import ENABLE_THUMBNAIL, THUMBNAIL_ROOT, \
    THUMBNAIL_DEFAULT_SIZE, ENABLE_SUB_LIBRARY, \
    ENABLE_FOLDER_PERM, SHOW_TRAFFIC, MEDIA_URL
from constance import config
from seahub.utils import check_filename_with_rename, EMPTY_SHA1, \
    gen_block_get_url, TRAFFIC_STATS_ENABLED, get_user_traffic_stat,\
    new_merge_with_no_conflict, get_commit_before_new_merge, \
    get_repo_last_modify, gen_file_upload_url, is_org_context, \
    get_org_user_events, get_user_events, get_file_type_and_ext, \
    is_valid_username, send_perm_audit_msg, get_origin_repo_info, is_pro_version
from seahub.utils.repo import get_sub_repo_abbrev_origin_path
from seahub.utils.star import star_file, unstar_file, get_dir_starred_files
from seahub.base.accounts import User
from seahub.thumbnail.utils import get_thumbnail_src
from seahub.utils.file_types import IMAGE
from seahub.base.templatetags.seahub_tags import translate_seahub_time, \
        file_icon_filter, email2nickname, tsstr_sec
from seahub.avatar.templatetags.group_avatar_tags import grp_avatar

# Get an instance of a logger
logger = logging.getLogger(__name__)

########## Seafile API Wrapper
def get_repo(repo_id):
    return seafile_api.get_repo(repo_id)

def get_commit(repo_id, repo_version, commit_id):
    return seaserv.get_commit(repo_id, repo_version, commit_id)

def get_group(gid):
    return seaserv.get_group(gid)

def is_group_user(gid, username):
    return seaserv.is_group_user(gid, username)

########## repo related
@login_required_ajax
def get_dirents(request, repo_id):
    """
    Get dirents in a dir for file tree
    """
    content_type = 'application/json; charset=utf-8'

    # permission checking
    user_perm = check_folder_permission(request, repo_id, '/')
    if user_perm is None:
        err_msg = _(u"You don't have permission to access the library.")
        return HttpResponse(json.dumps({"err_msg": err_msg}), status=403,
                            content_type=content_type)

    path = request.GET.get('path', '')
    dir_only = request.GET.get('dir_only', False)
    all_dir = request.GET.get('all_dir', False)
    if not path:
        err_msg = _(u"No path.")
        return HttpResponse(json.dumps({"error": err_msg}), status=400,
                            content_type=content_type)

    # get dirents for every path element
    if all_dir:
        all_dirents = []
        path_eles = path.split('/')[:-1]
        for i, x in enumerate(path_eles):
            ele_path = '/'.join(path_eles[:i+1]) + '/'
            try:
                ele_path_dirents = seafile_api.list_dir_by_path(repo_id, ele_path.encode('utf-8'))
            except SearpcError, e:
                ele_path_dirents = []
            ds = []
            for d in ele_path_dirents:
                if stat.S_ISDIR(d.mode):
                    ds.append({
                        'name': d.obj_name,
                        'parent_dir': ele_path 
                    })
            ds.sort(lambda x, y : cmp(x['name'].lower(), y['name'].lower()))
            all_dirents.extend(ds)
        return HttpResponse(json.dumps(all_dirents), content_type=content_type)

    # get dirents in path
    try:
        dirents = seafile_api.list_dir_by_path(repo_id, path.encode('utf-8'))
    except SearpcError, e:
        return HttpResponse(json.dumps({"error": e.msg}), status=500,
                            content_type=content_type)

    d_list = []
    f_list = []
    for dirent in dirents:
        if stat.S_ISDIR(dirent.mode):
            subdir = {
                'name': dirent.obj_name,
                'type': 'dir'
            }
            d_list.append(subdir)
        else:
            if not dir_only:
                f = {
                    'name': dirent.obj_name,
                    'type': 'file'
                    }
                f_list.append(f)

    d_list.sort(lambda x, y : cmp(x['name'].lower(), y['name'].lower()))
    f_list.sort(lambda x, y : cmp(x['name'].lower(), y['name'].lower()))
    return HttpResponse(json.dumps(d_list + f_list), content_type=content_type)

@login_required_ajax
def get_unenc_group_repos(request, group_id):
    '''
    Get unenc repos in a group.

    Used in selecting a library for a group wiki
    '''
    content_type = 'application/json; charset=utf-8'

    group_id_int = int(group_id)
    group = get_group(group_id_int)
    if not group:
        err_msg = _(u"The group doesn't exist")
        return HttpResponse(json.dumps({"error": err_msg}), status=400,
                            content_type=content_type)

    joined = is_group_user(group_id_int, request.user.username)
    if not joined and not request.user.is_staff:
        err_msg = _(u"Permission denied")
        return HttpResponse(json.dumps({"error": err_msg}), status=403,
                            content_type=content_type)

    repo_list = []
    if is_org_context(request):
        org_id = request.user.org.org_id
        repos = seafile_api.get_org_group_repos(org_id, group_id_int)
        for repo in repos:
            if not repo.encrypted:
                repo_list.append({"name": repo.repo_name, "id": repo.repo_id})
    else:
        repos = seafile_api.get_repos_by_group(group_id_int)
        for repo in repos:
            if not repo.encrypted:
                repo_list.append({"name": repo.name, "id": repo.id})

    repo_list.sort(lambda x, y : cmp(x['name'].lower(), y['name'].lower()))
    return HttpResponse(json.dumps(repo_list), content_type=content_type)

@login_required_ajax
def get_my_unenc_repos(request):
    """Get my owned and unencrypted repos.
    """
    content_type = 'application/json; charset=utf-8'

    repos = get_owned_repo_list(request)
    repo_list = []
    for repo in repos:
        if repo.encrypted or repo.is_virtual:
            continue
        repo_list.append({"name": repo.name, "id": repo.id})

    repo_list.sort(lambda x, y: cmp(x['name'].lower(), y['name'].lower()))
    return HttpResponse(json.dumps(repo_list), content_type=content_type)

@login_required_ajax
def unenc_rw_repos(request):
    """Get a user's unencrypt repos that he/she can read-write.

    Arguments:
    - `request`:
    """
    content_type = 'application/json; charset=utf-8'
    acc_repos = get_unencry_rw_repos_by_user(request)

    repo_list = []
    acc_repos = filter(lambda r: not r.is_virtual, acc_repos)
    for repo in acc_repos:
        repo_list.append({"name": repo.name, "id": repo.id})

    repo_list.sort(lambda x, y: cmp(x['name'].lower(), y['name'].lower()))
    return HttpResponse(json.dumps(repo_list), content_type=content_type)

@login_required_ajax
def list_lib_dir(request, repo_id):
    '''
        New ajax API for list library directory
    '''
    content_type = 'application/json; charset=utf-8'
    result = {}

    repo = get_repo(repo_id)
    if not repo:
        err_msg = _(u'Library does not exist.')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=400, content_type=content_type)

    username = request.user.username
    path = request.GET.get('p', '/')
    if path[-1] != '/':
        path = path + '/'

    # perm for current dir
    user_perm = check_folder_permission(request, repo.id, path)
    if user_perm is None:
        err_msg = _(u'Permission denied.')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=403, content_type=content_type)

    if repo.encrypted \
            and not seafile_api.is_password_set(repo.id, username):
        err_msg = _(u'Library is encrypted.')
        return HttpResponse(json.dumps({'error': err_msg, 'lib_need_decrypt': True}),
                            status=403, content_type=content_type)

    head_commit = get_commit(repo.id, repo.version, repo.head_cmmt_id)
    if not head_commit:
        err_msg = _(u'Error: no head commit id')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=500, content_type=content_type)

    dir_list = []
    file_list = []

    try:
        dir_id = seafile_api.get_dir_id_by_path(repo.id, path)
    except SearpcError as e:
        logger.error(e)
        err_msg = 'Internal Server Error'
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=500, content_type=content_type)

    if not dir_id:
        err_msg = 'Folder not found.'
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=404, content_type=content_type)

    dirs = seafserv_threaded_rpc.list_dir_with_perm(repo_id, path, dir_id,
            username, -1, -1)
    starred_files = get_dir_starred_files(username, repo_id, path)

    for dirent in dirs:
        dirent.last_modified = dirent.mtime
        if stat.S_ISDIR(dirent.mode):
            dpath = posixpath.join(path, dirent.obj_name)
            if dpath[-1] != '/':
                dpath += '/'
            dir_list.append(dirent)
        else:
            if repo.version == 0:
                file_size = seafile_api.get_file_size(repo.store_id, repo.version, dirent.obj_id)
            else:
                file_size = dirent.size
            dirent.file_size = file_size if file_size else 0

            dirent.starred = False
            fpath = posixpath.join(path, dirent.obj_name)
            if fpath in starred_files:
                dirent.starred = True

            file_list.append(dirent)

    if is_org_context(request):
        repo_owner = seafile_api.get_org_repo_owner(repo.id)
    else:
        repo_owner = seafile_api.get_repo_owner(repo.id)

    result["is_repo_owner"] = False
    result["has_been_shared_out"] = False
    if repo_owner == username:
        result["is_repo_owner"] = True

        try:
            if is_org_context(request):
                org_id = request.user.org.org_id

                is_inner_org_pub_repo = False
                # check if current repo is pub-repo
                org_pub_repos = seafile_api.list_org_inner_pub_repos_by_owner(
                        org_id, username)
                for org_pub_repo in org_pub_repos:
                    if repo_id == org_pub_repo.id:
                        is_inner_org_pub_repo = True
                        break

                if seafile_api.list_org_repo_shared_group(org_id, username, repo_id) or \
                        seafile_api.list_org_repo_shared_to(org_id, username, repo_id) or \
                        is_inner_org_pub_repo:
                    result["has_been_shared_out"] = True
            else:
                if seafile_api.list_repo_shared_to(username, repo_id) or \
                        seafile_api.list_repo_shared_group_by_user(username, repo_id) or \
                        (not request.cloud_mode and seafile_api.is_inner_pub_repo(repo_id)):
                    result["has_been_shared_out"] = True
        except Exception as e:
            logger.error(e)

    result["is_virtual"] = repo.is_virtual
    result["repo_name"] = repo.name
    result["user_perm"] = user_perm
    # check quota for fileupload
    result["no_quota"] = True if seaserv.check_quota(repo.id) < 0 else False
    result["encrypted"] = repo.encrypted

    dirent_list = []
    for d in dir_list:
        d_ = {}
        d_['is_dir'] = True
        d_['obj_name'] = d.obj_name
        d_['last_modified'] = d.last_modified
        d_['last_update'] = translate_seahub_time(d.last_modified)
        d_['p_dpath'] = posixpath.join(path, d.obj_name)
        d_['perm'] = d.permission # perm for sub dir in current dir
        dirent_list.append(d_)

    size = int(request.GET.get('thumbnail_size', THUMBNAIL_DEFAULT_SIZE))

    for f in file_list:
        f_ = {}
        f_['is_file'] = True
        f_['file_icon'] = file_icon_filter(f.obj_name)
        f_['obj_name'] = f.obj_name
        f_['last_modified'] = f.last_modified
        f_['last_update'] = translate_seahub_time(f.last_modified)
        f_['starred'] = f.starred
        f_['file_size'] = filesizeformat(f.file_size)
        f_['obj_id'] = f.obj_id
        f_['perm'] = f.permission # perm for file in current dir

        file_type, file_ext = get_file_type_and_ext(f.obj_name)
        if file_type == IMAGE:
            f_['is_img'] = True
            if not repo.encrypted and ENABLE_THUMBNAIL and \
                os.path.exists(os.path.join(THUMBNAIL_ROOT, str(size), f.obj_id)):
                file_path = posixpath.join(path, f.obj_name)
                src = get_thumbnail_src(repo_id, size, file_path)
                f_['encoded_thumbnail_src'] = urlquote(src)

        if is_pro_version():
            f_['is_locked'] = True if f.is_locked else False
            f_['lock_owner'] = f.lock_owner
            f_['lock_owner_name'] = email2nickname(f.lock_owner)
            if username == f.lock_owner:
                f_['locked_by_me'] = True
            else:
                f_['locked_by_me'] = False

        dirent_list.append(f_)

    result["dirent_list"] = dirent_list

    return HttpResponse(json.dumps(result), content_type=content_type)


@login_required_ajax
def rename_dirent(request, repo_id):
    """
    Rename a file/dir in a repo, with ajax
    """
    if request.method != 'POST':
        raise Http404

    result = {}
    username = request.user.username
    content_type = 'application/json; charset=utf-8'

    repo = get_repo(repo_id)
    if not repo:
        result['error'] = _(u'Library does not exist.')
        return HttpResponse(json.dumps(result), status=400,
                            content_type=content_type)

    # argument checking
    parent_dir = request.GET.get('parent_dir', None)
    if not parent_dir:
        result['error'] = _('Argument missing')
        return HttpResponse(json.dumps(result), status=400,
                            content_type=content_type)

    # form validation
    form = RepoRenameDirentForm(request.POST)
    if form.is_valid():
        oldname = form.cleaned_data["oldname"]
        newname = form.cleaned_data["newname"]
    else:
        result['error'] = str(form.errors.values()[0])
        return HttpResponse(json.dumps(result), status=400,
                            content_type=content_type)

    full_path = posixpath.join(parent_dir, oldname)
    if seafile_api.get_dir_id_by_path(repo.id, full_path) is not None:
        # when dirent is a dir, check current dir perm
        if check_folder_permission(request, repo.id, full_path) != 'rw':
            err_msg = _('Permission denied')
            return HttpResponse(json.dumps({'error': err_msg}), status=403,
                                content_type=content_type)

    if seafile_api.get_file_id_by_path(repo.id, full_path) is not None:
        # when dirent is a file, check parent dir perm
        if check_folder_permission(request, repo.id, parent_dir) != 'rw':
            err_msg = _('Permission denied')
            return HttpResponse(json.dumps({'error': err_msg}), status=403,
                                content_type=content_type)

    if newname == oldname:
        return HttpResponse(json.dumps({'success': True}),
                            content_type=content_type)

    # rename duplicate name
    newname = check_filename_with_rename(repo_id, parent_dir, newname)

    # rename file/dir
    try:
        seafile_api.rename_file(repo_id, parent_dir, oldname, newname, username)
    except SearpcError, e:
        result['error'] = str(e)
        return HttpResponse(json.dumps(result), status=500,
                            content_type=content_type)

    return HttpResponse(json.dumps({'success': True, 'newname': newname}),
                        content_type=content_type)

@login_required_ajax
@require_POST
def delete_dirent(request, repo_id):
    """
    Delete a file/dir with ajax.
    """
    content_type = 'application/json; charset=utf-8'

    repo = get_repo(repo_id)
    if not repo:
        err_msg = _(u'Library does not exist.')
        return HttpResponse(json.dumps({'error': err_msg}),
                status=400, content_type=content_type)

    # argument checking
    parent_dir = request.GET.get("parent_dir", None)
    dirent_name = request.GET.get("name", None)
    if not (parent_dir and dirent_name):
        err_msg = _(u'Argument missing.')
        return HttpResponse(json.dumps({'error': err_msg}),
                status=400, content_type=content_type)

    full_path = posixpath.join(parent_dir, dirent_name)
    username = request.user.username

    if seafile_api.get_dir_id_by_path(repo.id, full_path) is not None:
        # when dirent is a dir, check current dir perm
        if check_folder_permission(request, repo.id, full_path) != 'rw':
            err_msg = _('Permission denied')
            return HttpResponse(json.dumps({'error': err_msg}), status=403,
                                content_type=content_type)

    if seafile_api.get_file_id_by_path(repo.id, full_path) is not None:
        # when dirent is a file, check parent dir perm
        if check_folder_permission(request, repo.id, parent_dir) != 'rw':
            err_msg = _('Permission denied')
            return HttpResponse(json.dumps({'error': err_msg}), status=403,
                                content_type=content_type)

    # delete file/dir
    try:
        seafile_api.del_file(repo_id, parent_dir, dirent_name, username)
        return HttpResponse(json.dumps({'success': True}),
                            content_type=content_type)
    except SearpcError, e:
        logger.error(e)
        err_msg = _(u'Internal error. Failed to delete %s.') % escape(dirent_name)
        return HttpResponse(json.dumps({'error': err_msg}),
                status=500, content_type=content_type)

@login_required_ajax
@require_POST
def delete_dirents(request, repo_id):
    """
    Delete multi files/dirs with ajax.
    """
    content_type = 'application/json; charset=utf-8'

    repo = get_repo(repo_id)
    if not repo:
        err_msg = _(u'Library does not exist.')
        return HttpResponse(json.dumps({'error': err_msg}),
                status=400, content_type=content_type)

    # argument checking
    parent_dir = request.GET.get("parent_dir")
    dirents_names = request.POST.getlist('dirents_names')
    if not (parent_dir and dirents_names):
        err_msg = _(u'Argument missing.')
        return HttpResponse(json.dumps({'error': err_msg}),
                status=400, content_type=content_type)

    # permission checking
    username = request.user.username
    deleted = []
    undeleted = []
    for dirent_name in dirents_names:
        full_path = posixpath.join(parent_dir, dirent_name)
        if check_folder_permission(request, repo.id, full_path) != 'rw':
            undeleted.append(dirent_name)
            continue
        try:
            seafile_api.del_file(repo_id, parent_dir, dirent_name, username)
            deleted.append(dirent_name)
        except SearpcError, e:
            logger.error(e)
            undeleted.append(dirent_name)

    return HttpResponse(json.dumps({'deleted': deleted, 'undeleted': undeleted}),
                        content_type=content_type)

def copy_move_common():
    """Decorator for common logic in copying/moving dir/file.
    """
    def _method_wrapper(view_method):
        def _arguments_wrapper(request, repo_id, *args, **kwargs):
            if request.method != 'POST':
                raise Http404

            result = {}
            content_type = 'application/json; charset=utf-8'

            # arguments check for src
            path = request.GET.get('path')
            obj_name = request.GET.get('obj_name')
            if not (path and obj_name):
                result['error'] = _('Argument missing')
                return HttpResponse(json.dumps(result), status=400,
                                    content_type=content_type)

            # resource check for src
            repo = get_repo(repo_id)
            if not repo:
                result['error'] = _(u'Library does not exist.')
                return HttpResponse(json.dumps(result), status=404,
                                    content_type=content_type)

            full_obj_path = posixpath.join(path, obj_name)
            file_obj_id = seafile_api.get_file_id_by_path(repo_id, full_obj_path)
            dir_obj_id = seafile_api.get_dir_id_by_path(repo_id, full_obj_path)

            if not file_obj_id and not dir_obj_id:
                result['error'] = _(u'"%s" does not exist.') % full_obj_path
                return HttpResponse(json.dumps(result), status=404,
                                    content_type=content_type)

            # arguments chech for dst
            dst_repo_id = request.POST.get('dst_repo')
            dst_path = request.POST.get('dst_path')
            if not (dst_repo_id and dst_path):
                result['error'] = _('Argument missing')
                return HttpResponse(json.dumps(result), status=400,
                                    content_type=content_type)

            # resource check for dst
            dst_repo = seafile_api.get_repo(dst_repo_id)
            if not dst_repo:
                result['error'] = _(u'Library does not exist.')
                return HttpResponse(json.dumps(result), status=404,
                                    content_type=content_type)

            # resource check for dst
            # check file path
            if len(dst_path + obj_name) > settings.MAX_PATH:
                result['error'] = _('Destination path is too long.')
                return HttpResponse(json.dumps(result), status=400,
                                    content_type=content_type)

            # resource check for dst
            # return error when dst is the same as src
            if repo_id == dst_repo_id and path == dst_path:
                result['error'] = _('Invalid destination path')
                return HttpResponse(json.dumps(result), status=400,
                                    content_type=content_type)

            # permission check for dst
            # check whether user has write permission to dest repo
            # Leave src folder/file permission checking to corresponding views.
            # For 'move', check has read-write perm to src folder;
            # For 'cp', check has read perm to src folder.
            if check_folder_permission(request, dst_repo_id, dst_path) != 'rw':
                result['error'] = _('Permission denied')
                return HttpResponse(json.dumps(result), status=403,
                                    content_type=content_type)

            # check quota for dst
            if file_obj_id:
                obj_size = seafile_api.get_file_size(repo.store_id,
                        repo.version, file_obj_id)

            if dir_obj_id:
                obj_size = seafile_api.get_dir_size(repo.store_id,
                        repo.version, dir_obj_id)

            # check quota
            out_of_quota = False
            try:
                if seafile_api.is_repo_owner(request.user.username, dst_repo_id):
                    # if dst repo is my own repo, only check quota when copy.
                    if view_method.__name__ in ('cp_file', 'cp_dir'):
                        out_of_quota = seafile_api.check_quota(dst_repo_id, delta=obj_size)
                else:
                    # if dst repo is NOT my own repo,
                    # check quota when copy AND move.
                    out_of_quota = seafile_api.check_quota(dst_repo_id, delta=obj_size)
            except Exception as e:
                logger.error(e)
                result['error'] = _(u'Internal server error')
                return HttpResponse(json.dumps(result), status=500,
                                content_type=content_type)

            if out_of_quota:
                result['error'] = _('Out of quota.')
                return HttpResponse(json.dumps(result), status=403,
                                    content_type=content_type)

            return view_method(request, repo_id, path,
                    dst_repo_id, dst_path, obj_name)

        return _arguments_wrapper

    return _method_wrapper

@login_required_ajax
@copy_move_common()
def mv_file(request, src_repo_id, src_path, dst_repo_id, dst_path, obj_name):
    result = {}
    content_type = 'application/json; charset=utf-8'
    username = request.user.username

    # check parent dir perm
    if check_folder_permission(request, src_repo_id, src_path) != 'rw':
        result['error'] = _('Permission denied')
        return HttpResponse(json.dumps(result), status=403,
                            content_type=content_type)

    new_obj_name = check_filename_with_rename(dst_repo_id, dst_path, obj_name)
    try:
        res = seafile_api.move_file(src_repo_id, src_path, obj_name,
                                    dst_repo_id, dst_path, new_obj_name,
                                    replace=False, username=username, need_progress=1)
    except SearpcError as e:
        logger.error(e)
        res = None

    # res can be None or an object
    if not res:
        result['error'] = _(u'Internal server error')
        return HttpResponse(json.dumps(result), status=500,
                        content_type=content_type)

    result['success'] = True
    msg = _(u'Successfully moved %(name)s') % {"name": escape(obj_name)}
    result['msg'] = msg
    if res.background:
        result['task_id'] = res.task_id

    return HttpResponse(json.dumps(result), content_type=content_type)

@login_required_ajax
@copy_move_common()
def cp_file(request, src_repo_id, src_path, dst_repo_id, dst_path, obj_name):
    result = {}
    content_type = 'application/json; charset=utf-8'
    username = request.user.username

    # check parent dir perm
    if not check_folder_permission(request, src_repo_id, src_path):
        result['error'] = _('Permission denied')
        return HttpResponse(json.dumps(result), status=403,
                            content_type=content_type)

    new_obj_name = check_filename_with_rename(dst_repo_id, dst_path, obj_name)
    try:
        res = seafile_api.copy_file(src_repo_id, src_path, obj_name,
                                    dst_repo_id, dst_path, new_obj_name,
                                    username, need_progress=1)
    except SearpcError as e:
        logger.error(e)
        res = None

    if not res:
        result['error'] = _(u'Internal server error')
        return HttpResponse(json.dumps(result), status=500,
                        content_type=content_type)

    result['success'] = True
    msg = _(u'Successfully copied %(name)s') % {"name": escape(obj_name)}
    result['msg'] = msg

    if res.background:
        result['task_id'] = res.task_id

    return HttpResponse(json.dumps(result), content_type=content_type)

@login_required_ajax
@copy_move_common()
def mv_dir(request, src_repo_id, src_path, dst_repo_id, dst_path, obj_name):
    result = {}
    content_type = 'application/json; charset=utf-8'
    username = request.user.username

    src_dir = posixpath.join(src_path, obj_name)
    if dst_path.startswith(src_dir + '/'):
        error_msg = _(u'Can not move directory %(src)s to its subdirectory %(des)s') \
            % {'src': escape(src_dir), 'des': escape(dst_path)}
        result['error'] = error_msg
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    # check dir perm
    if check_folder_permission(request, src_repo_id, src_dir) != 'rw':
        result['error'] = _('Permission denied')
        return HttpResponse(json.dumps(result), status=403,
                            content_type=content_type)

    new_obj_name = check_filename_with_rename(dst_repo_id, dst_path, obj_name)
    try:
        res = seafile_api.move_file(src_repo_id, src_path, obj_name,
                                    dst_repo_id, dst_path, new_obj_name,
                                    replace=False, username=username, need_progress=1)
    except SearpcError as e:
        logger.error(e)
        res = None

    # res can be None or an object
    if not res:
        result['error'] = _(u'Internal server error')
        return HttpResponse(json.dumps(result), status=500,
                        content_type=content_type)

    result['success'] = True
    msg = _(u'Successfully moved %(name)s') % {"name": escape(obj_name)}
    result['msg'] = msg
    if res.background:
        result['task_id'] = res.task_id

    return HttpResponse(json.dumps(result), content_type=content_type)

@login_required_ajax
@copy_move_common()
def cp_dir(request, src_repo_id, src_path, dst_repo_id, dst_path, obj_name):
    result = {}
    content_type = 'application/json; charset=utf-8'
    username = request.user.username

    # check src dir perm
    if not check_folder_permission(request, src_repo_id, src_path):
        result['error'] = _('Permission denied')
        return HttpResponse(json.dumps(result), status=403,
                            content_type=content_type)

    src_dir = posixpath.join(src_path, obj_name)
    if dst_path.startswith(src_dir):
        error_msg = _(u'Can not copy directory %(src)s to its subdirectory %(des)s') \
            % {'src': escape(src_dir), 'des': escape(dst_path)}
        result['error'] = error_msg
        return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    new_obj_name = check_filename_with_rename(dst_repo_id, dst_path, obj_name)

    try:
        res = seafile_api.copy_file(src_repo_id, src_path, obj_name,
                                    dst_repo_id, dst_path, new_obj_name,
                                    username, need_progress=1)
    except SearpcError, e:
        logger.error(e)
        res = None

    # res can be None or an object
    if not res:
        result['error'] = _(u'Internal server error')
        return HttpResponse(json.dumps(result), status=500,
                        content_type=content_type)

    result['success'] = True
    msg = _(u'Successfully copied %(name)s') % {"name": escape(obj_name)}
    result['msg'] = msg
    if res.background:
        result['task_id'] = res.task_id

    return HttpResponse(json.dumps(result), content_type=content_type)


def dirents_copy_move_common():
    """
    Decorator for common logic in copying/moving dirs/files in batch.
    """
    def _method_wrapper(view_method):
        def _arguments_wrapper(request, repo_id, *args, **kwargs):
            if request.method != 'POST':
                raise Http404

            result = {}
            content_type = 'application/json; charset=utf-8'

            repo = get_repo(repo_id)
            if not repo:
                result['error'] = _(u'Library does not exist.')
                return HttpResponse(json.dumps(result), status=400,
                                    content_type=content_type)

            # arguments validation
            parent_dir = request.GET.get('parent_dir')
            obj_file_names = request.POST.getlist('file_names')
            obj_dir_names = request.POST.getlist('dir_names')
            dst_repo_id = request.POST.get('dst_repo')
            dst_path = request.POST.get('dst_path')
            if not (parent_dir and dst_repo_id and dst_path) and \
               not (obj_file_names or obj_dir_names):
                result['error'] = _('Argument missing')
                return HttpResponse(json.dumps(result), status=400,
                                    content_type=content_type)

            # check file path
            for obj_name in obj_file_names + obj_dir_names:
                if len(dst_path+obj_name) > settings.MAX_PATH:
                    result['error'] =  _('Destination path is too long for %s.') % escape(obj_name)
                    return HttpResponse(json.dumps(result), status=400,
                                        content_type=content_type)

            # when dst is the same as src
            if repo_id == dst_repo_id and parent_dir == dst_path:
                result['error'] = _('Invalid destination path')
                return HttpResponse(json.dumps(result), status=400,
                                    content_type=content_type)

            # check whether user has write permission to dest repo
            if check_folder_permission(request, dst_repo_id, dst_path) != 'rw':
                result['error'] = _('Permission denied')
                return HttpResponse(json.dumps(result), status=403,
                                    content_type=content_type)

            # Leave src folder/file permission checking to corresponding
            # views, only need to check folder permission when perform 'move'
            # operation, 1), if move file, check parent dir perm, 2), if move
            # folder, check that folder perm.

            file_obj_size = 0
            for obj_name in obj_file_names:
                full_obj_path = posixpath.join(parent_dir, obj_name)
                file_obj_id = seafile_api.get_file_id_by_path(repo_id, full_obj_path)
                file_obj_size += seafile_api.get_file_size(
                        repo.store_id, repo.version, file_obj_id)

            dir_obj_size = 0
            for obj_name in obj_dir_names:
                full_obj_path = posixpath.join(parent_dir, obj_name)
                dir_obj_id = seafile_api.get_dir_id_by_path(repo_id, full_obj_path)
                dir_obj_size += seafile_api.get_dir_size(
                        repo.store_id, repo.version, dir_obj_id)

            # check quota
            out_of_quota = False
            try:
                if seafile_api.is_repo_owner(request.user.username, dst_repo_id):
                    # if dst repo is my own repo, only check quota when copy.
                    if view_method.__name__ == 'cp_dirents':
                        out_of_quota = seafile_api.check_quota(
                                dst_repo_id, delta=file_obj_size + dir_obj_size)
                else:
                    # if dst repo is NOT my own repo,
                    # check quota when copy AND move.
                    out_of_quota = seafile_api.check_quota(
                            dst_repo_id, delta=file_obj_size + dir_obj_size)
            except Exception as e:
                logger.error(e)
                result['error'] = _(u'Internal server error')
                return HttpResponse(json.dumps(result), status=500,
                                content_type=content_type)

            if out_of_quota:
                result['error'] = _('Out of quota.')
                return HttpResponse(json.dumps(result), status=403,
                                    content_type=content_type)

            return view_method(request, repo_id, parent_dir, dst_repo_id,
                               dst_path, obj_file_names, obj_dir_names)

        return _arguments_wrapper

    return _method_wrapper

@login_required_ajax
@dirents_copy_move_common()
def mv_dirents(request, src_repo_id, src_path, dst_repo_id, dst_path,
               obj_file_names, obj_dir_names):
    result = {}
    content_type = 'application/json; charset=utf-8'
    username = request.user.username
    failed = []
    allowed_files = []
    allowed_dirs = []

    # check parent dir perm for files
    if check_folder_permission(request, src_repo_id, src_path) != 'rw':
        allowed_files = []
        failed += obj_file_names
    else:
        allowed_files = obj_file_names

    for obj_name in obj_dir_names:
        src_dir = posixpath.join(src_path, obj_name)
        if dst_path.startswith(src_dir + '/'):
            error_msg = _(u'Can not move directory %(src)s to its subdirectory %(des)s') \
                % {'src': escape(src_dir), 'des': escape(dst_path)}
            result['error'] = error_msg
            return HttpResponse(json.dumps(result), status=400, content_type=content_type)

        # check every folder perm
        if check_folder_permission(request, src_repo_id, src_dir) != 'rw':
            failed.append(obj_name)
        else:
            allowed_dirs.append(obj_name)

    success = []
    url = None
    for obj_name in allowed_files + allowed_dirs:
        new_obj_name = check_filename_with_rename(dst_repo_id, dst_path, obj_name)
        try:
            res = seafile_api.move_file(src_repo_id, src_path, obj_name,
                    dst_repo_id, dst_path, new_obj_name,
                    replace=False, username=username, need_progress=1)
        except SearpcError as e:
            logger.error(e)
            res = None

        if not res:
            failed.append(obj_name)
        else:
            success.append(obj_name)

    if len(success) > 0:
        url = reverse("view_common_lib_dir", args=[dst_repo_id, dst_path.strip('/')])

    result = {'success': success, 'failed': failed, 'url': url}
    return HttpResponse(json.dumps(result), content_type=content_type)

@login_required_ajax
@dirents_copy_move_common()
def cp_dirents(request, src_repo_id, src_path, dst_repo_id, dst_path, obj_file_names, obj_dir_names):
    result = {}
    content_type = 'application/json; charset=utf-8'
    username = request.user.username

    if check_folder_permission(request, src_repo_id, src_path) is None:
        error_msg = _(u'You do not have permission to copy files/folders in this directory')
        result['error'] = error_msg
        return HttpResponse(json.dumps(result), status=403, content_type=content_type)

    for obj_name in obj_dir_names:
        src_dir = posixpath.join(src_path, obj_name)
        if dst_path.startswith(src_dir):
            error_msg = _(u'Can not copy directory %(src)s to its subdirectory %(des)s') \
                % {'src': escape(src_dir), 'des': escape(dst_path)}
            result['error'] = error_msg
            return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    failed = []
    success = []
    url = None
    for obj_name in obj_file_names + obj_dir_names:
        new_obj_name = check_filename_with_rename(dst_repo_id, dst_path, obj_name)
        try:
            res = seafile_api.copy_file(src_repo_id, src_path, obj_name,
                                  dst_repo_id, dst_path, new_obj_name, username, need_progress=1)
        except SearpcError as e:
            logger.error(e)
            res = None

        if not res:
            failed.append(obj_name)
        else:
            success.append(obj_name)

    if len(success) > 0:
        url = reverse("view_common_lib_dir", args=[dst_repo_id, dst_path.strip('/')])

    result = {'success': success, 'failed': failed, 'url': url}
    return HttpResponse(json.dumps(result), content_type=content_type)

@login_required_ajax
def get_cp_progress(request):
    '''
        Fetch progress of file/dir mv/cp.
    '''
    content_type = 'application/json; charset=utf-8'
    result = {}

    task_id = request.GET.get('task_id')
    if not task_id:
        result['error'] = _(u'Argument missing')
        return HttpResponse(json.dumps(result), status=400,
                    content_type=content_type)

    res = seafile_api.get_copy_task(task_id)

    # res can be None
    if not res:
        result['error'] = _(u'Error')
        return HttpResponse(json.dumps(result), status=500, content_type=content_type)

    result['done'] = res.done
    result['total'] = res.total
    result['canceled'] = res.canceled
    result['failed'] = res.failed
    result['successful'] = res.successful

    return HttpResponse(json.dumps(result), content_type=content_type)

@login_required_ajax
def cancel_cp(request):
    '''
        cancel file/dir mv/cp.
    '''
    content_type = 'application/json; charset=utf-8'
    result = {}

    task_id = request.GET.get('task_id')
    if not task_id:
        result['error'] = _('Argument missing')
        return HttpResponse(json.dumps(result), status=400,
                    content_type=content_type)

    res = seafile_api.cancel_copy_task(task_id) # returns 0 or -1

    if res == 0:
        result['success'] = True
        return HttpResponse(json.dumps(result), content_type=content_type)
    else:
        result['error'] = _('Cancel failed')
        return HttpResponse(json.dumps(result), status=400,
                    content_type=content_type)

########## contacts related
@login_required_ajax
def get_current_commit(request, repo_id):
    content_type = 'application/json; charset=utf-8'

    repo = get_repo(repo_id)
    if not repo:
        err_msg = _(u'Library does not exist.')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=400, content_type=content_type)

    username = request.user.username
    user_perm = check_folder_permission(request, repo_id, '/')
    if user_perm is None:
        err_msg = _(u'Permission denied.')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=403, content_type=content_type)

    try:
        server_crypto = UserOptions.objects.is_server_crypto(username)
    except CryptoOptionNotSetError:
        # Assume server_crypto is ``False`` if this option is not set.
        server_crypto = False

    if repo.encrypted and \
            (repo.enc_version == 1 or (repo.enc_version == 2 and server_crypto)) \
            and not seafile_api.is_password_set(repo.id, username):
        err_msg = _(u'Library is encrypted.')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=403, content_type=content_type)

    head_commit = get_commit(repo.id, repo.version, repo.head_cmmt_id)
    if not head_commit:
        err_msg = _(u'Error: no head commit id')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=500, content_type=content_type)

    if new_merge_with_no_conflict(head_commit):
        info_commit = get_commit_before_new_merge(head_commit)
    else:
        info_commit = head_commit

    ctx = {
        'repo': repo,
        'info_commit': info_commit
    }
    html = render_to_string('snippets/current_commit.html', ctx,
                            context_instance=RequestContext(request))
    return HttpResponse(json.dumps({'html': html}),
                        content_type=content_type)


@login_required_ajax
def download_enc_file(request, repo_id, file_id):
    content_type = 'application/json; charset=utf-8'
    result = {}

    op = 'downloadblks'
    blklist = []

    if file_id == EMPTY_SHA1:
        result = { 'blklist':blklist, 'url':None, }
        return HttpResponse(json.dumps(result), content_type=content_type)

    try:
        blks = seafile_api.list_blocks_by_file_id(repo_id, file_id)
    except SearpcError as e:
        logger.error(e)
        result['error'] = _(u'Failed to get file block list')
        return HttpResponse(json.dumps(result), content_type=content_type)

    blklist = blks.split('\n')
    blklist = [i for i in blklist if len(i) == 40]
    token = seafile_api.get_fileserver_access_token(repo_id, file_id,
                                                    op, request.user.username)
    url = gen_block_get_url(token, None)
    result = {
        'blklist':blklist,
        'url':url,
        }
    return HttpResponse(json.dumps(result), content_type=content_type)

def upload_file_done(request):
    """Send a message when a file is uploaded.

    Arguments:
    - `request`:
    """
    ct = 'application/json; charset=utf-8'
    result = {}

    filename = request.GET.get('fn', '')
    if not filename:
        result['error'] = _('Argument missing')
        return HttpResponse(json.dumps(result), status=400, content_type=ct)
    repo_id = request.GET.get('repo_id', '')
    if not repo_id:
        result['error'] = _('Argument missing')
        return HttpResponse(json.dumps(result), status=400, content_type=ct)
    path = request.GET.get('p', '')
    if not path:
        result['error'] = _('Argument missing')
        return HttpResponse(json.dumps(result), status=400, content_type=ct)

    # a few checkings
    if not seafile_api.get_repo(repo_id):
        result['error'] = _('Wrong repo id')
        return HttpResponse(json.dumps(result), status=400, content_type=ct)

    owner = seafile_api.get_repo_owner(repo_id)
    if not owner:               # this is an org repo, get org repo owner
        owner = seafile_api.get_org_repo_owner(repo_id)

    file_path = path.rstrip('/') + '/' + filename
    if seafile_api.get_file_id_by_path(repo_id, file_path) is None:
        result['error'] = _('File does not exist')
        return HttpResponse(json.dumps(result), status=400, content_type=ct)

    # send singal
    upload_file_successful.send(sender=None,
                                repo_id=repo_id,
                                file_path=file_path,
                                owner=owner)

    return HttpResponse(json.dumps({'success': True}), content_type=ct)

@login_required_ajax
def get_popup_notices(request):
    """Get user's notifications.

    If unseen notices > 5, return all unseen notices.
    If unseen notices = 0, return last 5 notices.
    Otherwise return all unseen notices, plus some seen notices to make the
    sum equal to 5.

    Arguments:
    - `request`:
    """
    content_type = 'application/json; charset=utf-8'
    username = request.user.username

    result_notices = []
    unseen_notices = []
    seen_notices = []

    list_num = 5
    unseen_num = UserNotification.objects.count_unseen_user_notifications(username)
    if unseen_num == 0:
        seen_notices = UserNotification.objects.get_user_notifications(
            username)[:list_num]
    elif unseen_num > list_num:
        unseen_notices = UserNotification.objects.get_user_notifications(
            username, seen=False)
    else:
        unseen_notices = UserNotification.objects.get_user_notifications(
            username, seen=False)
        seen_notices = UserNotification.objects.get_user_notifications(
            username, seen=True)[:list_num - unseen_num]

    result_notices += unseen_notices
    result_notices += seen_notices

    # Add 'msg_from' or 'default_avatar_url' to notice.
    result_notices = add_notice_from_info(result_notices)

    ctx_notices = {"notices": result_notices}
    notice_html = render_to_string(
            'snippets/notice_html.html', ctx_notices,
            context_instance=RequestContext(request))

    return HttpResponse(json.dumps({
                "notice_html": notice_html,
                }), content_type=content_type)

@login_required_ajax
@require_POST
def set_notices_seen(request):
    """Set user's notices seen:

    Arguments:
    - `request`:
    """
    content_type = 'application/json; charset=utf-8'
    username = request.user.username

    unseen_notices = UserNotification.objects.get_user_notifications(username,
                                                                     seen=False)
    for notice in unseen_notices:
        notice.seen = True
        notice.save()

        # mark related user msg as read
        if notice.is_user_message():
            d = notice.user_message_detail_to_dict()
            msg_from = d.get('msg_from')
            UserMessage.objects.update_unread_messages(msg_from, username)

    return HttpResponse(json.dumps({'success': True}), content_type=content_type)

@login_required_ajax
@require_POST
def set_notice_seen_by_id(request):
    """

    Arguments:
    - `request`:
    """
    content_type = 'application/json; charset=utf-8'
    notice_id = request.GET.get('notice_id')

    try:
        notice = UserNotification.objects.get(id=notice_id)
    except UserNotification.DoesNotExist as e:
        logger.error(e)
        return HttpResponse(json.dumps({
                    'error': _(u'Failed')
                    }), status=400, content_type=content_type)

    if not notice.seen:
        notice.seen = True
        notice.save()

    return HttpResponse(json.dumps({'success': True}), content_type=content_type)


@login_required_ajax
def space_and_traffic(request):
    content_type = 'application/json; charset=utf-8'
    username = request.user.username

    # space & quota calculation
    org = ccnet_threaded_rpc.get_orgs_by_user(username)
    if not org:
        space_quota = seafile_api.get_user_quota(username)
        space_usage = seafile_api.get_user_self_usage(username)
    else:
        org_id = org[0].org_id
        space_quota = seafserv_threaded_rpc.get_org_user_quota(org_id,
                                                               username)
        space_usage = seafserv_threaded_rpc.get_org_user_quota_usage(
            org_id, username)

    rates = {}
    if space_quota > 0:
        rates['space_usage'] = str(float(space_usage) / space_quota * 100) + '%'
    else:                       # no space quota set in config
        rates['space_usage'] = '0%'

    # traffic calculation
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

    # payment url, TODO: need to remove from here.
    payment_url = ''
    ENABLE_PAYMENT = getattr(settings, 'ENABLE_PAYMENT', False)
    if ENABLE_PAYMENT:
        if is_org_context(request):
            if request.user.org and bool(request.user.org.is_staff) is True:
                # payment for org admin
                payment_url = reverse('org_plan')
            else:
                # no payment for org members
                ENABLE_PAYMENT = False
        else:
            # payment for personal account
            payment_url = reverse('plan')

    ctx = {
        "org": org,
        "space_quota": space_quota,
        "space_usage": space_usage,
        "rates": rates,
        "SHOW_TRAFFIC": SHOW_TRAFFIC,
        "TRAFFIC_STATS_ENABLED": TRAFFIC_STATS_ENABLED,
        "traffic_stat": traffic_stat,
        "ENABLE_PAYMENT": ENABLE_PAYMENT,
        "payment_url": payment_url,
    }

    html = render_to_string('snippets/space_and_traffic.html', ctx,
                            context_instance=RequestContext(request))
    return HttpResponse(json.dumps({"html": html}), content_type=content_type)

def get_share_in_repo_list(request, start, limit):
    """List share in repos.
    """
    username = request.user.username
    if is_org_context(request):
        org_id = request.user.org.org_id
        repo_list = seafile_api.get_org_share_in_repo_list(org_id, username,
                                                           -1, -1)
    else:
        repo_list = seafile_api.get_share_in_repo_list(username, -1, -1)

    for repo in repo_list:
        repo.user_perm = check_folder_permission(request, repo.repo_id, '/')
    return repo_list

def get_groups_by_user(request):
    """List user groups.
    """
    username = request.user.username
    if is_org_context(request):
        org_id = request.user.org.org_id
        return seaserv.get_org_groups_by_user(org_id, username)
    else:
        return seaserv.get_personal_groups_by_user(username)

def get_group_repos(request, groups):
    """Get repos shared to groups.
    """
    group_repos = []
    if is_org_context(request):
        org_id = request.user.org.org_id
        # For each group I joined...
        for grp in groups:
            # Get group repos, and for each group repos...
            for r_id in seafile_api.get_org_group_repoids(org_id, grp.id):
                repo_owner = seafile_api.get_org_repo_owner(r_id)
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
                r.user = repo_owner
                r.user_perm = check_folder_permission(request, r_id, '/')
                r.group = grp
                group_repos.append(r)
    else:
        # For each group I joined...
        for grp in groups:
            # Get group repos, and for each group repos...
            for r_id in seafile_api.get_group_repoids(grp.id):
                repo_owner = seafile_api.get_repo_owner(r_id)
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
                r.user = repo_owner
                r.user_perm = check_folder_permission(request, r_id, '/')
                r.group = grp
                group_repos.append(r)
    return group_repos

def get_file_uploaded_bytes(request, repo_id):
    """
    For resumable fileupload
    """
    content_type = 'application/json; charset=utf-8'

    parent_dir = request.GET.get('parent_dir')
    file_name = request.GET.get('file_name')

    if not parent_dir or not file_name:
        err_msg = _(u'Argument missing')
        return HttpResponse(json.dumps({"error": err_msg}), status=400,
                            content_type=content_type)

    repo = get_repo(repo_id)
    if not repo:
        err_msg = _(u'Library does not exist')
        return HttpResponse(json.dumps({"error": err_msg}), status=400,
                            content_type=content_type)

    file_path = os.path.join(parent_dir, file_name)
    uploadedBytes = seafile_api.get_upload_tmp_file_offset(repo_id, file_path)
    return HttpResponse(json.dumps({"uploadedBytes": uploadedBytes}),
            content_type=content_type)

@login_required_ajax
def get_file_op_url(request, repo_id):
    """Get file upload/update url for AJAX.
    """
    content_type = 'application/json; charset=utf-8'

    op_type = request.GET.get('op_type') # value can be 'upload', 'update', 'upload-blks', 'update-blks'
    path = request.GET.get('path')
    if not (op_type and path):
        err_msg = _(u'Argument missing')
        return HttpResponse(json.dumps({"error": err_msg}), status=400,
                            content_type=content_type)

    repo = get_repo(repo_id)
    if not repo:
        err_msg = _(u'Library does not exist')
        return HttpResponse(json.dumps({"error": err_msg}), status=400,
                            content_type=content_type)

    # permission checking
    if check_folder_permission(request, repo.id, path) != 'rw':
        err_msg = _(u'Permission denied')
        return HttpResponse(json.dumps({"error": err_msg}), status=403,
                            content_type=content_type)

    username = request.user.username
    if op_type == 'upload':
        if request.user.is_staff and get_system_default_repo_id() == repo.id:
            # Set username to 'system' to let fileserver release permission
            # check.
            username = 'system'

    if op_type.startswith('update'):
        token = seafile_api.get_fileserver_access_token(repo_id, 'dummy',
                                                        op_type, username)
    else:
        token = seafile_api.get_fileserver_access_token(repo_id, 'dummy',
                                                        op_type, username,
                                                        use_onetime=False)

    url = gen_file_upload_url(token, op_type + '-aj')

    return HttpResponse(json.dumps({"url": url}), content_type=content_type)

def get_file_upload_url_ul(request, token):
    """Get file upload url in dir upload link.

    Arguments:
    - `request`:
    - `token`:
    """
    if not request.is_ajax():
        raise Http404

    content_type = 'application/json; charset=utf-8'

    uls = UploadLinkShare.objects.get_valid_upload_link_by_token(token)
    if uls is None:
        return HttpResponse(json.dumps({"error": _("Bad upload link token.")}),
                            status=400, content_type=content_type)

    repo_id = uls.repo_id
    r = request.GET.get('r', '')
    if repo_id != r:            # perm check
        return HttpResponse(json.dumps({"error": _("Bad repo id in upload link.")}),
                            status=403, content_type=content_type)

    username = request.user.username or request.session.get('anonymous_email') or ''

    args = [repo_id, json.dumps({'anonymous_user': username}), 'upload', '']
    kwargs = {
        'use_onetime': False,
    }
    if (is_pro_version() and dj_settings.ENABLE_UPLOAD_LINK_VIRUS_CHECK):
        kwargs.update({'check_virus': True})

    try:
        acc_token = seafile_api.get_fileserver_access_token(*args, **kwargs)
    except SearpcError as e:
        logger.error(e)
        return HttpResponse(json.dumps({"error": _("Internal Server Error")}),
                            status=500, content_type=content_type)

    url = gen_file_upload_url(acc_token, 'upload-aj')
    return HttpResponse(json.dumps({"url": url}), content_type=content_type)

@login_required_ajax
def repo_history_changes(request, repo_id):
    changes = {}
    content_type = 'application/json; charset=utf-8'

    repo = get_repo(repo_id)
    if not repo:
        err_msg = _(u'Library does not exist.')
        return HttpResponse(json.dumps({'error': err_msg}),
                status=400, content_type=content_type)

    # perm check
    if check_folder_permission(request, repo_id, '/') is None:
        if request.user.is_staff is True:
            pass # Allow system staff to check repo changes
        else:
            err_msg = _(u"Permission denied")
            return HttpResponse(json.dumps({"error": err_msg}), status=403,
                            content_type=content_type)

    username = request.user.username
    try:
        server_crypto = UserOptions.objects.is_server_crypto(username)
    except CryptoOptionNotSetError:
        # Assume server_crypto is ``False`` if this option is not set.
        server_crypto = False

    if repo.encrypted and \
            (repo.enc_version == 1 or (repo.enc_version == 2 and server_crypto)) \
            and not is_passwd_set(repo_id, username):
        err_msg = _(u'Library is encrypted.')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=403, content_type=content_type)

    commit_id = request.GET.get('commit_id', '')
    if not commit_id:
        err_msg = _(u'Argument missing')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=400, content_type=content_type)

    changes = get_diff(repo_id, '', commit_id)

    c = get_commit(repo.id, repo.version, commit_id)
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

    changes['date_time'] = tsstr_sec(c.ctime)

    return HttpResponse(json.dumps(changes), content_type=content_type)

def _create_repo_common(request, repo_name, repo_desc, encryption,
                        uuid, magic_str, encrypted_file_key):
    """Common logic for creating repo.

    Returns:
        newly created repo id. Or ``None`` if error raised.
    """
    username = request.user.username
    try:
        if not encryption:
            if is_org_context(request):
                org_id = request.user.org.org_id
                repo_id = seafile_api.create_org_repo(repo_name, repo_desc,
                                                      username, None, org_id)
            else:
                repo_id = seafile_api.create_repo(repo_name, repo_desc,
                                                  username, None)
        else:
            if is_org_context(request):
                org_id = request.user.org.org_id
                repo_id = seafile_api.create_org_enc_repo(
                    uuid, repo_name, repo_desc, username, magic_str,
                    encrypted_file_key, enc_version=2, org_id=org_id)
            else:
                repo_id = seafile_api.create_enc_repo(
                    uuid, repo_name, repo_desc, username,
                    magic_str, encrypted_file_key, enc_version=2)
    except SearpcError as e:
        logger.error(e)
        repo_id = None

    return repo_id

@login_required_ajax
def ajax_repo_change_passwd(request, repo_id):
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
                    'error': 'Permission denied'}),
                    status=403, content_type=content_type)

    old_passwd = request.POST.get('old_passwd', '')
    new_passwd = request.POST.get('new_passwd', '')
    try:
        seafile_api.change_repo_passwd(repo_id, old_passwd, new_passwd, username)
    except SearpcError, e:
        return HttpResponse(json.dumps({
                    'error': e.msg,
                    }), status=400, content_type=content_type)

    return HttpResponse(json.dumps({'success': True}),
                        content_type=content_type)

@login_required_ajax
def get_folder_perm_by_path(request, repo_id):
    """
    Get user/group folder permission by path
    """
    result = {}
    content_type = 'application/json; charset=utf-8'

    if not (is_pro_version() and ENABLE_FOLDER_PERM):
        return HttpResponse(json.dumps({"error": True}),
                            status=403, content_type=content_type)

    path = request.GET.get('path', None)

    if not path:
        return HttpResponse(json.dumps({"error": _('Argument missing')}),
                            status=400, content_type=content_type)

    user_perms = seafile_api.list_folder_user_perm_by_repo(repo_id)
    group_perms = seafile_api.list_folder_group_perm_by_repo(repo_id)
    user_perms.reverse()
    group_perms.reverse()

    user_result_perms = []
    for user_perm in user_perms:
        user_email = user_perm.user
        try:
            User.objects.get(email=user_email)
        except User.DoesNotExist:
            continue

        if path == user_perm.path:
            user_result_perm = {
                "perm": user_perm.permission,
                "user": user_email,
                "user_name": email2nickname(user_email),
            }
            user_result_perms.append(user_result_perm)

    group_result_perms = []
    for group_perm in group_perms:
        group_id = group_perm.group_id
        group = ccnet_api.get_group(group_id)
        if not group:
            continue

        if path == group_perm.path:
            group_result_perm = {
                "perm": group_perm.permission,
                "group_id": group_id,
                "group_name": group.group_name,
            }
            group_result_perms.append(group_result_perm)

    result['user_perms'] = user_result_perms
    result['group_perms'] = group_result_perms

    return HttpResponse(json.dumps(result), content_type=content_type)

@login_required_ajax
def set_user_folder_perm(request, repo_id):
    """
    Add or modify or delete folder permission to a user
    """
    if request.method != 'POST':
        raise Http404

    content_type = 'application/json; charset=utf-8'

    if not (is_pro_version() and ENABLE_FOLDER_PERM):
        return HttpResponse(json.dumps({"error": _(u"Permission denied")}),
                            status=403, content_type=content_type)

    user = request.POST.get('user', None)
    path = request.POST.get('path', None)
    perm = request.POST.get('perm', None)
    op_type = request.POST.get('type', None)

    username = request.user.username

    ## check params
    if not user or not path or not perm or \
        op_type != 'add' and op_type != 'modify' and op_type != 'delete':
        return HttpResponse(json.dumps({"error": _('Argument missing')}),
                            status=400, content_type=content_type)

    repo = seafile_api.get_repo(repo_id)
    if not repo:
        return HttpResponse(json.dumps({"error": _('Library does not exist')}),
                            status=400, content_type=content_type)

    if repo.is_virtual:
        return HttpResponse(json.dumps({"error": _('Permission denied')}),
                            status=403, content_type=content_type)

    if is_org_context(request):
        repo_owner = seafile_api.get_org_repo_owner(repo_id)
    else:
        repo_owner = seafile_api.get_repo_owner(repo_id)

    if username != repo_owner:
        return HttpResponse(json.dumps({"error": _('Permission denied')}),
                            status=403, content_type=content_type)

    if perm is not None:
        if perm != 'r' and perm != 'rw':
            return HttpResponse(json.dumps({
                "error": _('Invalid folder permission, should be "rw" or "r"')
                }), status=400, content_type=content_type)

    if not path.startswith('/'):
        return HttpResponse(json.dumps({"error": _('Path should start with "/"')}),
                            status=400, content_type=content_type)

    if path != '/' and path.endswith('/'):
        return HttpResponse(json.dumps({"error": _('Path should not end with "/"')}),
                            status=400, content_type=content_type)

    if seafile_api.get_dir_id_by_path(repo_id, path) is None:
        return HttpResponse(json.dumps({"error": _('Invalid path')}),
                            status=400, content_type=content_type)

    ## add perm for user(s)
    if op_type == 'add':
        return add_user_folder_perm(request, repo_id, user, path, perm)

    if not is_registered_user(user):
        return HttpResponse(json.dumps({"error": _('Invalid user, should be registered')}),
                            status=400, content_type=content_type)

    user_folder_perm = seafile_api.get_folder_user_perm(repo_id, path, user)

    if op_type == 'modify':
        if user_folder_perm and user_folder_perm != perm:
            try:
                seafile_api.set_folder_user_perm(repo_id, path, perm, user)
                send_perm_audit_msg('modify-repo-perm', username, user, repo_id, path, perm)
            except SearpcError as e:
                logger.error(e)
                return HttpResponse(json.dumps({"error": _('Operation failed')}),
                                    status=500, content_type=content_type)
        else:
            return HttpResponse(json.dumps({"error": _('Wrong folder permission')}),
                                status=400, content_type=content_type)

    if op_type == 'delete':
        if user_folder_perm:
            try:
                seafile_api.rm_folder_user_perm(repo_id, path, user)
                send_perm_audit_msg('delete-repo-perm', username, user, repo_id, path, perm)
            except SearpcError as e:
                logger.error(e)
                return HttpResponse(json.dumps({"error": _('Operation failed')}),
                                    status=500, content_type=content_type)
        else:
            return HttpResponse(json.dumps({"error": _('Please add folder permission first')}),
                                status=400, content_type=content_type)

    return HttpResponse(json.dumps({'success': True}), content_type=content_type)

def add_user_folder_perm(request, repo_id, users, path, perm):
    """
    Add folder permission for user(s)
    """
    content_type = 'application/json; charset=utf-8'

    emails = users.split(',')

    success, failed = [], []
    username = request.user.username

    for user in [e.strip() for e in emails if e.strip()]:
        if not is_valid_username(user):
            failed.append(user)
            continue

        if not is_registered_user(user):
            failed.append(user)
            continue

        user_folder_perm = seafile_api.get_folder_user_perm(repo_id, path, user)

        if user_folder_perm:
            # Already add this folder permission
            continue

        try:
            seafile_api.add_folder_user_perm(repo_id, path, perm, user)
            send_perm_audit_msg('add-repo-perm', username, user, repo_id, path, perm)
            success.append({
                'user': user,
                'user_name': email2nickname(user)
                })
        except SearpcError as e:
            logger.error(e)
            failed.append(user)

    if len(success) > 0:
        data = json.dumps({"success": success, "failed": failed})
        return HttpResponse(data, content_type=content_type)
    else:
        data = json.dumps({
            "error": _("Please check the email(s) you entered and the contacts you selected")
            })
        return HttpResponse(data, status=400, content_type=content_type)

@login_required_ajax
def set_group_folder_perm(request, repo_id):
    """
    Add or modify or delete folder permission to a group
    """
    if request.method != 'POST':
        raise Http404

    content_type = 'application/json; charset=utf-8'

    if not (is_pro_version() and ENABLE_FOLDER_PERM):
        return HttpResponse(json.dumps({"error": _(u"Permission denied")}),
                            status=403, content_type=content_type)

    group_id = request.POST.get('group_id', None)
    path = request.POST.get('path', None)
    perm = request.POST.get('perm', None)
    op_type = request.POST.get('type', None)

    username = request.user.username

    if not group_id or not path or not perm or \
        op_type != 'add' and op_type != 'modify' and op_type != 'delete':
        return HttpResponse(json.dumps({"error": _('Argument missing')}),
                            status=400, content_type=content_type)

    ## check params
    repo = seafile_api.get_repo(repo_id)
    if not repo:
        return HttpResponse(json.dumps({"error": _('Library does not exist')}),
                            status=400, content_type=content_type)

    if repo.is_virtual:
        return HttpResponse(json.dumps({"error": _('Permission denied')}),
                            status=403, content_type=content_type)

    if is_org_context(request):
        repo_owner = seafile_api.get_org_repo_owner(repo_id)
    else:
        repo_owner = seafile_api.get_repo_owner(repo_id)

    if username != repo_owner:
        return HttpResponse(json.dumps({"error": _('Permission denied')}),
                            status=403, content_type=content_type)

    if perm is not None:
        if perm != 'r' and perm != 'rw':
            return HttpResponse(json.dumps({
                "error": _('Invalid folder permission, should be "rw" or "r"')
                }), status=400, content_type=content_type)

    if not path.startswith('/'):
        return HttpResponse(json.dumps({"error": _('Path should start with "/"')}),
                            status=400, content_type=content_type)

    if path != '/' and path.endswith('/'):
        return HttpResponse(json.dumps({"error": _('Path should not end with "/"')}),
                            status=400, content_type=content_type)

    if seafile_api.get_dir_id_by_path(repo_id, path) is None:
        return HttpResponse(json.dumps({"error": _('Invalid path')}),
                            status=400, content_type=content_type)

    ## add perm for group(s)
    if op_type == 'add':
        return add_group_folder_perm(request, repo_id, group_id, path, perm)

    group_id = int(group_id)
    if not seaserv.get_group(group_id):
        return HttpResponse(json.dumps({"error": _('Invalid group')}),
                            status=400, content_type=content_type)

    group_folder_perm = seafile_api.get_folder_group_perm(repo_id, path, group_id)

    if op_type == 'modify':
        if group_folder_perm and group_folder_perm != perm:
            try:
                seafile_api.set_folder_group_perm(repo_id, path, perm, group_id)
                send_perm_audit_msg('modify-repo-perm', username, group_id, repo_id, path, perm)
            except SearpcError as e:
                logger.error(e)
                return HttpResponse(json.dumps({"error": _('Operation failed')}),
                                    status=500, content_type=content_type)
        else:
            return HttpResponse(json.dumps({"error": _('Wrong folder permission')}),
                                status=400, content_type=content_type)

    if op_type == 'delete':
        if group_folder_perm:
            try:
                seafile_api.rm_folder_group_perm(repo_id, path, group_id)
                send_perm_audit_msg('delete-repo-perm', username, group_id, repo_id, path, perm)
            except SearpcError as e:
                logger.error(e)
                return HttpResponse(json.dumps({"error": _('Operation failed')}),
                                    status=500, content_type=content_type)
        else:
            return HttpResponse(json.dumps({"error": _('Please add folder permission first')}),
                                status=400, content_type=content_type)

    return HttpResponse(json.dumps({'success': True}), content_type=content_type)

def add_group_folder_perm(request, repo_id, group_ids, path, perm):
    """
    Add folder permission for group(s)
    """
    content_type = 'application/json; charset=utf-8'

    group_id_list = group_ids.split(',') # 'user'

    success, failed = [], []
    username = request.user.username

    for group_id in group_id_list:
        group_id = int(group_id)
        if not seaserv.get_group(group_id):
            failed.append(group_id)

        group_folder_perm = seafile_api.get_folder_group_perm(repo_id, path, group_id)

        if group_folder_perm:
            #Already add this folder permission
            continue

        try:
            seafile_api.add_folder_group_perm(repo_id, path, perm, group_id)
            send_perm_audit_msg('add-repo-perm', username, group_id, repo_id, path, perm)
            success.append({
                'group_id': group_id,
                "group_name": get_group(group_id).group_name,
                })
        except SearpcError as e:
            logger.error(e)
            failed.append(group_id)

    if len(success) > 0:
        data = json.dumps({"success": success, "failed": failed})
        return HttpResponse(data, content_type=content_type)
    else:
        data = json.dumps({"error": _("Failed")})
        return HttpResponse(data, status=400, content_type=content_type)


@login_required_ajax
def toggle_group_modules(request, group_id):

    content_type = 'application/json; charset=utf-8'
    result = {}

    group_id_int = int(group_id) # Checked by URL Conf
    group = get_group(group_id_int)
    if not group:
        result["error"] = _('Group does not exist.')
        return HttpResponse(json.dumps(result),
                            status=400, content_type=content_type)

    group.is_staff = is_group_staff(group, request.user)
    if not group.is_staff:
        result["error"] = _('Permission denied.')
        return HttpResponse(json.dumps(result),
                            status=403, content_type=content_type)

    group_wiki = request.POST.get('group_wiki', '')
    if group_wiki == 'true':
        enable_mod_for_group(group.id, MOD_GROUP_WIKI)
    else:
        disable_mod_for_group(group.id, MOD_GROUP_WIKI)

    return HttpResponse(json.dumps({ "success": True }),
            content_type=content_type)

@login_required_ajax
def toggle_personal_modules(request):

    content_type = 'application/json; charset=utf-8'
    result = {}

    if not request.user.permissions.can_add_repo:
        result["error"] = _('Permission denied.')
        return HttpResponse(json.dumps(result),
                            status=403, content_type=content_type)

    username = request.user.username
    personal_wiki = request.POST.get('personal_wiki', '')
    if personal_wiki == 'true':
        enable_mod_for_user(username, MOD_PERSONAL_WIKI)
    else:
        disable_mod_for_user(username, MOD_PERSONAL_WIKI)

    return HttpResponse(json.dumps({ "success": True }),
            content_type=content_type)


@login_required_ajax
def ajax_group_members_import(request, group_id):
    """Import users to group.

    Permission checking:
    1. Only group admin can add import group members
    """

    result = {}
    username = request.user.username
    content_type = 'application/json; charset=utf-8'

    group_id = int(group_id)
    try:
        group = seaserv.get_group(group_id)

        if not group:
            result['error'] = 'Group %s not found.' % group_id
            return HttpResponse(json.dumps(result), status=404,
                            content_type=content_type)
        # check permission
        if not is_group_admin_or_owner(group_id, username):
            result['error'] = 'Permission denied.'
            return HttpResponse(json.dumps(result), status=403,
                            content_type=content_type)

    except SearpcError as e:
        logger.error(e)
        result['error'] = 'Internal Server Error'
        return HttpResponse(json.dumps(result), status=500,
                        content_type=content_type)


    # get and convert uploaded file
    uploaded_file = request.FILES['file']
    if uploaded_file.size > 10 * 1024 * 1024:
        result['error'] = _(u'Failed, file is too large')
        return HttpResponse(json.dumps(result), status=403,
                        content_type=content_type)

    try:
        content = uploaded_file.read()
        encoding = chardet.detect(content)['encoding']
        if encoding != 'utf-8':
            content = content.decode(encoding, 'replace').encode('utf-8')

        filestream = StringIO.StringIO(content)
        reader = csv.reader(filestream)
    except Exception as e:
        logger.error(e)
        result['error'] = 'Internal Server Error'
        return HttpResponse(json.dumps(result), status=500,
                        content_type=content_type)

    # prepare email list from uploaded file
    emails_list = []
    for row in reader:
        if not row:
            continue

        email = row[0].strip().lower()
        emails_list.append(email)

    org_id = None
    if is_org_context(request):
        org_id = request.user.org.org_id

    result = {}
    result['failed'] = []
    result['success'] = []
    emails_need_add = []

    # check email validation
    for email in emails_list:
        try:
            User.objects.get(email=email)
        except User.DoesNotExist:
            result['failed'].append({
                'email': email,
                'error_msg': 'User %s not found.' % email
                })
            continue

        if is_group_member(group_id, email):
            result['failed'].append({
                'email': email,
                'error_msg': _(u'User %s is already a group member.') % email
                })
            continue

        # Can only invite organization users to group
        if org_id and not \
            seaserv.ccnet_threaded_rpc.org_user_exists(org_id, email):
            result['failed'].append({
                'email': email,
                'error_msg': _(u'User %s not found in organization.') % email
                })
            continue

        emails_need_add.append(email)

    # Add email to group.
    for email in emails_need_add:
        try:
            seaserv.ccnet_threaded_rpc.group_add_member(group_id,
                username, email)
            member_info = get_group_member_info(request, group_id, email)
            result['success'].append(member_info)
        except SearpcError as e:
            logger.error(e)
            result['failed'].append({
                'email': email,
                'error_msg': 'Internal Server Error'
                })

    return HttpResponse(json.dumps(result), content_type=content_type)

@login_required_ajax
def ajax_repo_dir_recycle_more(request, repo_id):
    """
    List 'more' repo/dir trash.
    """
    result = {}
    content_type = 'application/json; charset=utf-8'

    repo = seafile_api.get_repo(repo_id)
    if not repo:
        err_msg = 'Library %s not found.' % repo_id
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=404, content_type=content_type)

    path = request.GET.get('path', '/')
    path = '/' if path == '' else path
    if check_folder_permission(request, repo_id, path) != 'rw':
        err_msg = 'Permission denied.'
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=403, content_type=content_type)

    scan_stat = request.GET.get('scan_stat', None)
    try:
        deleted_entries = seafile_api.get_deleted(repo_id, 0, path, scan_stat)
    except SearpcError as e:
        logger.error(e)
        result['error'] = 'Internal server error'
        return HttpResponse(json.dumps(result), status=500,
                        content_type=content_type)

    new_scan_stat = deleted_entries[-1].scan_stat
    trash_more = True if new_scan_stat is not None else False

    more_entries_html = ''
    # since there will always have one 'deleted_entry' to tell scan_stat,
    # so if len of deleted_entries = 1, means have not get any trash dir/file
    # if len of deleted_entries > 1,
    # means have get trash dir/file from current scanned commits
    if len(deleted_entries) > 1:
        deleted_entries = deleted_entries[0:-1]
        for dirent in deleted_entries:
            if stat.S_ISDIR(dirent.mode):
                dirent.is_dir = True
            else:
                dirent.is_dir = False

        # Entries sort by deletion time in descending order.
        deleted_entries.sort(lambda x, y : cmp(y.delete_time,
                                               x.delete_time))
        ctx = {
            'show_recycle_root': True,
            'repo': repo,
            'dir_entries': deleted_entries,
            'dir_path': path,
            'MEDIA_URL': MEDIA_URL
        }

        more_entries_html = render_to_string("snippets/repo_dir_trash_tr.html", ctx)

    result = {
        'html': more_entries_html,
        'trash_more': trash_more,
        'new_scan_stat': new_scan_stat,
    }

    return HttpResponse(json.dumps(result), content_type=content_type)
