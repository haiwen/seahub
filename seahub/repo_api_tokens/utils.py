import os

import logging
import posixpath
import stat
from urllib.parse import quote
from rest_framework import status
from seaserv import seafile_api

from seahub.api2.utils import api_error
from seahub.base.accounts import User
from seahub.base.models import UserStarredFiles
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email
from seahub.repo_api_tokens.models import RepoAPITokens
from seahub.settings import ENABLE_VIDEO_THUMBNAIL, THUMBNAIL_ROOT
from seahub.share.models import FileShare
from seahub.thumbnail.utils import get_thumbnail_src
from seahub.utils import is_pro_version, FILEEXT_TYPE_MAP, IMAGE, VIDEO
from seahub.utils.file_tags import get_files_tags_in_dir
from seahub.utils.repo import is_group_repo_staff, is_repo_owner, parse_repo_perm
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.constants import PERMISSION_INVISIBLE, PERMISSION_PREVIEW, PERMISSION_PREVIEW_EDIT, \
    PERMISSION_READ, PERMISSION_READ_WRITE
from seahub.views.file import can_edit_file

logger = logging.getLogger(__name__)
json_content_type = 'application/json; charset=utf-8'
HTTP_520_OPERATION_FAILED = 520


def permission_check_admin_owner(request, username, repo_id):  # maybe add more complex logic in the future
    """
    if repo is owned by user return true
    or check whether repo is owned by group and whether user is group's staff
    so finally the code is:
    check user == repo's owner
    else
    check user is the such group's staff
    """

    if is_repo_owner(request, repo_id, username):
        return True
    else:
        return is_group_repo_staff(request, repo_id, username)


def _collect_dir_file_recursively(repo_id, path, all_dirs):
    is_pro = is_pro_version()
    dirs = seafile_api.list_dir_by_path(repo_id, path, -1, -1)

    for dirent in dirs:
        entry = {}
        if stat.S_ISDIR(dirent.mode):
            entry["type"] = 'dir'
        else:
            entry["type"] = 'file'
            entry['modifier_email'] = dirent.modifier
            entry["size"] = dirent.size

            if is_pro:
                entry["is_locked"] = dirent.is_locked
                entry["lock_owner"] = dirent.lock_owner
                if dirent.lock_owner:
                    entry["lock_owner_name"] = email2nickname(dirent.lock_owner)
                entry["lock_time"] = dirent.lock_time

        entry["parent_dir"] = path
        entry["id"] = dirent.obj_id
        entry["name"] = dirent.obj_name
        entry["mtime"] = timestamp_to_isoformat_timestr(dirent.mtime)

        all_dirs.append(entry)

        if stat.S_ISDIR(dirent.mode):
            sub_path = posixpath.join(path, dirent.obj_name)
            _collect_dir_file_recursively(repo_id, sub_path, all_dirs)

    return all_dirs


def get_dir_file_recursively(repo_id, path, all_dirs):
    _collect_dir_file_recursively(repo_id, path, all_dirs)

    file_list = [item for item in all_dirs if item['type'] == 'file']
    contact_email_dict = {}
    nickname_dict = {}
    modifiers_set = {x['modifier_email'] for x in file_list}
    for e in modifiers_set:
        if e not in contact_email_dict:
            contact_email_dict[e] = email2contact_email(e)
        if e not in nickname_dict:
            nickname_dict[e] = email2nickname(e)

    for e in file_list:
        e['modifier_contact_email'] = contact_email_dict.get(e['modifier_email'], '')
        e['modifier_name'] = nickname_dict.get(e['modifier_email'], '')

    return all_dirs


