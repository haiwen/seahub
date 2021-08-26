# Copyright (c) 2012-2016 Seafile Ltd.
from django.http import Http404

def org_staff_required(func):
    """
    Decorator for views check whether user is a org staff.
    """
    def _decorated(request, *args, **kwargs):
        org = request.user.org
        if org and org.is_staff:
            return func(request, *args, **kwargs)
        raise Http404
    return _decorated

def org_user_required(func):
    """
    Decorator for views check whether user is a org user.
    """
    def _decorated(request, *args, **kwargs):
        if request.user.org is not None:
            return func(request, *args, **kwargs)
        raise Http404
    return _decorated

