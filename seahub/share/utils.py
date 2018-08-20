from seahub.group.utils import is_group_member
from seahub.constants import PERMISSION_ADMIN, PERMISSION_READ_WRITE
from seahub.share.models import ExtraSharePermission, ExtraGroupsSharePermission
from seahub.utils import is_valid_org_id

import seaserv
from seaserv import seafile_api

def is_repo_admin(username, repo_id):
    is_administrator = ExtraSharePermission.objects.\
            get_user_permission(repo_id, username) == PERMISSION_ADMIN
    belong_to_admin_group = False
    group_ids = ExtraGroupsSharePermission.objects.get_admin_groups_by_repo(repo_id)
    for group_id in group_ids:
        if is_group_member(group_id, username):
            belong_to_admin_group = True
            break

    return is_administrator or belong_to_admin_group

def share_dir_to_user(repo, path, owner, share_from, share_to, permission, org_id=None):
    # Share  repo or subdir to user with permission(r, rw, admin).
    extra_share_permission = ''
    if permission == PERMISSION_ADMIN:
        extra_share_permission = permission
        permission = PERMISSION_READ_WRITE

    if is_valid_org_id(org_id):
        if path == '/':
            seaserv.seafserv_threaded_rpc.org_add_share(org_id, repo.repo_id, 
                                                        owner, share_to, 
                                                        permission)
        else:
            seafile_api.org_share_subdir_to_user(org_id, repo.repo_id, 
                                                               path, owner, 
                                                               share_to, permission)
    else:
        if path == '/':
            seafile_api.share_repo(repo.repo_id, owner, share_to, permission)
        else:
            seafile_api.share_subdir_to_user(repo.repo_id, path, 
                                                           owner, share_to, 
                                                           permission)
    if path == '/' and extra_share_permission == PERMISSION_ADMIN:
        ExtraSharePermission.objects.create_share_permission(repo.repo_id, share_to, extra_share_permission)

def share_dir_to_group(repo, path, owner, share_from, gid, permission, org_id=None):
    # Share  repo or subdir to group with permission(r, rw, admin).
    extra_share_permission = ''
    if permission == PERMISSION_ADMIN:
        extra_share_permission = permission
        permission = PERMISSION_READ_WRITE

    if is_valid_org_id(org_id):
        if path == '/':
            seafile_api.add_org_group_repo(repo.repo_id, org_id, gid, 
                                           owner, permission)
        else:
            seafile_api.org_share_subdir_to_group(org_id, repo.repo_id,
                                                                path, owner, 
                                                                gid, permission)
    else:
        if path == '/':
            seafile_api.set_group_repo(repo.repo_id, gid, owner, 
                                       permission)
        else:
            seafile_api.share_subdir_to_group(repo.repo_id, path,
                                                            owner, gid,
                                                            permission)

    # add share permission if between is admin and is extra permission.
    if path == '/' and extra_share_permission == PERMISSION_ADMIN:
        ExtraGroupsSharePermission.objects.create_share_permission(repo.repo_id, gid, extra_share_permission)

def update_user_dir_permission(repo_id, path, owner, share_to, permission, org_id=None):
    # Update the user's permission(r, rw, admin) in the repo or subdir.
    extra_share_permission = ''
    if permission == PERMISSION_ADMIN:
        extra_share_permission = permission
        permission = PERMISSION_READ_WRITE

    if is_valid_org_id(org_id):
        if path == '/':
            seafile_api.org_set_share_permission(
                org_id, repo_id, owner, share_to, permission)
        else:
            seafile_api.org_update_share_subdir_perm_for_user(
                org_id, repo_id, path, owner, share_to, permission)
    else:
        if path == '/':
            seafile_api.set_share_permission(
                    repo_id, owner, share_to, permission)
        else:
            seafile_api.update_share_subdir_perm_for_user(
                    repo_id, path, owner, share_to, permission)

    if path == '/':
        ExtraSharePermission.objects.update_share_permission(repo_id, 
                                                             share_to, 
                                                             extra_share_permission)

