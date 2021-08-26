""" Django CAS 2.0 authentication middleware """

from django.conf import settings
from django.contrib import auth
from django.contrib.auth.views import LoginView as login, LogoutView as logout
from django.core.exceptions import PermissionDenied
from django.http import HttpResponseRedirect
from django.utils.deprecation import MiddlewareMixin
from django_cas.exceptions import CasTicketException
from django_cas.views import login as cas_login, logout as cas_logout
from urllib.parse import urlencode

__all__ = ['CASMiddleware']

class CASMiddleware(MiddlewareMixin):
    """Middleware that allows CAS authentication on admin pages"""

    def process_request(self, request):
        """ Checks that the authentication middleware is installed. """

        error = ("The Django CAS middleware requires authentication "
                 "middleware to be installed. Edit your MIDDLEWARE_CLASSES "
                 "setting to insert 'django.contrib.auth.middleware."
                 "AuthenticationMiddleware'.")
        assert hasattr(request, 'user'), error


    def process_view(self, request, view_func, view_args, view_kwargs):
        """ Forwards unauthenticated requests to the admin page to the CAS
            login URL, as well as calls to django.contrib.auth.views.login and
            logout.
        """
        if view_func == login:
            return cas_login(request, *view_args, **view_kwargs)
        if view_func == logout:
            return cas_logout(request, *view_args, **view_kwargs)
        
        # The rest of this method amends the Django admin authorization wich
        # will post a username/password dialog to authenticate to django admin.
        if not view_func.__module__.startswith('django.contrib.admin.'):
            return None

        if request.user.is_authenticated:
            if request.user.is_staff:
                return None
            else:
                raise PermissionDenied("No staff priviliges")
        params = urlencode({auth.REDIRECT_FIELD_NAME: request.get_full_path()})        
        return HttpResponseRedirect(settings.LOGIN_URL + '?' + params)


    def process_exception(self, request, exception):
        """ When we get a CasTicketException it is probably caused by the ticket timing out.
            So logout and get the same page again."""
        if isinstance(exception, CasTicketException):
            auth.logout(request)
            return HttpResponseRedirect(request.path)
        else:
            return None
