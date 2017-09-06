from seahub.group.utils import is_group_member
from seahub.constants import PERMISSION_ADMIN
from seahub.share.models import ExtraSharePermission, ExtraGroupsSharePermission

def is_repo_admin(username, repo_id):
    is_administrator = ExtraSharePermission.objects.\
            get_user_permission(repo_id, username) == PERMISSION_ADMIN
    belong_to_admin_group = False
    group_ids = ExtraGroupsSharePermission.objects.get_admin_groups(repo_id)
    for group_id in group_ids:
        if is_group_member(group_id, username):
            belong_to_admin_group = True
            break

    return is_administrator or belong_to_admin_group
