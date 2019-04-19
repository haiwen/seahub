import logging
from fnmatch import fnmatch
from collections import OrderedDict

from django.conf import settings

from seaserv import seafile_api

from seahub.base.accounts import User, AuthBackend
from seahub.profile.models import Profile
from seahub.utils.file_size import get_quota_from_string
from registration.models import notify_admins_on_activate_request, \
        notify_admins_on_register_complete

logger = logging.getLogger(__name__)


# No longer maintained
# Only used for old code of shibboleth authenticate
class RemoteUserBackend(object):
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

    def authenticate(self, request, remote_user):
        raise NotImplementedError('authenticate() must be overridden')

    def get_user(self, user_id):
        raise NotImplementedError('get_user() must be overridden')

    def clean_username(self, username):
        """
        Performs any cleaning on the "username" prior to using it to get or
        create the user object.  Returns the cleaned username.

        By default, returns the username unchanged.
        """
        return username

    def configure_user(self, user):
        """
        Configures a user after creation and returns the updated user.

        By default, returns the user unmodified.
        """
        return user

    def user_can_authenticate(self, user):
        """
        Reject users with is_active=False. Custom user models that don't have
        that attribute are allowed.
        """
        is_active = getattr(user, 'is_active', None)
        return is_active or is_active is None


class SeafileRemoteUserBackend(AuthBackend):
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
    create_unknown_user = getattr(settings, 'REMOTE_USER_CREATE_UNKNOWN_USER',
                                  True)

    # Create active user by default.
    auto_activate = getattr(settings,
                            'REMOTE_USER_ACTIVATE_USER_AFTER_CREATION', True)

    # map user attribute in HTTP header and Seahub user attribute
    # REMOTE_USER_ATTRIBUTE_MAP = {
    #     'HTTP_DISPLAYNAME': 'name',
    #     'HTTP_MAIL': 'contact_email',
    # }
    remote_user_attribute_map = getattr(settings, 'REMOTE_USER_ATTRIBUTE_MAP',
                                        {})

    def authenticate(self, request=None, remote_user=None):
        """
        The username passed as ``remote_user`` is considered trusted.  This
        method simply returns the ``User`` object with the given username,
        creating a new ``User`` object if ``create_unknown_user`` is ``True``.

        Returns None if ``create_unknown_user`` is ``False`` and a ``User``
        object with the given username is not found in the database.
        """
        if not remote_user or not request:
            return None

        username = self.clean_username(remote_user)

        # get user from ccnet
        user = self.get_user(username)
        if not user:
            # when user doesn't exist
            if not self.create_unknown_user:
                logger.error('User %s not found.' % username)
                return None

            try:
                user = User.objects.create_user(email=username,
                                                is_active=self.auto_activate)

                if not self.auto_activate:
                    notify_admins_on_activate_request(username)
                elif settings.NOTIFY_ADMIN_AFTER_REGISTRATION:
                    notify_admins_on_register_complete(username)

            except Exception as e:
                logger.error(e)
                return None

        if self.user_can_authenticate(user):
            # update user info after authenticated
            try:
                self.configure_user(request, user)
            except Exception as e:
                logger.error(e)
                return None

            return user
        else:
            logger.error('User %s is not active' % username)
            return None

    def clean_username(self, username):
        """
        Performs any cleaning on the "username" prior to using it to get or
        create the user object.  Returns the cleaned username.

        By default, returns the username unchanged.
        """
        return username.strip()

    def user_can_authenticate(self, user):
        """
        Reject users with is_active=False. Custom user models that don't have
        that attribute are allowed.
        """
        is_active = getattr(user, 'is_active', None)
        return is_active or is_active is None

    def configure_user(self, request, user):
        """
        Configures a user after creation and returns the updated user.

        By default, returns the user unmodified.
        """

        user_info = self.parse_user_info(request, user)

        self.update_user_profile(user_info)
        self.update_user_role(user_info)

    def parse_user_info(self, request, user):
        """ Pull the mapped user info from the http headers.
        """
        user_info = {}

        for header, user_info_key in self.remote_user_attribute_map.items():
            value = request.META.get(header, None)
            if value:
                user_info[user_info_key] = value

        user_info['email'] = user.username
        user_info['role_quota'] = user.permissions.role_quota()
        return user_info

    def update_user_profile(self, user_info):

        email = user_info.get('email', '')
        if not email:
            return

        name = user_info.get('name', '')
        institution = user_info.get('institution', '')
        contact_email = user_info.get('contact_email', '')

        profile = Profile.objects.get_profile_by_user(email)
        if not profile:
            profile = Profile(user=email)

        if name.strip():
            profile.nickname = name
        if institution:
            profile.institution = institution
        if contact_email:
            profile.contact_email = contact_email

        profile.save()

    # TODO, need test
    def update_user_role(self, user_info):
        """ Specific for Shibboleth
        """

        affiliation = user_info.get('affiliation', '')
        if not affiliation:
            return

        for e in affiliation.split(';'):
            role = self._get_role_by_affiliation(e)
            if not role:
                continue

            # update user role
            User.objects.update_role(user_info['email'], role)

            # update user role quota
            role_quota = user_info.get('role_quota', '')
            if role_quota:
                quota = get_quota_from_string(role_quota)
                seafile_api.set_role_quota(role, quota)

    def _get_role_by_affiliation(self, affiliation):
        """ Specific for Shibboleth
        """

        try:
            role_map = settings.SHIBBOLETH_AFFILIATION_ROLE_MAP
        except AttributeError:
            return

        role = role_map.get(affiliation)
        if role:
            return role

        if role_map.get('patterns') is not None:
            joker_map = role_map.get('patterns')
            try:
                od = OrderedDict(joker_map)
            except Exception as e:
                logger.error(e)
                return

            for k in od:
                if fnmatch(affiliation, k):
                    return od[k]

        return None
