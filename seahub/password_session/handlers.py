# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf import settings
from django.dispatch import receiver
from hashlib import md5

from seahub.auth.signals import user_logged_in

PASSWORD_HASH_KEY = getattr(settings, 'PASSWORD_SESSION_PASSWORD_HASH_KEY', 'password_session_password_hash_key')


def get_password_hash(user):
    """Returns a string of crypted password hash"""
    password = user.enc_password or ''
    return md5(
        md5(password.encode()).hexdigest().encode() + settings.SECRET_KEY.encode()
    ).hexdigest()


def update_session_auth_hash(request, user):
    """
    Updates a session hash to prevent logging out `user` from a current session.

    If `request.user` is defined through ``AuthenticationMiddleware``
    then make sure that `user` the same as `request.user`.
    """
    if not hasattr(request, 'user') or request.user == user:
        request.session[PASSWORD_HASH_KEY] = get_password_hash(user)


@receiver(user_logged_in)
def on_login(sender, user, request, **kwargs):
    """Saves password hash in session"""
    update_session_auth_hash(request, user)
