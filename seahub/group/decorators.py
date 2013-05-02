from django.http import Http404

from seaserv import check_group_staff

def group_staff_required(func):
    """
    Decorator for views that checks the user is group staff.

    """
    def _decorated(request, *args, **kwargs):
        group_id = int(kwargs.get('group_id', '0')) # Checked by URL Conf

        if check_group_staff(group_id, request.user.username):
            return func(request, *args, **kwargs)
        raise Http404
    return _decorated
    
