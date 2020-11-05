# Copyright (c) 2012-2016 Seafile Ltd.
"""
Proxy RPC calls to seafile_api, silence RPC errors, emulating Ruby's
"method_missing".
"""

from functools import partial
import logging

from seaserv import seafile_api
from pysearpc import SearpcError
from seahub.utils import is_valid_org_id
from seahub.settings import ENCRYPTED_LIBRARY_VERSION

# Get an instance of a logger
logger = logging.getLogger(__name__)

class RPCProxy(object):
    def __init__(self, mute=False):
        self.mute = mute

    def __getattr__(self, name):
        return partial(self.method_missing, name)

    def method_missing(self, name, *args, **kwargs):
        real_func = getattr(seafile_api, name)
        if self.mute:
            try:
                return real_func(*args, **kwargs)
            except SearpcError as e:
                logger.warn(e, exc_info=True)
                return None
        else:
            return real_func(*args, **kwargs)


mute_seafile_api = RPCProxy(mute=True)


class RPCWrapper(object):
    """
    Wrapper for seafile api, abstract some confusing RPCs.

    1. Using `org_id` argument instead of separate org function.
    2. Using `repo_id` and `path` arguments instead of separate repo/subdir
    functions.
    """

    # -------------------- group owned repo --------------------
    def add_group_owned_repo(self, group_id, repo_name, password, permission,
                             storage_id=None, org_id=None):
        if is_valid_org_id(org_id):
            return seafile_api.org_add_group_owned_repo(
                org_id, group_id, repo_name, permission, password,
                ENCRYPTED_LIBRARY_VERSION)
        else:
            return seafile_api.add_group_owned_repo(
                group_id, repo_name, permission, password,
                enc_version=ENCRYPTED_LIBRARY_VERSION,
                storage_id=storage_id)

    def delete_group_owned_repo(self, group_id, repo_id, org_id=None):
        if is_valid_org_id(org_id):
            return seafile_api.org_delete_group_owned_repo(org_id, group_id, repo_id)
        else:
            return seafile_api.delete_group_owned_repo(group_id, repo_id)

    # -------------------- share to users --------------------
    def get_shared_users_by_repo_path(self, repo_id, repo_owner, path='/',
                                      org_id=None):
        """
        Get user list this repo/folder is shared to.
        Return: a list of SharedUser objects (lib/repo.vala)
        """
        if is_valid_org_id(org_id):
            if path == '/':
                return seafile_api.list_org_repo_shared_to(
                    org_id, repo_owner, repo_id)
            else:
                return seafile_api.get_org_shared_users_for_subdir(
                    org_id, repo_id, path, repo_owner)
        else:
            if path == '/':
                return seafile_api.list_repo_shared_to(repo_owner, repo_id)
            else:
                return seafile_api.get_shared_users_for_subdir(
                    repo_id, path, repo_owner)

    # TODO: add, update

    def delete_shared_user_by_repo_path(self, repo_id, repo_owner, to_user,
                                        path='/', org_id=None):
        """
        """
        if is_valid_org_id(org_id):
            if path == '/':
                return seafile_api.org_remove_share(org_id, repo_id, repo_owner, to_user)
            else:
                return seafile_api.org_unshare_subdir_for_user(
                    org_id, repo_id, path, repo_owner, to_user)
        else:
            if path == '/':
                return seafile_api.remove_share(repo_id, repo_owner, to_user)
            else:
                return seafile_api.unshare_subdir_for_user(
                    repo_id, path, repo_owner, to_user)

    # -------------------- share to groups --------------------
    def get_shared_groups_by_repo_path(self, repo_id, repo_owner, path='/',
                                       org_id=None):
        if is_valid_org_id(org_id):
            if path == '/':
                return seafile_api.list_org_repo_shared_group(
                    org_id, repo_owner, repo_id)
            else:
                return seafile_api.get_org_shared_groups_for_subdir(
                    org_id, repo_id, path, repo_owner)
        else:
            if path == '/':
                return seafile_api.list_repo_shared_group_by_user(
                    repo_owner, repo_id)
            else:
                return seafile_api.get_shared_groups_for_subdir(
                    repo_id, path, repo_owner)

    # TODO: add, update

    def delete_shared_group_by_repo_path(self, repo_id, repo_owner, group_id,
                                         path='/', org_id=None):
        if is_valid_org_id(org_id):
            if path == '/':
                seafile_api.del_org_group_repo(repo_id, org_id, group_id)
            else:
                seafile_api.org_unshare_subdir_for_group(
                    org_id, repo_id, path, repo_owner, group_id)
        else:
            if path == '/':
                seafile_api.unset_group_repo(repo_id, group_id,
                                             repo_owner)
            else:
                seafile_api.unshare_subdir_for_group(
                    repo_id, path, repo_owner, group_id)


SeafileAPI = RPCWrapper()
