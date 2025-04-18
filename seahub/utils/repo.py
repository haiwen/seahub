# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
import stat
import logging
from collections import namedtuple

import seaserv
from seaserv import seafile_api, ccnet_api

from seahub.constants import (
    PERMISSION_PREVIEW, PERMISSION_PREVIEW_EDIT, PERMISSION_INVISIBLE,
    PERMISSION_READ, PERMISSION_READ_WRITE, PERMISSION_ADMIN,
    REPO_STATUS_NORMAL, REPO_STATUS_READ_ONLY, CUSTOM_PERMISSION_PREFIX
)
from seahub.utils import EMPTY_SHA1, is_org_context, is_pro_version
from seahub.api2.utils import to_python_boolean
from seahub.base.models import RepoSecretKey
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.share.models import CustomSharePermissions

from seahub.settings import ENABLE_STORAGE_CLASSES, STORAGE_CLASS_MAPPING_POLICY, CLOUD_MODE

logger = logging.getLogger(__name__)


def normalize_repo_status_code(status):
    if status == 0:
        return REPO_STATUS_NORMAL
    elif status == 1:
        return REPO_STATUS_READ_ONLY
    else:
        return ''


def normalize_repo_status_str(status):
    if status == 'normal':
        return 0
    elif status == 'read-only':
        return 1
    else:
        return ''


def get_available_repo_perms():
    perms = [PERMISSION_READ, PERMISSION_READ_WRITE, PERMISSION_ADMIN]
    if is_pro_version():
        perms += [PERMISSION_PREVIEW, PERMISSION_PREVIEW_EDIT, PERMISSION_INVISIBLE]

    return perms


def parse_repo_perm(perm):
    RP = namedtuple('RepoPerm', [
        'can_download', 'can_upload',  # download/upload files/folders
        'can_edit_on_web',             # edit files on web
        'can_delete',                  # delete files/folders
        'can_copy',                    # copy files/folders on web
        'can_preview',                 # preview files on web
        'can_generate_share_link',     # generate share link
    ])

    if perm not in get_available_repo_perms():
        try:
            if CUSTOM_PERMISSION_PREFIX in perm:
                perm = perm.split('-')[1]
            custom_perm_obj = CustomSharePermissions.objects.get(id=int(perm)).to_dict()
            RP.can_upload = to_python_boolean(str(custom_perm_obj['permission'].get('upload', False)))
            RP.can_download = to_python_boolean(str(custom_perm_obj['permission'].get('download', False)))
            RP.can_create = to_python_boolean(str(custom_perm_obj['permission'].get('create', False)))
            RP.can_edit_on_web = to_python_boolean(str(custom_perm_obj['permission'].get('modify', False)))
            RP.can_copy = to_python_boolean(str(custom_perm_obj['permission'].get('copy', False)))
            RP.can_delete = to_python_boolean(str(custom_perm_obj['permission'].get('delete', False)))
            RP.can_preview = to_python_boolean(str(custom_perm_obj['permission'].get('preview', False)))
            RP.can_generate_share_link = to_python_boolean(
                str(custom_perm_obj['permission'].get('download_external_link', False)))
            return RP
        except Exception as e:
            logger.warning(e)

    RP.can_upload = True if perm in [
        PERMISSION_READ_WRITE, PERMISSION_ADMIN, PERMISSION_PREVIEW_EDIT] else False
    RP.can_download = True if perm in [
        PERMISSION_READ, PERMISSION_READ_WRITE, PERMISSION_ADMIN] else False
    RP.can_create = True if perm in [
        PERMISSION_READ_WRITE, PERMISSION_ADMIN] else False
    RP.can_edit_on_web = True if perm in [
        PERMISSION_READ_WRITE, PERMISSION_ADMIN, PERMISSION_PREVIEW_EDIT
    ] else False
    RP.can_copy = True if perm in [
        PERMISSION_READ, PERMISSION_READ_WRITE, PERMISSION_ADMIN, PERMISSION_PREVIEW_EDIT
    ] else False
    RP.can_delete = True if perm in [
        PERMISSION_READ_WRITE, PERMISSION_ADMIN, PERMISSION_PREVIEW_EDIT
    ] else False
    RP.can_preview = True if perm in [
        PERMISSION_READ, PERMISSION_READ_WRITE, PERMISSION_ADMIN,
        PERMISSION_PREVIEW, PERMISSION_PREVIEW_EDIT
    ] else False
    RP.can_generate_share_link = True if perm in [
        PERMISSION_READ_WRITE, PERMISSION_READ, PERMISSION_ADMIN,
        PERMISSION_PREVIEW, PERMISSION_PREVIEW_EDIT
    ] else False
    return RP

def list_dir_by_path(cmmt, path):
    if cmmt.root_id == EMPTY_SHA1:
        return []
    else:
        dirs = seafile_api.list_dir_by_commit_and_path(cmmt.repo_id, cmmt.id, path)
        return dirs if dirs else []

