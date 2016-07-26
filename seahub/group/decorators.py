# Copyright (c) 2012-2016 Seafile Ltd.
from django.http import Http404

from seaserv import check_group_staff

def group_staff_required(func):
    """
    Decorator for views that checks the user is group staff.

    """
    def _decorated(request, *args, **kwargs):
        try:
            group_id = int(kwargs.get('group_id', None))
        except TypeError:
            raise TypeError("No group_id in url arguments")
        
        if check_group_staff(group_id, request.user.username):
            return func(request, *args, **kwargs)
        raise Http404
    return _decorated
    
