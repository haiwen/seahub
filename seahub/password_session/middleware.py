# Copyright (c) 2012-2016 Seafile Ltd.
from django.contrib.auth import logout

from .handlers import get_password_hash, PASSWORD_HASH_KEY


class CheckPasswordHash(object):
    """Logout user if value of hash key in session is not equal to current password hash"""
    def process_view(self, request, *args, **kwargs):
        if getattr(request.user, 'is_authenticated') and request.user.is_authenticated():
            if request.session.get(PASSWORD_HASH_KEY) != get_password_hash(request.user):
                logout(request)