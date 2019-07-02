from seahub.dtable.models import DTableShare


def check_dtable_share_permission(dtable, to_user):
    share_dtable_obj = DTableShare.objects.get_by_dtable_and_to_user(dtable, to_user)
    if share_dtable_obj:
        return share_dtable_obj.permission

    return None
