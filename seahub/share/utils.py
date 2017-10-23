from seahub.group.utils import is_group_member
from seahub.constants import PERMISSION_ADMIN, PERMISSION_READ_WRITE
from seahub.share.models import ExtraSharePermission, ExtraGroupsSharePermission
from seahub.share.signals import share_repo_to_user_successful, share_repo_to_group_successful

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

    if org_id:
        if path == '/':
            seaserv.seafserv_threaded_rpc.org_add_share(org_id, repo.repo_id, 
                                                        owner, share_to, 
                                                        permission)
        else:
            sub_repo_id = seafile_api.org_share_subdir_to_user(org_id, repo.repo_id, 
                                                               path, owner, 
                                                               share_to, permission)
    else:
        if path == '/':
            seafile_api.share_repo(repo.repo_id, owner, share_to, permission)
        else:
            sub_repo_id = seafile_api.share_subdir_to_user(repo.repo_id, path, 
                                                           owner, share_to, 
                                                           permission)
    if path == '/' and extra_share_permission == PERMISSION_ADMIN:
        ExtraSharePermission.objects.create_share_permission(repo.repo_id, share_to, extra_share_permission)

    # send a signal when sharing repo successful
    if path == '/':
        share_repo_to_user_successful.send(sender=None, from_user=share_from,
                                           to_user=share_to, repo=repo)
    else:
        sub_repo = seafile_api.get_repo(sub_repo_id)
        share_repo_to_user_successful.send(sender=None, from_user=share_from,
                                           to_user=share_to, repo=sub_repo)

def share_dir_to_group(repo, path, owner, share_from, gid, permission, org_id=None):
    # Share  repo or subdir to group with permission(r, rw, admin).
    extra_share_permission = ''
    if permission == PERMISSION_ADMIN:
        extra_share_permission = permission
        permission = PERMISSION_READ_WRITE

    if org_id:
        if path == '/':
            seafile_api.add_org_group_repo(repo.repo_id, org_id, gid, 
                                           owner, permission)
        else:
            sub_repo_id = seafile_api.org_share_subdir_to_group(org_id, repo.repo_id,
                                                                path, owner, 
                                                                gid, permission)
    else:
        if path == '/':
            seafile_api.set_group_repo(repo.repo_id, gid, owner, 
                                       permission)
        else:
            sub_repo_id = seafile_api.share_subdir_to_group(repo.repo_id, path,
                                                            owner, gid,
                                                            permission)

    # add share permission if between is admin and is extra permission.
    if path == '/' and extra_share_permission == PERMISSION_ADMIN:
        ExtraGroupsSharePermission.objects.create_share_permission(repo.repo_id, gid, extra_share_permission)

    if path == '/':
        share_repo_to_group_successful.send(sender=None,
            from_user=share_from, group_id=gid, repo=repo)
    else:
        sub_repo = seafile_api.get_repo(sub_repo_id)
        share_repo_to_group_successful.send(sender=None,
            from_user=share_from, group_id=gid, repo=sub_repo)

def update_user_dir_permission(repo_id, path, owner, share_to, permission, org_id=None):
    # Update the user's permission(r, rw, admin) in the repo or subdir.
    extra_share_permission = ''
    if permission == PERMISSION_ADMIN:
        extra_share_permission = permission
        permission = PERMISSION_READ_WRITE

    if org_id:
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

    if org_id:
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

def check_user_permission_by_path(repo_id, shared_from, share_to, path, is_org):
    # Returns the user's permission in the repo or subdir.
    permission = seafile_api.check_permission_by_path(repo_id, path, share_to)
    if not permission:
        permission = seafile_api.get_shared_folder_perm(repo_id, shared_from, share_to, path, is_org)
        if not permission:
            return None

    if path != '/':
        return permission
    extra_permission = ExtraSharePermission.objects.get_user_permission(repo_id, share_to)
    return extra_permission if extra_permission else permission

def check_group_permission_by_path(repo_id, shared_from, group_id, path, org_id=None):
    # Returns the group's permission in the repo or subdir.
    is_org = org_id
    repo = seafile_api.get_repo_by_group(group_id, repo_id, is_org)


    if not repo:
        permission = seafile_api.get_group_shared_folder_perm(repo_id, shared_from, path, group_id, is_org)
        if not permission:
            return None
    else:
        permission = repo.permission

    extra_permission = ExtraGroupsSharePermission.objects.get_group_permission(repo_id, group_id)
    return extra_permission if extra_permission else permission
