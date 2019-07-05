from seahub.dtable.models import DTableShare
from seahub.group.utils import is_group_member
from seahub.constants import PERMISSION_READ_WRITE


def check_dtable_share_permission(dtable, to_user):
    share_dtable_obj = DTableShare.objects.get_by_dtable_and_to_user(dtable, to_user)
    if share_dtable_obj:
        return share_dtable_obj.permission

    return None


def check_dtable_permission(username, owner):
    """Check workspace/dtable access permission of a user.
    """
    if '@seafile_group' in owner:
        group_id = int(owner.split('@')[0])
        if not is_group_member(group_id, username):
            return None
        else:
            return PERMISSION_READ_WRITE

    else:
        if username != owner:
            return None
        else:
            return PERMISSION_READ_WRITE
