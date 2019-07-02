from seahub.dtable.models import ShareDTable


def check_share_dtable_permission(dtable, to_user):
    share_dtable_obj = ShareDTable.objects.get_by_dtable_and_to_user(dtable, to_user)
    if share_dtable_obj:
        return share_dtable_obj.permission

    return None