def get_dir_file_info_list(username, request_type, repo_obj, parent_dir,
                           with_thumbnail, thumbnail_size):

    repo_id = repo_obj.id
    dir_info_list = []
    file_info_list = []

    # get dirent(folder and file) list
    parent_dir_id = seafile_api.get_dir_id_by_path(repo_id, parent_dir)
    dir_file_list = seafile_api.list_dir_with_perm(repo_id, parent_dir,
                                                   parent_dir_id, username,
                                                   -1, -1)

    try:
        starred_items = UserStarredFiles.objects.filter(email=username,
                                                        repo_id=repo_id,
                                                        path__startswith=parent_dir,
                                                        org_id=-1)
        starred_item_path_list = [f.path.rstrip('/') for f in starred_items]
    except Exception as e:
        logger.error(e)
        starred_item_path_list = []

    # only get dir info list
    if not request_type or request_type == 'd':

        dir_list = [dirent for dirent in dir_file_list if stat.S_ISDIR(dirent.mode)]

        for dirent in dir_list:

            if dirent.permission == PERMISSION_INVISIBLE:
                continue

            dir_info = {}
            dir_info["type"] = "dir"
            dir_info["id"] = dirent.obj_id
            dir_info["name"] = dirent.obj_name
            dir_info["mtime"] = timestamp_to_isoformat_timestr(dirent.mtime)
            dir_info["permission"] = dirent.permission
            dir_info["parent_dir"] = parent_dir
            dir_info_list.append(dir_info)

            # get star info
            dir_info['starred'] = False
            dir_path = posixpath.join(parent_dir, dirent.obj_name)
            if dir_path.rstrip('/') in starred_item_path_list:
                dir_info['starred'] = True

    # only get file info list
    if not request_type or request_type == 'f':

        file_list = [dirent for dirent in dir_file_list if not stat.S_ISDIR(dirent.mode)]

        # Use dict to reduce memcache fetch cost in large for-loop.
        nickname_dict = {}
        contact_email_dict = {}
        modifier_set = {x.modifier for x in file_list}
        lock_owner_set = {x.lock_owner for x in file_list}
        for e in modifier_set | lock_owner_set:
            if e not in nickname_dict:
                nickname_dict[e] = email2nickname(e)
            if e not in contact_email_dict:
                contact_email_dict[e] = email2contact_email(e)

        try:
            files_tags_in_dir = get_files_tags_in_dir(repo_id, parent_dir)
        except Exception as e:
            logger.error(e)
            files_tags_in_dir = {}

        for dirent in file_list:

            file_name = dirent.obj_name
            file_path = posixpath.join(parent_dir, file_name)
            file_obj_id = dirent.obj_id

            file_info = {}
            file_info["type"] = "file"
            file_info["id"] = file_obj_id
            file_info["name"] = file_name
            file_info["mtime"] = timestamp_to_isoformat_timestr(dirent.mtime)
            file_info["permission"] = dirent.permission
            file_info["parent_dir"] = parent_dir
            file_info["size"] = dirent.size

            modifier_email = dirent.modifier
            file_info['modifier_email'] = modifier_email
            file_info['modifier_name'] = nickname_dict.get(modifier_email, '')
            file_info['modifier_contact_email'] = contact_email_dict.get(modifier_email, '')

            # get lock info
            if is_pro_version():
                file_info["is_locked"] = dirent.is_locked
                file_info["lock_time"] = dirent.lock_time

                lock_owner_email = dirent.lock_owner or ''
                file_info["lock_owner"] = lock_owner_email
                file_info['lock_owner_name'] = nickname_dict.get(lock_owner_email, '')
                file_info['lock_owner_contact_email'] = contact_email_dict.get(lock_owner_email, '')

                if username == lock_owner_email:
                    file_info["locked_by_me"] = True
                else:
                    file_info["locked_by_me"] = False

            # get star info
            file_info['starred'] = False
            if file_path.rstrip('/') in starred_item_path_list:
                file_info['starred'] = True

            # get tag info
            file_tags = files_tags_in_dir.get(file_name, [])
            if file_tags:
                file_info['file_tags'] = []
                for file_tag in file_tags:
                    file_info['file_tags'].append(file_tag)

            # get thumbnail info
            if with_thumbnail and not repo_obj.encrypted:

                # used for providing a way to determine
                # if send a request to create thumbnail.

                fileExt = os.path.splitext(file_name)[1][1:].lower()
                file_type = FILEEXT_TYPE_MAP.get(fileExt)

                if file_type == IMAGE or \
                        (file_type == VIDEO and ENABLE_VIDEO_THUMBNAIL):

                    # if thumbnail has already been created, return its src.
                    # Then web browser will use this src to get thumbnail instead of
                    # recreating it.
                    thumbnail_file_path = os.path.join(THUMBNAIL_ROOT,
                                                       str(thumbnail_size),
                                                       file_obj_id)
                    if os.path.exists(thumbnail_file_path):
                        src = get_thumbnail_src(repo_id, thumbnail_size, file_path)
                        file_info['encoded_thumbnail_src'] = quote(src)

            file_info_list.append(file_info)

    dir_info_list.sort(key=lambda x: x['name'].lower())
    file_info_list.sort(key=lambda x: x['name'].lower())

    return dir_info_list, file_info_list


