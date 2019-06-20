from seahub.constants import PERMISSION_ADMIN, PERMISSION_PREVIEW, PERMISSION_PREVIEW_EDIT, \
    PERMISSION_READ, PERMISSION_READ_WRITE
from seahub.dtable.models import UserShareWorkspace, GroupShareWorkspace


def check_workspace_permission(workspace, email):
    if workspace.owner == email:
        return PERMISSION_READ_WRITE

    user_share_workspace = UserShareWorkspace.objects.get_by_workspace_id_and_to_user(workspace.id, email)
    if user_share_workspace:
        return user_share_workspace.permission

    return None
