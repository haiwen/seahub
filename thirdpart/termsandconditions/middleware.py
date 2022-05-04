"""Terms and Conditions Middleware"""
from django.utils.deprecation import MiddlewareMixin

from .models import TermsAndConditions
from django.conf import settings
import logging
from .pipeline import redirect_to_terms_accept
from constance import config

LOGGER = logging.getLogger(name='termsandconditions')

ACCEPT_TERMS_PATH = getattr(settings, 'ACCEPT_TERMS_PATH', '/terms/accept/')
TERMS_EXCLUDE_URL_PREFIX_LIST = getattr(settings, 'TERMS_EXCLUDE_URL_PREFIX_LIST', {'/admin', '/terms', '/media', '/static', '/api2'})
TERMS_EXCLUDE_URL_LIST = getattr(settings, 'TERMS_EXCLUDE_URL_LIST', {'/termsrequired/', '/accounts/logout/', '/securetoo/'})


class TermsAndConditionsRedirectMiddleware(MiddlewareMixin):
    """
    This middleware checks to see if the user is logged in, and if so,
    if they have accepted the site terms.
    """

    def process_request(self, request):
        """Process each request to app to ensure terms have been accepted"""
        if not config.ENABLE_TERMS_AND_CONDITIONS:
            return None

        LOGGER.debug('termsandconditions.middleware')

        current_path = request.META['PATH_INFO']
        protected_path = is_path_protected(current_path)

        if request.user.is_authenticated and protected_path:
            for term in TermsAndConditions.get_active_list():
                if not TermsAndConditions.agreed_to_latest(request.user, term):
                    return redirect_to_terms_accept(current_path, term)
        return None


def is_path_protected(path):
    """
    returns True if given path is to be protected, otherwise False

    The path is not to be protected when it appears on:
    TERMS_EXCLUDE_URL_PREFIX_LIST, TERMS_EXCLUDE_URL_LIST or as
    ACCEPT_TERMS_PATH
    """
    protected = True

    for exclude_path in TERMS_EXCLUDE_URL_PREFIX_LIST:
        if path.startswith(exclude_path):
            protected = False

    if path in TERMS_EXCLUDE_URL_LIST:
        protected = False

    if path.startswith(ACCEPT_TERMS_PATH):
        protected = False

    return protected