def check_upload_link_target(repo, path, username):
    if not seafile_api.get_dir_id_by_path(repo.id, path):
        error_msg = 'Folder %s not found.' % path
        return api_error(status.HTTP_404_NOT_FOUND, error_msg)

    if repo.encrypted or seafile_api.get_repo_status(repo.id) == 1 or \
            seafile_api.check_permission_by_path(repo.id, path, username) != PERMISSION_READ_WRITE:
        error_msg = 'Permission denied.'
        return api_error(status.HTTP_403_FORBIDDEN, error_msg)


def can_generate_share_link(repo_id, path, username, permission):
    folder_permission = seafile_api.check_permission_by_path(repo_id, path, username)
    if not folder_permission or not parse_repo_perm(folder_permission).can_generate_share_link:
        return False
    if folder_permission in (PERMISSION_PREVIEW, PERMISSION_PREVIEW_EDIT):
        return permission == FileShare.PERM_VIEW_ONLY
    if folder_permission == PERMISSION_READ:
        return permission in (FileShare.PERM_VIEW_DL, FileShare.PERM_VIEW_ONLY)
    if permission == FileShare.PERM_VIEW_DL_UPLOAD:
        return folder_permission == PERMISSION_READ_WRITE
    return True


def check_share_link_target(repo, path, username, permission, creating=False):
    if repo.encrypted:
        error_msg = 'Permission denied.'
        return None, api_error(status.HTTP_403_FORBIDDEN, error_msg)

    dirent = None
    if path != '/':
        dirent = seafile_api.get_dirent_by_path(repo.id, path)
        if not dirent:
            error_msg = 'Dirent %s not found.' % path
            return None, api_error(status.HTTP_404_NOT_FOUND, error_msg)

    is_dir = path == '/' or stat.S_ISDIR(dirent.mode)
    can_edit = permission in (FileShare.PERM_EDIT_DL, FileShare.PERM_EDIT_ONLY)
    can_upload = permission == FileShare.PERM_VIEW_DL_UPLOAD
    if (creating or can_edit or can_upload) and seafile_api.get_repo_status(repo.id) == 1:
        error_msg = 'Permission denied.'
        return None, api_error(status.HTTP_403_FORBIDDEN, error_msg)

    if not can_generate_share_link(repo.id, path, username, permission):
        error_msg = 'Permission denied.'
        return None, api_error(status.HTTP_403_FORBIDDEN, error_msg)
    if can_upload and not is_dir:
        error_msg = 'Permission denied.'
        return None, api_error(status.HTTP_403_FORBIDDEN, error_msg)
    if can_edit and not is_dir:
        editable, _ = can_edit_file(os.path.basename(path), dirent.size, repo)
        if not editable:
            error_msg = 'Permission denied.'
            return None, api_error(status.HTTP_403_FORBIDDEN, error_msg)

    return is_dir, None


def get_repo_for_link(request, can_generate_link):
    repo_token = getattr(request, 'repo_api_token_obj', None)
    if not isinstance(repo_token, RepoAPITokens):
        return None, api_error(status.HTTP_401_UNAUTHORIZED, 'Invalid token')

    if repo_token.permission != PERMISSION_READ_WRITE:
        error_msg = 'Permission denied.'
        return None, api_error(status.HTTP_403_FORBIDDEN, error_msg)

    try:
        user = User.objects.get(email=repo_token.generated_by)
    except User.DoesNotExist:
        error_msg = 'Permission denied.'
        return None, api_error(status.HTTP_403_FORBIDDEN, error_msg)

    if not user.is_active or not can_generate_link(user.permissions):
        error_msg = 'Permission denied.'
        return None, api_error(status.HTTP_403_FORBIDDEN, error_msg)

    repo = seafile_api.get_repo(repo_token.repo_id)
    if not repo:
        error_msg = 'Library %s not found.' % repo_token.repo_id
        return None, api_error(status.HTTP_404_NOT_FOUND, error_msg)

    return repo, None


def log_repo_link_change(request, operation, link_type, link):
    repo_token = request.repo_api_token_obj
    logger.info('%s %s link: app_name=%r user=%s repo_id=%s path=%r link_id=%s',
                operation, link_type, repo_token.app_name, repo_token.generated_by,
                repo_token.repo_id, link.path, link.pk)
