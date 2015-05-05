from django.contrib.auth.middleware import RemoteUserMiddleware
from django.core.exceptions import ImproperlyConfigured

from shibboleth.app_settings import SHIB_ATTRIBUTE_MAP, LOGOUT_SESSION_KEY, SHIB_USER_HEADER

from seahub import auth
from seahub.base.sudo_mode import update_sudo_mode_ts

class ShibbolethRemoteUserMiddleware(RemoteUserMiddleware):
    """
    Authentication Middleware for use with Shibboleth.  Uses the recommended pattern
    for remote authentication from: http://code.djangoproject.com/svn/django/tags/releases/1.3/django/contrib/auth/middleware.py
    """
    def __init__(self, *a, **kw):
        super(ShibbolethRemoteUserMiddleware, self).__init__(*a, **kw)

    def process_request(self, request):
        # AuthenticationMiddleware is required so that request.user exists.
        if not hasattr(request, 'user'):
            raise ImproperlyConfigured(
                "The Django remote user auth middleware requires the"
                " authentication middleware to be installed.  Edit your"
                " MIDDLEWARE_CLASSES setting to insert"
                " 'django.contrib.auth.middleware.AuthenticationMiddleware'"
                " before the RemoteUserMiddleware class.")

        #To support logout.  If this variable is True, do not
        #authenticate user and return now.
        if request.session.get(LOGOUT_SESSION_KEY) == True:
            return
        else:
            #Delete the shib reauth session key if present.
            request.session.pop(LOGOUT_SESSION_KEY, None)

        #Locate the remote user header.
        # import pprint; pprint.pprint(request.META)
        try:
            username = request.META[SHIB_USER_HEADER]
        except KeyError:
            # If specified header doesn't exist then return (leaving
            # request.user set to AnonymousUser by the
            # AuthenticationMiddleware).
            return
        # If the user is already authenticated and that user is the user we are
        # getting passed in the headers, then the correct user is already
        # persisted in the session and we don't need to continue.
        if request.user.is_authenticated():
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
            # User is valid.  Set request.user and persist user in the session
            # by logging the user in.
            request.user = user
            auth.login(request, user)
            user.set_unusable_password()
            user.save()
            # call make profile.
            self.make_profile(user, shib_meta)
            #setup session.
            self.setup_session(request)
            request.shib_login = True

    def process_response(self, request, response):
        if getattr(request, 'shib_login', False):
            print '%s: set shibboleth cookie!' % id(self)
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
        This is here as a stub to allow subclassing of ShibbolethRemoteUserMiddleware
        to include a make_profile method that will create a Django user profile
        from the Shib provided attributes.  By default it does nothing.
        """
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
        for header, attr in SHIB_ATTRIBUTE_MAP.items():
            required, name = attr
            value = meta.get(header, None)
            shib_attrs[name] = value
            if not value or value == '':
                if required:
                    error = True
        return shib_attrs, error

class ShibbolethValidationError(Exception):
    pass