def update_group_dir_permission(repo_id, path, owner, gid, permission, org_id=None):
    # Update the group's permission(r, rw, admin) in the repo or subdir.
    extra_share_permission = ''
    if permission == PERMISSION_ADMIN:
        extra_share_permission = permission
        permission = PERMISSION_READ_WRITE

    if is_valid_org_id(org_id):
        if path == '/':
            seaserv.seafserv_threaded_rpc.set_org_group_repo_permission(
                    org_id, gid, repo_id, permission)
        else:
            seafile_api.org_update_share_subdir_perm_for_group(
                    org_id, repo_id, path, owner, gid, permission)
    else:
        if path == '/':
            seafile_api.set_group_repo_permission(gid, repo_id, permission)
        else:
            seafile_api.update_share_subdir_perm_for_group(
                    repo_id, path, owner, gid, permission)

    # update extra share permission if updated is repo
    if path == '/':
        ExtraGroupsSharePermission.objects.update_share_permission(repo_id, 
                                                                   gid, 
                                                                   extra_share_permission)

def check_user_share_out_permission(repo_id, path, share_to, is_org=False):
    # Return the permission you share to others.
    path = None if path == '/' else path
    repo = seafile_api.get_shared_repo_by_path(repo_id, path, share_to, is_org)
    if not repo:
        return None

    permission = repo.permission
    if path is None:
        extra_permission = ExtraSharePermission.objects.get_user_permission(repo_id, share_to)
        permission = extra_permission if extra_permission else repo.permission

    return permission

def check_user_share_in_permission(repo_id, share_to, is_org=False):
    # Return the permission to share to you.
    repo = seafile_api.get_shared_repo_by_path(repo_id, None, share_to, is_org)
    if not repo:
        return None

    extra_permission = ExtraSharePermission.objects.get_user_permission(repo_id, share_to)
    return extra_permission if extra_permission else repo.permission

def check_group_share_out_permission(repo_id, path, group_id, is_org=False):
    # Return the permission that share to other's group.
    path = None if path == '/' else path
    repo = seafile_api.get_group_shared_repo_by_path(repo_id, path, group_id, is_org)

    if not repo:
        return None

    permission = repo.permission
    if path is None:
        extra_permission = ExtraGroupsSharePermission.objects.get_group_permission(repo_id, group_id)
        permission = extra_permission if extra_permission else repo.permission

    return permission

def check_group_share_in_permission(repo_id, group_id, is_org=False):
    # Returns the permission to share the group you joined.
    repo = seafile_api.get_group_shared_repo_by_path(repo_id, None, group_id, is_org)

    if not repo:
        return None

    extra_permission = ExtraGroupsSharePermission.objects.get_group_permission(repo_id, group_id)
    return extra_permission if extra_permission else repo.permission

def has_shared_to_user(repo_id, path, username, org_id=None):
    if is_valid_org_id(org_id):
        # when calling seafile API to share authority related functions, change the uesrname to repo owner.
        repo_owner = seafile_api.get_org_repo_owner(repo_id)
        if path == '/':
            share_items = seafile_api.list_org_repo_shared_to(org_id,
                                                              repo_owner,
                                                              repo_id)
        else:
            share_items = seafile_api.get_org_shared_users_for_subdir(org_id,
                                                                      repo_id,
                                                                      path,
                                                                      repo_owner)
    else:
        repo_owner = seafile_api.get_repo_owner(repo_id)
        if path == '/':
            share_items = seafile_api.list_repo_shared_to(repo_owner, repo_id)
        else:
            share_items = seafile_api.get_shared_users_for_subdir(repo_id,
                                                                  path, repo_owner)
    return username in [item.user for item in share_items]

def has_shared_to_group(repo_id, path, gid, org_id=None):
    if is_valid_org_id(org_id):
        # when calling seafile API to share authority related functions, change the uesrname to repo owner.
        repo_owner = seafile_api.get_org_repo_owner(repo_id)
        if path == '/':
            share_items = seafile_api.list_org_repo_shared_group(org_id,
                    repo_owner, repo_id)
        else:
            share_items = seafile_api.get_org_shared_groups_for_subdir(org_id,
                    repo_id, path, repo_owner)
    else:
        repo_owner = seafile_api.get_repo_owner(repo_id)
        if path == '/':
            share_items = seafile_api.list_repo_shared_group_by_user(repo_owner, repo_id)
        else:
            share_items = seafile_api.get_shared_groups_for_subdir(repo_id,
                                                                   path, repo_owner)

    return gid in [item.group_id for item in share_items]
