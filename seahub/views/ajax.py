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
from django.http import HttpResponse, Http404
from django.template.loader import render_to_string
from django.utils.http import urlquote
from django.utils.html import escape
from django.utils.timezone import now
from django.utils.translation import ugettext as _
from django.conf import settings as dj_settings
from django.template.defaultfilters import filesizeformat

import seaserv
from seaserv import seafile_api, is_passwd_set, ccnet_api, \
    seafserv_threaded_rpc
from pysearpc import SearpcError

from seahub.auth.decorators import login_required_ajax
from seahub.base.decorators import require_POST
from seahub.forms import RepoRenameDirentForm
from seahub.options.models import UserOptions, CryptoOptionNotSetError
from seahub.notifications.models import UserNotification
from seahub.notifications.views import add_notice_from_info
from seahub.share.models import UploadLinkShare
from seahub.signals import upload_file_successful
from seahub.views import get_unencry_rw_repos_by_user, \
    get_diff, check_folder_permission
from seahub.group.utils import is_group_member, is_group_admin_or_owner, \
    get_group_member_info
import seahub.settings as settings
from seahub.settings import ENABLE_THUMBNAIL, THUMBNAIL_ROOT, \
    THUMBNAIL_DEFAULT_SIZE, SHOW_TRAFFIC, MEDIA_URL, ENABLE_VIDEO_THUMBNAIL
from seahub.utils import check_filename_with_rename, EMPTY_SHA1, \
    gen_block_get_url, \
    new_merge_with_no_conflict, get_commit_before_new_merge, \
    gen_file_upload_url, is_org_context, is_pro_version, normalize_dir_path, \
    FILEEXT_TYPE_MAP
from seahub.utils.star import get_dir_starred_files
from seahub.utils.file_types import IMAGE, VIDEO, XMIND
from seahub.utils.file_op import check_file_lock, ONLINE_OFFICE_LOCK_OWNER
from seahub.utils.repo import get_locked_files_by_dir, get_repo_owner, \
        repo_has_been_shared_out, parse_repo_perm
from seahub.utils.error_msg import file_type_error_msg, file_size_error_msg
from seahub.base.accounts import User
from seahub.thumbnail.utils import get_thumbnail_src
from seahub.share.utils import is_repo_admin
from seahub.base.templatetags.seahub_tags import translate_seahub_time, \
    email2nickname, tsstr_sec
from seahub.constants import PERMISSION_READ_WRITE
from seahub.constants import HASH_URLS

# Get an instance of a logger
logger = logging.getLogger(__name__)

########## Seafile API Wrapper
def get_repo(repo_id):
    return seafile_api.get_repo(repo_id)

def get_commit(repo_id, repo_version, commit_id):
    return seaserv.get_commit(repo_id, repo_version, commit_id)

def get_group(gid):
    return seaserv.get_group(gid)

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

    joined = is_group_member(group_id_int, request.user.username)
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
def unenc_rw_repos(request):
    """Get a user's unencrypt repos that he/she can read-write.

    Arguments:
    - `request`:
    """
    content_type = 'application/json; charset=utf-8'
    acc_repos = get_unencry_rw_repos_by_user(request)

    repo_list = []
    for repo in acc_repos:
        repo_list.append({"name": repo.name, "id": repo.id})

    repo_list.sort(lambda x, y: cmp(x['name'].lower(), y['name'].lower()))
    return HttpResponse(json.dumps(repo_list), content_type=content_type)

