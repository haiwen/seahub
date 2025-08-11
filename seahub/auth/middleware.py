# Copyright (c) 2012-2016 Seafile Ltd.

import logging

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.utils.deprecation import MiddlewareMixin
from django.shortcuts import render

from seahub import auth
from seahub.base.sudo_mode import update_sudo_mode_ts
from seahub.auth.backends import SeafileRemoteUserBackend

from seahub.api2.utils import get_api_token

logger = logging.getLogger(__name__)


class LazyUser(object):
    def __get__(self, request, obj_type=None):
        if not hasattr(request, '_cached_user'):
            from seahub.auth import get_user
            request._cached_user = get_user(request)
        return request._cached_user


class AuthenticationMiddleware(MiddlewareMixin):
    def process_request(self, request):
        assert hasattr(
            request, 'session'
        ), "The Django authentication middleware requires session middleware to be installed. Edit your MIDDLEWARE setting to insert 'django.contrib.sessions.middleware.SessionMiddleware'."
        request.__class__.user = LazyUser()
        if request.user.is_authenticated and not request.user.is_active:
            request.session.clear()
            request.session.delete()
        return None


# https://docs.djangoproject.com/en/2.2/topics/http/middleware/#upgrading-pre-django-1-10-style-middleware
class SeafileRemoteUserMiddleware(MiddlewareMixin):
    """
    Middleware for utilizing Web-server-provided authentication.

    If request.user is not authenticated, then this middleware attempts to
    authenticate the username passed in the ``REMOTE_USER`` request header.
    If authentication is successful, the user is automatically logged in to
    persist the user in the session.

    The header used is configurable and defaults to ``REMOTE_USER``.  Subclass
    this class and change the ``header`` attribute if you need to use a
    different header.
    """

    # Name of request header to grab username from.  This will be the key as
    # used in the request.META dictionary, i.e. the normalization of headers to
    # all uppercase and the addition of "HTTP_" prefix apply.
    header = getattr(settings, 'REMOTE_USER_HEADER', "HTTP_REMOTE_USER")

    # Like RemoteUserMiddleware but keeps the user authenticated even if
    # the header (``REMOTE_USER``) is not found in the request. Useful
    # for setups when the external authentication via ``REMOTE_USER``
    # is only expected to happen on some "logon" URL and the rest of
    # the application wants to use Django's authentication mechanism.
    force_logout_if_no_header = getattr(
        settings, 'REMOTE_USER_FORCE_LOGOUT_IF_NO_HEADER', True)

    remote_user_domain = getattr(settings, 'REMOTE_USER_DOMAIN', '')
    protected_paths = getattr(settings, 'REMOTE_USER_PROTECTED_PATH', [
        'sso',
    ])

    def process_request(self, request):

        protected_paths = [item.strip().strip('/') for item in self.protected_paths]
        if request.path.strip('/') not in protected_paths:
            return

        # AuthenticationMiddleware is required so that request.user exists.
        if not hasattr(request, 'user'):
            raise ImproperlyConfigured(
                "The Django remote user auth middleware requires the"
                " authentication middleware to be installed.  Edit your"
                " MIDDLEWARE setting to insert"
                " 'django.contrib.auth.middleware.AuthenticationMiddleware'"
                " before the RemoteUserMiddleware class.")

        try:
            username = request.META[self.header]
        except KeyError:
            if settings.DEBUG:
                assert False
            # If specified header doesn't exist then remove any existing
            # authenticated remote-user, or return (leaving request.user set to
            # AnonymousUser by the AuthenticationMiddleware).
            if self.force_logout_if_no_header and request.user.is_authenticated:
                self._remove_invalid_user(request)
            return

        if self.remote_user_domain:
            username = username.split('@')[0] + '@' + self.remote_user_domain

        # If the user is already authenticated and that user is the user we are
        # getting passed in the headers, then the correct user is already
        # persisted in the session and we don't need to continue.
        if request.user.is_authenticated:
            if request.user.get_username() == self.clean_username(
                    username, request):
                if request.user.is_staff:
                    update_sudo_mode_ts(request)
                # add a mark to generate api token and set cookie
                request.remote_user_authentication = True
                return
            else:
                # An authenticated user is associated with the request, but
                # it does not match the authorized user in the header.
                self._remove_invalid_user(request)

        # We are seeing this user for the first time in this session, attempt
        # to authenticate the user.
        user = auth.authenticate(request=request, remote_user=username)
        if not user:
            if not getattr(settings, 'REMOTE_USER_CREATE_UNKNOWN_USER', True):
                return render(request, 'remote_user/create_unknown_user_false.html')
            return render(request, 'remote_user/error.html')

        if user:
            if not user.is_active:
                return render(request, 'remote_user/not_active.html')

            # User is valid.  Set request.user and persist user in the session
            # by logging the user in.
            request.user = user
            auth.login(request, user)

            # add a mark to generate api token and set cookie
            request.remote_user_authentication = True

    def process_response(self, request, response):
        if getattr(request, 'remote_user_authentication', False):
            self._set_auth_cookie(request, response)
        return response

    def clean_username(self, username, request):
        """
        Allows the backend to clean the username, if the backend defines a
        clean_username method.
        """
        backend_str = request.session[auth.BACKEND_SESSION_KEY]
        backend = auth.load_backend(backend_str)
        try:
            username = backend.clean_username(username)
        except AttributeError:  # Backend has no clean_username method.
            pass
        return username

    def _remove_invalid_user(self, request):
        """
        Removes the current authenticated user in the request which is invalid
        but only if the user is authenticated via the SeafileRemoteUserBackend.
        """
        try:
            backend_str = request.session[auth.BACKEND_SESSION_KEY]
            backend = auth.load_backend(backend_str)
        except ImportError:
            # backend failed to load
            auth.logout(request)
        else:
            if isinstance(backend, SeafileRemoteUserBackend):
                auth.logout(request)

    def _set_auth_cookie(self, request, response):

        if getattr(settings, 'ENABLE_SHIB_LOGIN', False):
            key_prefix = 'shib_'
        elif getattr(settings, 'ENABLE_KRB5_LOGIN', False):
            key_prefix = 'krb5_'
        else:
            key_prefix = ''

        api_token = get_api_token(request, key_prefix)
        response.set_cookie('seahub_auth',
                            request.user.username + '@' + api_token.key,
                            domain=settings.SESSION_COOKIE_DOMAIN)
