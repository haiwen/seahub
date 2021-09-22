"""View Decorators for termsandconditions module"""
try:
    from urllib.parse import urlparse, urlunparse
except ImportError:
    from urllib.parse import urlparse, urlunparse
from functools import wraps
from django.http import HttpResponseRedirect, QueryDict
from .models import TermsAndConditions
from .middleware import ACCEPT_TERMS_PATH


def terms_required(view_func):
    """
    This decorator checks to see if the user is logged in, and if so, if they have accepted the site terms.
    """

    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        """Method to wrap the view passed in"""
        if not request.user.is_authenticated or TermsAndConditions.agreed_to_latest(request.user):
            return view_func(request, *args, **kwargs)

        currentPath = request.path
        login_url_parts = list(urlparse(ACCEPT_TERMS_PATH))
        querystring = QueryDict(login_url_parts[4], mutable=True)
        querystring['returnTo'] = currentPath
        login_url_parts[4] = querystring.urlencode(safe='/')
        return HttpResponseRedirect(urlunparse(login_url_parts))

    return _wrapped_view
