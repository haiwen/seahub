from seahub.dtable.models import DTableShare
from seahub.group.utils import is_group_member
from seahub.constants import PERMISSION_READ_WRITE

from seaserv import ccnet_api


def check_dtable_permission(username, workspace, dtable=None):
    """Check workspace/dtable access permission of a user.
    """
    owner = workspace.owner

    if dtable:
        dtable_share = DTableShare.objects.get_by_dtable_and_to_user(dtable, username)
        if dtable_share:
            return dtable_share.permission

    if '@seafile_group' in owner:
        group_id = int(owner.split('@')[0])
        if is_group_member(group_id, username):
            return PERMISSION_READ_WRITE
        else:
            return None
    else:
        if username == owner:
            return PERMISSION_READ_WRITE
        else:
            return None


def list_dtable_related_users(workspace, dtable):
    """ Return all users who can view this dtable.

    1. owner
    2. shared users
    3. groups users
    """

    user_list = list()
    owner = workspace.owner

    # 1. shared users
    shared_queryset = DTableShare.objects.list_by_dtable(dtable)
    user_list.extend([dtable_share.to_user for dtable_share in shared_queryset])

    if '@seafile_group' not in owner:
        # 2. owner
        if owner not in user_list:
            user_list.append(owner)
    else:
        # 3. groups users
        group_id = int(owner.split('@')[0])
        members = ccnet_api.get_group_members(group_id)
        for member in members:
            if member.user_name not in user_list:
                user_list.append(member.user_name)

    return user_list