def get_sub_repo_abbrev_origin_path(repo_name, origin_path):
    """Return abbrev path for sub repo based on `repo_name` and `origin_path`.

    Arguments:
    - `repo_id`:
    - `origin_path`:
    """
    if len(origin_path) > 20:
        abbrev_path = origin_path[-20:]
        return repo_name + '/...' + abbrev_path
    else:
        return repo_name + origin_path

def get_repo_owner(request, repo_id):
    if is_org_context(request):
        repo_owner = seafile_api.get_org_repo_owner(repo_id)
    else:
        # for admin panel
        # administrator may get org repo's owner
        repo_owner = seafile_api.get_repo_owner(repo_id)
        if not repo_owner:
            repo_owner = seafile_api.get_org_repo_owner(repo_id)

    return repo_owner

def is_repo_owner(request, repo_id, username):
    return username == get_repo_owner(request, repo_id)

def get_repo_shared_users(repo_id, repo_owner, include_groups=True):
    """Return a list contains users and group users. Repo owner is ommited.
    """
    ret = []
    users = seafile_api.list_repo_shared_to(repo_owner, repo_id)
    ret += [x.user for x in users]
    if include_groups:
        for e in seafile_api.list_repo_shared_group_by_user(repo_owner, repo_id):
            g_members = seaserv.get_group_members(e.group_id)
            ret += [x.user_name for x in g_members if x.user_name != repo_owner]

    return list(set(ret))

def get_library_storages(request):
    """ Return info of storages can be used.

    1. If not enable user role feature OR
       haven't configured `storage_ids` option in user role setting:

       Return storage info getted from seafile_api.
       And always put the default storage as the first item in the returned list.

    2. If have configured `storage_ids` option in user role setting:

       Only return storage info in `storage_ids`.
       Filter out the wrong stotage id(s).
       Not change the order of the `storage_ids` list.
    """

    if not is_pro_version():
        return []

    if not ENABLE_STORAGE_CLASSES:
        return []

    # get all storages info
    try:
        storage_classes = seafile_api.get_all_storage_classes()
    except Exception as e:
        logger.error(e)
        return []

    all_storages = []
    for storage in storage_classes:
        storage_info = {
            'storage_id': storage.storage_id,
            'storage_name': storage.storage_name,
            'is_default': storage.is_default,
        }
        if storage.is_default:
            all_storages.insert(0, storage_info)
        else:
            all_storages.append(storage_info)

    if STORAGE_CLASS_MAPPING_POLICY == 'USER_SELECT':

        return all_storages

    elif STORAGE_CLASS_MAPPING_POLICY == 'ROLE_BASED':
        user_role_storage_ids = request.user.permissions.storage_ids()
        if not user_role_storage_ids:
            return []

        user_role_storages = []
        for user_role_storage_id in user_role_storage_ids:
            for storage in all_storages:
                if storage['storage_id'] == user_role_storage_id:
                    user_role_storages.append(storage)
                    continue

        return user_role_storages

    else:
        # STORAGE_CLASS_MAPPING_POLICY == 'REPO_ID_MAPPING'
        return []

def get_locked_files_by_dir(request, repo_id, folder_path):
    """ Get locked files in a folder

    Returns:
        A dict contains locked file name and locker owner.

        locked_files = {
            'file_name': 'lock_owner';
            ...
        }
    """

    username = request.user.username

    # get lock files
    dir_id = seafile_api.get_dir_id_by_path(repo_id, folder_path)
    dirents = seafile_api.list_dir_with_perm(repo_id,
            folder_path, dir_id, username, -1, -1)

    locked_files = {}
    for dirent in dirents:
        if dirent.is_locked:
            locked_files[dirent.obj_name] = dirent.lock_owner

    return locked_files

def get_sub_folder_permission_by_dir(request, repo_id, parent_dir):
    """ Get sub folder permission in a folder

    Returns:
        A dict contains folder name and permission.

        folder_permission_dict = {
            'folder_name_1': 'r';
            'folder_name_2': 'rw';
            ...
        }
    """
    username = request.user.username
    dir_id = seafile_api.get_dir_id_by_path(repo_id, parent_dir)
    dirents = seafile_api.list_dir_with_perm(repo_id,
            parent_dir, dir_id, username, -1, -1)

    folder_permission_dict = {}
    for dirent in dirents:
        if stat.S_ISDIR(dirent.mode):
            folder_permission_dict[dirent.obj_name] = dirent.permission

    return folder_permission_dict

def get_shared_groups_by_repo(repo_id, org_id=None):
    if not org_id or org_id < 0:
        group_ids = seafile_api.get_shared_group_ids_by_repo(
                repo_id)
    else:
        group_ids = seafile_api.org_get_shared_group_ids_by_repo(org_id,
                repo_id)

    if not group_ids:
        return []

    groups = []
    for group_id in group_ids:
        group = ccnet_api.get_group(int(group_id))
        if group:
            groups.append(group)

    return groups

