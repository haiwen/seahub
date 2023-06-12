from collections import OrderedDict
from fnmatch import fnmatch
import logging
import os
import sys

from django.conf import settings
from django.contrib.auth.middleware import RemoteUserMiddleware
from django.core.exceptions import ImproperlyConfigured
from django.urls import reverse
from django.http import HttpResponseRedirect
from seaserv import seafile_api, ccnet_api

from shibboleth.app_settings import SHIB_ATTRIBUTE_MAP, LOGOUT_SESSION_KEY, SHIB_USER_HEADER

from seahub import auth
from seahub.base.accounts import User
from seahub.base.sudo_mode import update_sudo_mode_ts
from seahub.profile.models import Profile
from seahub.utils.file_size import get_quota_from_string
from seahub.role_permissions.utils import get_enabled_role_permissions_by_role

# Get an instance of a logger
logger = logging.getLogger(__name__)

try:
    conf_dir = os.environ['SEAFILE_CENTRAL_CONF_DIR']
    sys.path.append(conf_dir)
    try:
        from seahub_custom_functions import custom_shibboleth_get_user_role
        CUSTOM_SHIBBOLETH_GET_USER_ROLE = True
    except ImportError:
        CUSTOM_SHIBBOLETH_GET_USER_ROLE = False
except KeyError:
    CUSTOM_SHIBBOLETH_GET_USER_ROLE = False