def convert_repo_path_when_can_not_view_folder(request, repo_id, path):

    content_type = 'application/json; charset=utf-8'

    path = normalize_dir_path(path)
    username = request.user.username
    converted_repo_path = seafile_api.convert_repo_path(repo_id, path, username)
    if not converted_repo_path:
        err_msg = _(u'Permission denied.')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=403, content_type=content_type)

    converted_repo_path = json.loads(converted_repo_path)

    repo_id = converted_repo_path['repo_id']
    repo = seafile_api.get_repo(repo_id)
    if not repo:
        err_msg = 'Library not found.'
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=404, content_type=content_type)

    path = converted_repo_path['path']
    path = normalize_dir_path(path)
    dir_id = seafile_api.get_dir_id_by_path(repo.id, path)
    if not dir_id:
        err_msg = 'Folder not found.'
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=404, content_type=content_type)

    group_id = ''
    if converted_repo_path.has_key('group_id'):
        group_id = converted_repo_path['group_id']
        if not ccnet_api.get_group(group_id):
            err_msg = 'Group not found.'
            return HttpResponse(json.dumps({'error': err_msg}),
                                status=404, content_type=content_type)

        if not is_group_member(group_id, username):
            err_msg = _(u'Permission denied.')
            return HttpResponse(json.dumps({'error': err_msg}),
                                status=403, content_type=content_type)

    user_perm = check_folder_permission(request, repo_id, path)
    if not user_perm:
        err_msg = _(u'Permission denied.')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=403, content_type=content_type)

    if not group_id:
        next_url = '#shared-libs/lib/%s/%s' % (repo_id, path.strip('/'))
    else:
        next_url = '#group/%s/lib/%s/%s' % (group_id, repo_id, path.strip('/'))

    return HttpResponse(json.dumps({'next_url': next_url}), content_type=content_type)

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
    path = normalize_dir_path(path)
    dir_id = seafile_api.get_dir_id_by_path(repo.id, path)
    if not dir_id:
        err_msg = 'Folder not found.'
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=404, content_type=content_type)

    # perm for current dir
    user_perm = check_folder_permission(request, repo_id, path)
    if not user_perm:
        return convert_repo_path_when_can_not_view_folder(request, repo_id, path)

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

    result["repo_owner"] = repo_owner
    result["is_repo_owner"] = False
    result["has_been_shared_out"] = False
    result["is_admin"] = is_repo_admin(username, repo_id)
    if repo_owner == username:
        result["is_repo_owner"] = True
        try:
            result["has_been_shared_out"] = repo_has_been_shared_out(request, repo_id)
        except Exception as e:
            logger.error(e)

    if result["is_admin"]:
        result["has_been_shared_out"] = True

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
        f_['obj_name'] = f.obj_name
        f_['last_modified'] = f.last_modified
        f_['last_update'] = translate_seahub_time(f.last_modified)
        f_['starred'] = f.starred
        f_['file_size'] = filesizeformat(f.file_size)
        f_['obj_id'] = f.obj_id
        f_['perm'] = f.permission # perm for file in current dir

        if not repo.encrypted and ENABLE_THUMBNAIL:
            # used for providing a way to determine
            # if send a request to create thumbnail.

            fileExt = os.path.splitext(f.obj_name)[1][1:].lower()
            file_type = FILEEXT_TYPE_MAP.get(fileExt)
            if file_type == IMAGE:
                f_['is_img'] = True

            if file_type == VIDEO and ENABLE_VIDEO_THUMBNAIL:
                f_['is_video'] = True

            if file_type == XMIND:
                f_['is_xmind'] = True

            if file_type in (IMAGE, XMIND) or \
                    file_type == VIDEO and ENABLE_VIDEO_THUMBNAIL:
                # if thumbnail has already been created, return its src.
                # Then web browser will use this src to get thumbnail instead of
                # recreating it.
                thumbnail_file_path = os.path.join(THUMBNAIL_ROOT, str(size), f.obj_id)
                thumbnail_exist = os.path.exists(thumbnail_file_path)
                if thumbnail_exist:
                    file_path = posixpath.join(path, f.obj_name)
                    src = get_thumbnail_src(repo_id, size, file_path)
                    f_['encoded_thumbnail_src'] = urlquote(src)

        if is_pro_version():
            f_['is_locked'] = True if f.is_locked else False
            f_['lock_owner'] = f.lock_owner
            f_['lock_owner_name'] = email2nickname(f.lock_owner)

            f_['locked_by_me'] = False
            if f.lock_owner == username:
                f_['locked_by_me'] = True

            if f.lock_owner == ONLINE_OFFICE_LOCK_OWNER and \
                    user_perm == PERMISSION_READ_WRITE:
                f_['locked_by_me'] = True

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
        # check file lock
        try:
            is_locked, locked_by_me = check_file_lock(repo_id, full_path, username)
        except Exception as e:
            logger.error(e)
            err_msg = 'Internal Server Error'
            return HttpResponse(json.dumps({'error': err_msg}), status=500,
                                content_type=content_type)

        if is_locked and not locked_by_me:
            err_msg = _("File is locked")
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

        # check file lock
        try:
            is_locked, locked_by_me = check_file_lock(repo_id, full_path, username)
        except Exception as e:
            logger.error(e)
            err_msg = 'Internal Server Error'
            return HttpResponse(json.dumps({'error': err_msg}), status=500,
                                content_type=content_type)

        if is_locked and not locked_by_me:
            err_msg = _("File is locked")
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
    deleted = []
    undeleted = []
    allowed_dirents_names = []
    username = request.user.username

    locked_files = get_locked_files_by_dir(request, repo_id, parent_dir)

    # check parent dir perm for files
    if check_folder_permission(request, repo_id, parent_dir) != 'rw':
        undeleted += dirents_names
    else:
        for dirent_name in dirents_names:
            if dirent_name not in locked_files.keys():
                # file is not locked
                allowed_dirents_names.append(dirent_name)
            elif locked_files[dirent_name] == username:
                # file is locked by current user
                allowed_dirents_names.append(dirent_name)
            else:
                undeleted.append(dirent_name)

    multi_files = ''
    for dirent_name in allowed_dirents_names:
        full_path = posixpath.join(parent_dir, dirent_name)
        if check_folder_permission(request, repo.id, full_path) != 'rw':
            undeleted.append(dirent_name)
            continue

        multi_files += dirent_name + '\t'
        deleted.append(dirent_name)

    try:
        seafile_api.del_file(repo_id, parent_dir, multi_files, username)
    except SearpcError, e:
        logger.error(e)

    return HttpResponse(json.dumps({'deleted': deleted, 'undeleted': undeleted}),
                        content_type=content_type)

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
            src_repo_owner = seafile_api.get_repo_owner(repo_id)
            dst_repo_owner = seafile_api.get_repo_owner(dst_repo_id)
            try:
                # always check quota when copy file
                if view_method.__name__ == 'cp_dirents':
                    out_of_quota = seafile_api.check_quota(
                            dst_repo_id, delta=file_obj_size + dir_obj_size)
                else:
                    # when move file
                    if src_repo_owner != dst_repo_owner:
                        # only check quota when src_repo_owner != dst_repo_owner
                        out_of_quota = seafile_api.check_quota(
                                dst_repo_id, delta=file_obj_size + dir_obj_size)
                    else:
                        # not check quota when src and dst repo are both mine
                        out_of_quota = False
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

    # when dst is the same as src
    if src_repo_id == dst_repo_id and src_path == dst_path:
        result['error'] = _('Invalid destination path')
        return HttpResponse(json.dumps(result), status=400,
                            content_type=content_type)

    locked_files = get_locked_files_by_dir(request, src_repo_id, src_path)

    # check parent dir perm for files
    if check_folder_permission(request, src_repo_id, src_path) != 'rw':
        failed += obj_file_names
    else:
        for file_name in obj_file_names:
            if file_name not in locked_files.keys():
                # file is not locked
                allowed_files.append(file_name)
            elif locked_files[file_name] == username:
                # file is locked by current user
                allowed_files.append(file_name)
            else:
                failed.append(file_name)

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

    # only check quota when move file/dir between different user's repo
    if get_repo_owner(request, src_repo_id) != get_repo_owner(request, dst_repo_id):
        # get total size of file/dir to be copied
        total_size = 0
        repo = seafile_api.get_repo(src_repo_id)
        for obj_name in obj_file_names + obj_dir_names:

            current_size = 0
            current_path = posixpath.join(src_path, obj_name)

            current_file_id = seafile_api.get_file_id_by_path(src_repo_id,
                    current_path)
            if current_file_id:
                current_size = seafile_api.get_file_size(repo.store_id,
                        repo.version, current_file_id)

            current_dir_id = seafile_api.get_dir_id_by_path(src_repo_id,
                    current_path)
            if current_dir_id:
                current_size = seafile_api.get_dir_size(repo.store_id,
                        repo.version, current_dir_id)

            total_size += current_size

        # check if above quota for dst repo
        if seafile_api.check_quota(dst_repo_id, total_size) < 0:
            return HttpResponse(json.dumps({'error': _(u"Out of quota.")}),
                                status=443, content_type=content_type)

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
        dst_repo = seafile_api.get_repo(dst_repo_id)
        url = reverse('lib_view', args=[dst_repo_id, dst_repo.name, dst_path.strip('/')])
    result = {'success': success, 'failed': failed, 'url': url}
    return HttpResponse(json.dumps(result), content_type=content_type)

