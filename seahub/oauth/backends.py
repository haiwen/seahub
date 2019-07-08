from django.conf import settings

from seahub.auth.backends import RemoteUserBackend
from seahub.base.accounts import User
from registration.models import (notify_admins_on_activate_request,
                                 notify_admins_on_register_complete)
from seahub.work_weixin.settings import ENABLE_WORK_WEIXIN

class OauthRemoteUserBackend(RemoteUserBackend):
    """
    This backend is to be used in conjunction with the ``RemoteUserMiddleware``
    found in the middleware module of this package, and is used when the server
    is handling authentication outside of Django.

    By default, the ``authenticate`` method creates ``User`` objects for
    usernames that don't already exist in the database.  Subclasses can disable
    this behavior by setting the ``create_unknown_user`` attribute to
    ``False``.
    """

    # Create a User object if not already in the database?
    create_unknown_user = getattr(settings, 'OAUTH_CREATE_UNKNOWN_USER', True)
    # Create active user by default.
    activate_after_creation = getattr(settings, 'OAUTH_ACTIVATE_USER_AFTER_CREATION', True)

    if ENABLE_WORK_WEIXIN:
        create_unknown_user = getattr(settings, 'WORK_WEIXIN_OAUTH_CREATE_UNKNOWN_USER', True)
        activate_after_creation = getattr(settings, 'WORK_WEIXIN_OAUTH_ACTIVATE_USER_AFTER_CREATION', True)

    def get_user(self, username):
        try:
            user = User.objects.get(email=username)
        except User.DoesNotExist:
            user = None
        return user

    def authenticate(self, remote_user):
        """
        The username passed as ``remote_user`` is considered trusted.  This
        method simply returns the ``User`` object with the given username,
        creating a new ``User`` object if ``create_unknown_user`` is ``True``.

        Returns None if ``create_unknown_user`` is ``False`` and a ``User``
        object with the given username is not found in the database.
        """
        if not remote_user:
            return

        username = self.clean_username(remote_user)
        try:
            user = User.objects.get(email=username)
        except User.DoesNotExist:
            if self.create_unknown_user:
                user = User.objects.create_user(
                    email=username, is_active=self.activate_after_creation)
                if not self.activate_after_creation:
                    notify_admins_on_activate_request(username)
                elif settings.NOTIFY_ADMIN_AFTER_REGISTRATION:
                    notify_admins_on_register_complete(username)
            else:
                user = None

        return user
