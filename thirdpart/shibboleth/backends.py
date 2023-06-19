from django.conf import settings

from seaserv import ccnet_api
from seahub.auth.backends import RemoteUserBackend
from seahub.base.accounts import User
from registration.models import (
    notify_admins_on_activate_request, notify_admins_on_register_complete)


class ShibbolethRemoteUserBackend(RemoteUserBackend):
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
    create_unknown_user = True
    # Create active user by default.
    activate_after_creation = getattr(settings, 'SHIB_ACTIVATE_AFTER_CREATION', True)

    def get_user(self, username):
        try:
            user = User.objects.get(email=username)
        except User.DoesNotExist:
            user = None
        return user

    def authenticate(self, remote_user, shib_meta):
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

        local_ccnet_users = ccnet_api.search_emailusers('DB', username, -1, -1)
        if not local_ccnet_users:
            local_ccnet_users = ccnet_api.search_emailusers('LDAP', username, -1, -1)

        if username.lower() not in [item.email for item in local_ccnet_users]:
            local_ccnet_users = []

        if not local_ccnet_users:
            if self.create_unknown_user:
                user = User.objects.create_shib_user(
                    email=username, is_active=self.activate_after_creation)
                if user and self.activate_after_creation is False:
                    notify_admins_on_activate_request(user.email)
                    # Do not send follwing registration finished email (if any)
                    # which will cause confusion.
                    return user
                if user and settings.NOTIFY_ADMIN_AFTER_REGISTRATION is True:
                    notify_admins_on_register_complete(user.email)
            else:
                user = None
        else:
            user = User.objects.get(email=username)

        return user
