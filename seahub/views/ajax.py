# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
import os
import stat
import logging
import json
import posixpath
import csv
import chardet
import io

from django.urls import reverse
from django.http import HttpResponse, Http404
from django.template.loader import render_to_string
from urllib.parse import quote
from django.utils.html import escape
from django.utils.timezone import now
from django.utils.translation import gettext as _
from django.conf import settings as dj_settings
from django.template.defaultfilters import filesizeformat

import seaserv
from seaserv import seafile_api, ccnet_api, \
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
from seahub.settings import THUMBNAIL_ROOT, \
    THUMBNAIL_DEFAULT_SIZE, SHOW_TRAFFIC, MEDIA_URL, ENABLE_VIDEO_THUMBNAIL
from seahub.utils import check_filename_with_rename, EMPTY_SHA1, \
    gen_block_get_url, \
    new_merge_with_no_conflict, get_commit_before_new_merge, \
    gen_file_upload_url, is_org_context, is_pro_version, normalize_dir_path, \
    FILEEXT_TYPE_MAP
from seahub.utils.star import get_dir_starred_files
from seahub.utils.file_types import IMAGE, VIDEO
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
def convert_repo_path_when_can_not_view_folder(request, repo_id, path):

    content_type = 'application/json; charset=utf-8'

    path = normalize_dir_path(path)
    username = request.user.username
    converted_repo_path = seafile_api.convert_repo_path(repo_id, path, username)
    if not converted_repo_path:
        err_msg = _('Permission denied.')
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
    if 'group_id' in converted_repo_path:
        group_id = converted_repo_path['group_id']
        if not ccnet_api.get_group(group_id):
            err_msg = 'Group not found.'
            return HttpResponse(json.dumps({'error': err_msg}),
                                status=404, content_type=content_type)

        if not is_group_member(group_id, username):
            err_msg = _('Permission denied.')
            return HttpResponse(json.dumps({'error': err_msg}),
                                status=403, content_type=content_type)

    user_perm = check_folder_permission(request, repo_id, path)
    if not user_perm:
        err_msg = _('Permission denied.')
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
        err_msg = _('Library does not exist.')
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
        err_msg = _('Library is encrypted.')
        return HttpResponse(json.dumps({'error': err_msg, 'lib_need_decrypt': True}),
                            status=403, content_type=content_type)

    head_commit = get_commit(repo.id, repo.version, repo.head_cmmt_id)
    if not head_commit:
        err_msg = _('Error: no head commit id')
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

        if not repo.encrypted:
            # used for providing a way to determine
            # if send a request to create thumbnail.

            fileExt = os.path.splitext(f.obj_name)[1][1:].lower()
            file_type = FILEEXT_TYPE_MAP.get(fileExt)
            if file_type == IMAGE:
                f_['is_img'] = True

            if file_type == VIDEO and ENABLE_VIDEO_THUMBNAIL:
                f_['is_video'] = True

            if file_type == IMAGE or \
                    (file_type == VIDEO and ENABLE_VIDEO_THUMBNAIL):
                # if thumbnail has already been created, return its src.
                # Then web browser will use this src to get thumbnail instead of
                # recreating it.
                thumbnail_file_path = os.path.join(THUMBNAIL_ROOT, str(size), f.obj_id)
                thumbnail_exist = os.path.exists(thumbnail_file_path)
                if thumbnail_exist:
                    file_path = posixpath.join(path, f.obj_name)
                    src = get_thumbnail_src(repo_id, size, file_path)
                    f_['encoded_thumbnail_src'] = quote(src)

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


def get_file_upload_url_ul(request, token):
    """Get file upload url in dir upload link.

    Arguments:
    - `request`:
    - `token`:
    """
    if not request.headers.get('x-requested-with') == 'XMLHttpRequest':
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
    if not dir_id:
        return HttpResponse(json.dumps({"error": _("Folder does not exist.")}),
                            status=404, content_type=content_type)

    obj_id = json.dumps({'parent_dir': uls.path})
    args = [repo_id, obj_id, 'upload-link', shared_by]
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
        err_msg = _('Library does not exist.')
        return HttpResponse(json.dumps({'error': err_msg}),
                status=400, content_type=content_type)

    # perm check
    if check_folder_permission(request, repo_id, '/') is None:
        if request.user.is_staff is True:
            pass # Allow system staff to check repo changes
        else:
            err_msg = _("Permission denied")
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
            and not seafile_api.is_password_set(repo_id, username):
        err_msg = _('Library is encrypted.')
        return HttpResponse(json.dumps({'error': err_msg}),
                            status=403, content_type=content_type)

    commit_id = request.GET.get('commit_id', '')
    if not commit_id:
        err_msg = _('Argument missing')
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