def get_related_users_by_repo(repo_id, org_id=None):
    """ Return all users who can view this library.

    1. repo owner
    2. users repo has been shared to
    3. members of groups repo has been shared to
    """

    users = []

    # 1. users repo has been shared to
    if org_id and org_id > 0:
        users.extend(seafile_api.org_get_shared_users_by_repo(org_id, repo_id))
        owner = seafile_api.get_org_repo_owner(repo_id)
    else:
        users.extend(seafile_api.get_shared_users_by_repo(repo_id))
        owner = seafile_api.get_repo_owner(repo_id)

    # 2. repo owner
    if owner not in users:
        users.append(owner)

    # 3. members of groups repo has been shared to
    groups = get_shared_groups_by_repo(repo_id, org_id)
    for group in groups:
        members = ccnet_api.get_group_members(group.id)
        for member in members:
            if member.user_name not in users:
                users.append(member.user_name)

    return users

# TODO
def is_valid_repo_id_format(repo_id):
    return len(repo_id) == 36

def can_set_folder_perm_by_user(username, repo, repo_owner):
    """ user can get/update/add/delete folder perm feature must comply with the following
            repo:repo is not virtual
            permission: is admin or repo owner.
    """
    if repo.is_virtual:
        return False
    is_admin = is_repo_admin(username, repo.id)
    if username != repo_owner and not is_admin:
        return False
    return True

def add_encrypted_repo_secret_key_to_database(repo_id, password):
    try:
        if not RepoSecretKey.objects.get_secret_key(repo_id):
            # get secret_key, then save it to database
            secret_key = seafile_api.get_secret_key(repo_id, password)
            RepoSecretKey.objects.add_secret_key(repo_id, secret_key)
    except Exception as e:
        logger.error(e)


def is_group_repo_staff(request, repo_id, username):
    is_staff = False

    repo_owner = get_repo_owner(request, repo_id)

    if '@seafile_group' in repo_owner:
        group_id = email2nickname(repo_owner)
        is_staff = seaserv.check_group_staff(group_id, username)

    return is_staff

def repo_has_been_shared_out(request, repo_id):

    has_been_shared_out = False
    username = request.user.username

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

        if seafile_api.org_repo_has_been_shared(repo_id, including_groups=True) or is_inner_org_pub_repo:
            has_been_shared_out = True
    else:
        if seafile_api.repo_has_been_shared(repo_id, including_groups=True) or \
                (not request.cloud_mode and seafile_api.is_inner_pub_repo(repo_id)):
            has_been_shared_out = True

    return has_been_shared_out



def delete_all_my_shares(username, org_id=None):
    shared_repos = []
    try:
        if org_id:
            shared_repos += seafile_api.get_org_share_out_repo_list(org_id, username, -1, -1)
            shared_repos += seafile_api.get_org_group_repos_by_owner(org_id, username)
            shared_repos += seafile_api.list_org_inner_pub_repos_by_owner(org_id, username)
        else:
            shared_repos += seafile_api.get_share_out_repo_list(username, -1, -1)
            shared_repos += seafile_api.get_group_repos_by_owner(username)
            if not CLOUD_MODE:
                shared_repos += seafile_api.list_inner_pub_repos_by_owner(username)
    except Exception as e:
        logger.error(e)
        return

    shared_repos_info = []
    for repo in shared_repos:
        repo_info = {
            'repo_id': repo.origin_repo_id if repo.is_virtual else repo.id,
            'repo_name': repo.repo_name,
            'is_virtual': repo.is_virtual,
            'share_type': repo.share_type,
            'user': repo.user,
            'group_id': repo.group_id,
            'origin_path': repo.origin_path,
        }
        shared_repos_info.append(repo_info)

    # remove all shared repos
    for repo in shared_repos_info:
        if org_id:
            if repo['is_virtual']:
                if repo['share_type'] == 'personal':
                    seafile_api.org_unshare_subdir_for_user(
                            org_id, repo['repo_id'], repo['origin_path'], username, repo['user'])
                    
                elif repo['share_type'] == 'group':
                    seafile_api.org_unshare_subdir_for_group(
                            org_id, repo['repo_id'], repo['origin_path'], username, repo['group_id'])
            else:
                if repo['share_type'] == 'personal':
                    seafile_api.org_remove_share(org_id, repo['repo_id'],
                                                 username, repo['user'])
                elif repo['share_type'] == 'group':
                    seafile_api.del_org_group_repo(repo['repo_id'], org_id, repo['group_id'])
                elif repo['share_type'] == 'public':
                    seafile_api.unset_org_inner_pub_repo(org_id, repo['repo_id'])
        else:
            if repo['is_virtual']:
                if repo['share_type'] == 'personal':
                    seafile_api.unshare_subdir_for_user(
                            repo['repo_id'], repo['origin_path'], username, repo['user'])
                elif repo['share_type'] == 'group':
                    seafile_api.unshare_subdir_for_group(
                            repo['repo_id'], repo['origin_path'], username, repo['group_id'])
            else:
                if repo['share_type'] == 'personal':
                    seafile_api.remove_share(repo['repo_id'], username, repo['user'])
                elif repo['share_type'] == 'group':
                    seafile_api.unset_group_repo(repo['repo_id'], repo['group_id'], username)
                elif repo['share_type'] == 'public':
                    seafile_api.remove_inner_pub_repo(repo['repo_id'])
    return

# TODO
from seahub.share.utils import is_repo_admin
