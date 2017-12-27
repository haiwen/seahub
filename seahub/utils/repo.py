# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
import logging

import seaserv
from seaserv import seafile_api

from seahub.utils import EMPTY_SHA1, is_org_context

logger = logging.getLogger(__name__)

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
        return seafile_api.get_org_repo_owner(repo_id)
    else:
        return seafile_api.get_repo_owner(repo_id)

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
    """ Return all storages info.

    1. If not enable user role feature OR
       haven't configured `storage_ids` option in user role setting:

       Return storage info getted from seafile_api.
       And always put the default storage as the first item in the returned list.

    2. If have configured `storage_ids` option in user role setting:

       Only return storage info in `storage_ids`.
       Filter out the wrong stotage id(s).
       Not change the order of the `storage_ids` list.
    """

    all_storages = []
    for storage in seafile_api.get_all_storage_classes():
        storage_info = {
            'storage_id': storage.storage_id,
            'storage_name': storage.storage_name,
            'is_default': storage.is_default,
        }
        if storage.is_default:
            all_storages.insert(0, storage_info)
        else:
            all_storages.append(storage_info)

    user_role_storage_ids = request.user.permissions.storage_ids()
    if not user_role_storage_ids:
        return all_storages

    user_role_storages = []
    for user_role_storage_id in user_role_storage_ids:
        for storage in all_storages:
            if storage['storage_id'] == user_role_storage_id:
                user_role_storages.append(storage)
                continue

    return user_role_storages

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