@login_required_ajax
@dirents_copy_move_common()
def cp_dirents(request, src_repo_id, src_path, dst_repo_id, dst_path, obj_file_names, obj_dir_names):
    result = {}
    content_type = 'application/json; charset=utf-8'
    username = request.user.username

    if parse_repo_perm(check_folder_permission(
            request, src_repo_id, src_path)).can_copy is False:
        error_msg = _(u'You do not have permission to copy files/folders in this directory')
        result['error'] = error_msg
        return HttpResponse(json.dumps(result), status=403, content_type=content_type)

    dst_path = normalize_dir_path(dst_path)
    for obj_name in obj_dir_names:
        src_dir = posixpath.join(src_path, obj_name)
        src_dir = normalize_dir_path(src_dir)
        if dst_path.startswith(src_dir):
            error_msg = _(u'Can not copy directory %(src)s to its subdirectory %(des)s') \
                % {'src': escape(src_dir), 'des': escape(dst_path)}
            result['error'] = error_msg
            return HttpResponse(json.dumps(result), status=400, content_type=content_type)

    # get total size of file/dir to be copied
    total_size = 0
    repo = seafile_api.get_repo(src_repo_id)
    for obj_name in obj_file_names + obj_dir_names:

        current_size = 0
        current_path = posixpath.join(src_path, obj_name)

        current_file_id = seafile_api.get_file_id_by_path(src_repo_id,
                current_path)
        if current_file_id:
            current_size = seafile_api.get_file_size(repo.store_id,
                    repo.version, current_file_id)

        current_dir_id = seafile_api.get_dir_id_by_path(src_repo_id,
                current_path)
        if current_dir_id:
            current_size = seafile_api.get_dir_size(repo.store_id,
                    repo.version, current_dir_id)

        total_size += current_size

    # check if above quota for dst repo
    if seafile_api.check_quota(dst_repo_id, total_size) < 0:
        return HttpResponse(json.dumps({'error': _(u"Out of quota.")}),
                            status=443, content_type=content_type)

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
        dst_repo = seafile_api.get_repo(dst_repo_id)
        url = reverse('lib_view', args=[dst_repo_id, dst_repo.name, dst_path.strip('/')])
    result = {'success': success, 'failed': failed, 'url': url}
    return HttpResponse(json.dumps(result), content_type=content_type)

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
    html = render_to_string(request, 'snippets/current_commit.html', ctx)
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
    token = seafile_api.get_fileserver_access_token(repo_id,
            file_id, op, request.user.username)

    if not token:
        result['error'] = _(u'FileServer access token invalid.')
        return HttpResponse(json.dumps(result), content_type=content_type)

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

    # get upload link share creator
    token = request.GET.get('token', '')
    if not token:
        result['error'] = _('Argument missing')
        return HttpResponse(json.dumps(result), status=400, content_type=ct)

    uls = UploadLinkShare.objects.get_valid_upload_link_by_token(token)
    if uls is None:
        result['error'] = _('Bad upload link token.')
        return HttpResponse(json.dumps(result), status=400, content_type=ct)
    creator = uls.username

    file_path = path.rstrip('/') + '/' + filename
    if seafile_api.get_file_id_by_path(repo_id, file_path) is None:
        result['error'] = _('File does not exist')
        return HttpResponse(json.dumps(result), status=400, content_type=ct)

    # send singal
    upload_file_successful.send(sender=None,
                                repo_id=repo_id,
                                file_path=file_path,
                                owner=creator)

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
            'snippets/notice_html.html', ctx_notices)

    return HttpResponse(json.dumps({
                "notice_html": notice_html,
                }), content_type=content_type)

