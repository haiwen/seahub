# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf import settings
from django.http import HttpResponseRedirect
from django.core.exceptions import ImproperlyConfigured
from django.utils.deprecation import MiddlewareMixin

from seahub import auth


class RemoteKrbMiddleware(MiddlewareMixin):
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
    header = "REMOTE_USER"

    def process_request(self, request):
        # AuthenticationMiddleware is required so that request.user exists.
        if not hasattr(request, 'user'):
            raise ImproperlyConfigured(
                "The Django remote user auth middleware requires the"
                " authentication middleware to be installed.  Edit your"
                " MIDDLEWARE_CLASSES setting to insert"
                " 'django.contrib.auth.middleware.AuthenticationMiddleware'"
                " before the RemoteUserMiddleware class.")
        try:
            username = request.META[self.header]
        except KeyError:
            # If specified header doesn't exist then return
            # directly(request.user could be AnonymousUser or authed user set
            # by AuthenticationMiddleware)
            return

        if settings.KRB5_USERNAME_SUFFIX:
            username = username.split('@')[0] + settings.KRB5_USERNAME_SUFFIX

        # If the user is already authenticated and that user is the user we are
        # getting passed in the headers, then the correct user is already
        # persisted in the session and we don't need to continue.
        # If the authenticated user is not the user getting from header, then
        # logout the user.
        if request.user.is_authenticated:
            if request.user.username == self.clean_username(username, request):
                request.krb5_login = True
                return
            else:
                auth.logout(request)
        # We are seeing this user for the first time in this session, attempt
        # to authenticate the user.
        user = auth.authenticate(remote_user=username)
        if user and user.is_active:
            # User is valid.  Set request.user and persist user in the session
            # by logging the user in.
            request.user = user
            auth.login(request, user)
            request.krb5_login = True
        else:
            # explicit redirect to login url to avoid redirect loop in some case
            return HttpResponseRedirect(settings.LOGIN_URL)

    def process_response(self, request, response):
        if getattr(request, 'krb5_login', False):
            print('%s: set kerberos cookie!' % id(self))
            self._set_auth_cookie(request, response)
        return response

    def _set_auth_cookie(self, request, response):
        from seahub.api2.utils import get_token_v1, get_token_v2
        # generate tokenv2 using information in request params
        if 'from_desktop' not in str(request.GET):
            return
        keys = (
            'platform',
            'device_id',
            'device_name',
            'client_version',
            'platform_version',
        )
        if all(['krb5_' + key in request.GET for key in keys]):
            platform = request.GET['krb5_platform']
            device_id = request.GET['krb5_device_id']
            device_name = request.GET['krb5_device_name']
            client_version = request.GET['krb5_client_version']
            platform_version = request.GET['krb5_platform_version']
            token = get_token_v2(
                request, request.user.username, platform, device_id,
                device_name, client_version, platform_version)
        elif all(['krb5_' + key not in request.GET for key in keys]):
            token = get_token_v1(request.user.username)
        else:
            return
        response.set_cookie('seahub_auth',
                            request.user.username + '@' + token.key,
                            domain=settings.SESSION_COOKIE_DOMAIN)

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
