"""CAS authentication middleware"""




from six.moves import urllib_parse

from django.http import HttpResponseRedirect
from django.core.exceptions import PermissionDenied
from django.conf import settings
from django.contrib.auth import REDIRECT_FIELD_NAME
try:
    # Django > 1.10 deprecates django.core.urlresolvers
    from django.urls import reverse
except ImportError:
    from django.core.urlresolvers import reverse

try:
    # Django > 1.10 uses MiddlewareMixin
    from django.utils.deprecation import MiddlewareMixin
except ImportError:
    MiddlewareMixin = object

import django

from .views import login as cas_login, logout as cas_logout
from seahub.auth.views import login, logout

__all__ = ['CASMiddleware']


class CASMiddleware(MiddlewareMixin):
    """Middleware that allows CAS authentication on admin pages"""

    def process_request(self, request):
        """Checks that the authentication middleware is installed"""

        error = ("The Django CAS middleware requires authentication "
                 "middleware to be installed. Edit your MIDDLEWARE_CLASSES "
                 "setting to insert 'django.contrib.auth.middleware."
                 "AuthenticationMiddleware'.")
        assert hasattr(request, 'user'), error

    def process_view(self, request, view_func, view_args, view_kwargs):
        """Forwards unauthenticated requests to the admin page to the CAS
        login URL, as well as calls to django.contrib.auth.views.login and
        logout.
        """

        if view_func == login:
            return cas_login(request, *view_args, **view_kwargs)
        elif view_func == logout:
            return cas_logout(request, *view_args, **view_kwargs)

        if view_func in (cas_login, cas_logout):
            return None

        if settings.CAS_ADMIN_PREFIX:
            if not request.path.startswith(settings.CAS_ADMIN_PREFIX):
                return None
        elif not view_func.__module__.startswith('django.contrib.admin.'):
            return None

        if django.VERSION[0] < 2:
            is_user_authenticated = request.user.is_authenticated
        else:
            is_user_authenticated = request.user.is_authenticated

        if is_user_authenticated:
            if request.user.is_staff:
                return None
            else:
                raise PermissionDenied('You do not have staff privileges.')
        params = urllib_parse.urlencode({REDIRECT_FIELD_NAME: request.get_full_path()})
        return HttpResponseRedirect(reverse(cas_login) + '?' + params)