@login_required_ajax
def space_and_traffic(request):
    content_type = 'application/json; charset=utf-8'
    username = request.user.username

    # space & quota calculation
    org = ccnet_api.get_orgs_by_user(username)
    if not org:
        space_quota = seafile_api.get_user_quota(username)
        space_usage = seafile_api.get_user_self_usage(username)
    else:
        org_id = org[0].org_id
        space_quota = seafile_api.get_org_user_quota(org_id, username)
        space_usage = seafile_api.get_org_user_quota_usage(org_id, username)

    rates = {}
    if space_quota > 0:
        rates['space_usage'] = str(float(space_usage) / space_quota * 100) + '%'
    else:                       # no space quota set in config
        rates['space_usage'] = '0%'

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
        "ENABLE_PAYMENT": ENABLE_PAYMENT,
        "payment_url": payment_url,
        "user": request.user
    }

    html = render_to_string('snippets/space_and_traffic.html', ctx)
    return HttpResponse(json.dumps({"html": html}), content_type=content_type)

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

    shared_by = uls.username
    repo_id = uls.repo_id
    r = request.GET.get('r', '')
    if repo_id != r:            # perm check
        return HttpResponse(json.dumps({"error": _("Bad repo id in upload link.")}),
                            status=403, content_type=content_type)

    repo = get_repo(repo_id)
    if not repo:
        return HttpResponse(json.dumps({"error": _("Library does not exist")}),
                            status=404, content_type=content_type)

    if repo.encrypted or \
            seafile_api.check_permission_by_path(repo_id, '/', shared_by) != 'rw':
        return HttpResponse(json.dumps({"error": _("Permission denied")}),
                            status=403, content_type=content_type)

    dir_id = seafile_api.get_dir_id_by_path(uls.repo_id, uls.path)
    args = [repo_id, dir_id, 'upload-link', shared_by]
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

    if not acc_token:
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
def ajax_group_members_import(request, group_id):
    """Import users to group.

    Permission checking:
    1. Only group admin can add import group members
    """

    result = {}
    username = request.user.username
    content_type = 'application/json; charset=utf-8'

    # get and convert uploaded file
    uploaded_file = request.FILES['file']
    ext = os.path.splitext(uploaded_file.name)[1].lower()
    if ext != '.csv':
        result['error'] = file_type_error_msg(ext, "csv")
        return HttpResponse(json.dumps(result), status=400,
                        content_type=content_type)

    if uploaded_file.size > 10 * 1024 * 1024:
        result['error'] = file_size_error_msg(uploaded_file.size, 10 * 1024 * 1024)
        return HttpResponse(json.dumps(result), status=400,
                        content_type=content_type)

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

        if is_group_member(group_id, email, in_structure=False):
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
    List first/'more' batch of repo/dir trash.
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
        # a list will be returned, with at least 1 item in it
        # the last item is not a deleted entry, and it contains an attribute named 'scan_stat'
        deleted_entries = seafile_api.get_deleted(repo_id, 0, path, scan_stat)
    except SearpcError as e:
        logger.error(e)
        result['error'] = 'Internal server error'
        return HttpResponse(json.dumps(result), status=500,
                        content_type=content_type)

    new_scan_stat = deleted_entries[-1].scan_stat
    trash_more = True if new_scan_stat is not None else False

    more_entries_html = ''
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
            'MEDIA_URL': MEDIA_URL,
            'referer': request.GET.get('referer', '')
        }

        more_entries_html = render_to_string("snippets/repo_dir_trash_tr.html", ctx)

    result = {
        'html': more_entries_html,
        'trash_more': trash_more,
        'new_scan_stat': new_scan_stat,
    }

    return HttpResponse(json.dumps(result), content_type=content_type)
