# Copyright (c) 2012-2016 Seafile Ltd.
from django.contrib.auth import logout

from .handlers import get_password_hash, PASSWORD_HASH_KEY


class CheckPasswordHash:
    """Logout user if value of hash key in session is not equal to current password hash"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        return response

    def process_view(self, request, *args, **kwargs):
        if getattr(request.user, 'is_authenticated') and request.user.is_authenticated:
            if request.user.enc_password == '!':
                # Disable for LDAP/Shibboleth/SAML/... users.
                return None

            if request.session.get(PASSWORD_HASH_KEY) != get_password_hash(request.user):
                logout(request)