class ShibbolethRemoteUserMiddleware(RemoteUserMiddleware):
    """
    Authentication Middleware for use with Shibboleth.  Uses the recommended pattern
    for remote authentication from: http://code.djangoproject.com/svn/django/tags/releases/1.3/django/contrib/auth/middleware.py
    """
    def process_request(self, request):
        if request.path.rstrip('/') != settings.SITE_ROOT + 'sso':
            return

        # AuthenticationMiddleware is required so that request.user exists.
        if not hasattr(request, 'user'):
            raise ImproperlyConfigured(
                "The Django remote user auth middleware requires the"
                " authentication middleware to be installed.  Edit your"
                " MIDDLEWARE setting to insert"
                " 'django.contrib.auth.middleware.AuthenticationMiddleware'"
                " before the RemoteUserMiddleware class.")

        # To support logout.  If this variable is True, do not
        # authenticate user and return now.
        if request.session.get(LOGOUT_SESSION_KEY) is True:
            return
        else:
            # Delete the shib reauth session key if present.
            request.session.pop(LOGOUT_SESSION_KEY, None)

        # Locate the remote user header.
        # import pprint; pprint.pprint(request.META)
        try:
            username = request.META[SHIB_USER_HEADER]
        except KeyError:
            # If specified header doesn't exist then return (leaving
            # request.user set to AnonymousUser by the
            # AuthenticationMiddleware).
            return

        p_id = ccnet_api.get_primary_id(username)
        if p_id is not None:
            username = p_id

        # If the user is already authenticated and that user is the user we are
        # getting passed in the headers, then the correct user is already
        # persisted in the session and we don't need to continue.
        if request.user.is_authenticated:
            if request.user.username == username:
                if request.user.is_staff:
                    update_sudo_mode_ts(request)
                return

        # Make sure we have all required Shiboleth elements before proceeding.
        shib_meta, error = self.parse_attributes(request)
        # Add parsed attributes to the session.
        request.session['shib'] = shib_meta
        if error:
            raise ShibbolethValidationError("All required Shibboleth elements"
                                            " not found.  %s" % shib_meta)

        # We are seeing this user for the first time in this session, attempt
        # to authenticate the user.
        user = auth.authenticate(remote_user=username, shib_meta=shib_meta)
        if user:
            if not user.is_active:
                return HttpResponseRedirect(reverse('shib_complete'))

            # User is valid.  Set request.user and persist user in the session
            # by logging the user in.
            request.user = user
            auth.login(request, user)
            user.set_unusable_password()
            user.save()
            # call make profile.
            self.make_profile(user, shib_meta)

            if CUSTOM_SHIBBOLETH_GET_USER_ROLE:
                user_role = custom_shibboleth_get_user_role(shib_meta)
                if user_role:
                    ccnet_api.update_role_emailuser(user.email, user_role)
                else:
                    user_role = self.update_user_role(user, shib_meta)
            else:
                user_role = self.update_user_role(user, shib_meta)

            if user_role:
                self.update_user_quota(user, user_role)

            # setup session.
            self.setup_session(request)
            request.shib_login = True

    def process_response(self, request, response):
        if getattr(request, 'shib_login', False):
            print('%s: set shibboleth cookie!' % id(self))
            self._set_auth_cookie(request, response)
        return response

    def _set_auth_cookie(self, request, response):
        from seahub.api2.utils import get_token_v1, get_token_v2
        # generate tokenv2 using information in request params
        keys = (
            'platform',
            'device_id',
            'device_name',
            'client_version',
            'platform_version',
        )
        if all(['shib_' + key in request.GET for key in keys]):
            platform = request.GET['shib_platform']
            device_id = request.GET['shib_device_id']
            device_name = request.GET['shib_device_name']
            client_version = request.GET['shib_client_version']
            platform_version = request.GET['shib_platform_version']
            token = get_token_v2(
                request, request.user.username, platform, device_id,
                device_name, client_version, platform_version)
        elif all(['shib_' + key not in request.GET for key in keys]):
            token = get_token_v1(request.user.username)
        else:
            return
        response.set_cookie('seahub_auth', request.user.username + '@' + token.key)

    def make_profile(self, user, shib_meta):
        """
        Extrat nickname(givenname surname), contact_email, institution from
        Shib attributs, and add those to user profile.
        """
        # use `display_name` as nickname in shib_meta first
        nickname = shib_meta.get('display_name', None)
        if nickname is None:
            # otherwise, fallback to givenname plus surname in shib_meta
            givenname = shib_meta.get('givenname', '')
            surname = shib_meta.get('surname', '')
            nickname = "%s %s" % (givenname, surname)

        institution = shib_meta.get('institution', None)
        contact_email = shib_meta.get('contact_email', None)

        p = Profile.objects.get_profile_by_user(user.username)
        if not p:
            p = Profile(user=user.username)

        if nickname.strip():  # set nickname when it's not empty
            p.nickname = nickname.encode("iso-8859-1").decode('utf8')

        if institution:
            p.institution = institution

        if contact_email:
            p.contact_email = contact_email

        p.save()

    def _get_role_by_affiliation(self, affiliation):
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

    def update_user_role(self, user, shib_meta):
        affiliation = shib_meta.get('affiliation', '')
        if not affiliation:
            return

        for e in affiliation.split(';'):
            role = self._get_role_by_affiliation(e)
            if role:
                User.objects.update_role(user.email, role)
                return role

    def update_user_quota(self, user, user_role):
        role_quota = get_enabled_role_permissions_by_role(user_role)['role_quota']
        if role_quota:
            quota = get_quota_from_string(role_quota)
            logger.info('Set quota[%d] for user: %s, role[%s]' % (quota, user.username, user_role))
            seafile_api.set_role_quota(user_role, quota)
        else:
            return

    def setup_session(self, request):
        """
        If you want to add custom code to setup user sessions, you
        can extend this.
        """
        return

    def parse_attributes(self, request):
        """
        Parse the incoming Shibboleth attributes.
        From: https://github.com/russell/django-shibboleth/blob/master/django_shibboleth/utils.py
        Pull the mapped attributes from the apache headers.
        """
        shib_attrs = {}
        error = False
        meta = request.META
        for header, attr in list(SHIB_ATTRIBUTE_MAP.items()):
            required, name = attr
            value = meta.get(header, None)
            shib_attrs[name] = value
            if not value or value == '':
                if required:
                    error = True
        return shib_attrs, error


class ShibbolethValidationError(Exception):
    pass
