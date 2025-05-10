import logging

from django.conf import settings

from seahub.auth.backends import RemoteUserBackend
from seahub.auth.models import SocialAuthUser
from seahub.base.accounts import User
from registration.models import (
    notify_admins_on_activate_request, notify_admins_on_register_complete)


logger = logging.getLogger(__name__)

SHIBBOLETH_PROVIDER_IDENTIFIER = getattr(settings, 'SHIBBOLETH_PROVIDER_IDENTIFIER', 'shibboleth')
LDAP_PROVIDER = getattr(settings, 'LDAP_PROVIDER', 'ldap')
SSO_LDAP_USE_SAME_UID = getattr(settings, 'SSO_LDAP_USE_SAME_UID', False)


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

    def authenticate(self, remote_user, shib_meta, second_uid=''):
        """
        The username passed as ``remote_user`` is considered trusted.  This
        method simply returns the ``User`` object with the given username,
        creating a new ``User`` object if ``create_unknown_user`` is ``True``.

        Returns None if ``create_unknown_user`` is ``False`` and a ``User``
        object with the given username is not found in the database.
        """
        if not remote_user:
            return

        remote_user = self.clean_username(remote_user)
        shib_user = SocialAuthUser.objects.get_by_provider_and_uid(SHIBBOLETH_PROVIDER_IDENTIFIER, remote_user)
        if not shib_user and SSO_LDAP_USE_SAME_UID:
            shib_user = SocialAuthUser.objects.get_by_provider_and_uid(LDAP_PROVIDER, remote_user)
            if shib_user:
                SocialAuthUser.objects.add(shib_user.username, SHIBBOLETH_PROVIDER_IDENTIFIER, remote_user)

        if shib_user:
            try:
                user = User.objects.get(email=shib_user.username)
            except User.DoesNotExist:
                user = None
            if not user:
                # Means found user in social_auth_usersocialauth but not found user in EmailUser,
                # delete it and recreate one.
                logger.warning('The DB data is invalid, delete it and recreate one.')
                SocialAuthUser.objects.filter(provider=SHIBBOLETH_PROVIDER_IDENTIFIER, uid=remote_user).delete()
        else:
            # compatible with old users via SHIB_USER_HEADER
            try:
                user = User.objects.get_old_user(remote_user, SHIBBOLETH_PROVIDER_IDENTIFIER, remote_user)
            except User.DoesNotExist:
                user = None

        if user and second_uid:
            SocialAuthUser.objects.add_if_not_exists(user.username,
                                                     SHIBBOLETH_PROVIDER_IDENTIFIER,
                                                     second_uid)

        if not user and self.create_unknown_user:
            try:
                user = User.objects.create_shib_user(is_active=self.activate_after_creation)
                SocialAuthUser.objects.add_if_not_exists(user.username,
                                                         SHIBBOLETH_PROVIDER_IDENTIFIER,
                                                         remote_user)
                if second_uid:
                    SocialAuthUser.objects.add_if_not_exists(user.username,
                                                             SHIBBOLETH_PROVIDER_IDENTIFIER,
                                                             second_uid)
            except Exception as e:
                logger.error('create shib user failed: %s' % e)
                return None

            if user and self.activate_after_creation is False:
                notify_admins_on_activate_request(user.email)
                # Do not send follwing registration finished email (if any)
                # which will cause confusion.
                return user
            if user and settings.NOTIFY_ADMIN_AFTER_REGISTRATION is True:
                notify_admins_on_register_complete(user.email)

        return user
