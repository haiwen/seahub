# Copyright (c) 2012-2016 Seafile Ltd.
from django.http import Http404

from seahub.profile.models import Profile

def inst_admin_required(func):
    """
    Decorator for views check whether user is a institution admin.
    """
    def _decorated(request, *args, **kwargs):
        if request.user.is_authenticated and request.user.inst_admin is True:
            return func(request, *args, **kwargs)
        raise Http404
    return _decorated

def inst_admin_can_manage_user(func):
    """
    Decorator for views check whether inst admin has permission to manage that
    user.
    """
    def _decorated(request, *args, **kwargs):
        if request.user.inst_admin is True:
            email = kwargs['email']
            p = Profile.objects.get_profile_by_user(email)
            if p and p.institution == request.user.institution.name:
                return func(request, *args, **kwargs)
        raise Http404
    return _decorated
