"""This file contains functions used as part of a user creation pipeline, such as django-social-auth."""

# pylint: disable=W0613

try:
    from urllib.parse import urlparse, urlunparse
except ImportError:
    from urllib.parse import urlparse, urlunparse
from .models import TermsAndConditions
from django.http import HttpResponseRedirect, QueryDict
from django.conf import settings
from django.urls import reverse
import logging

ACCEPT_TERMS_PATH = getattr(settings, 'ACCEPT_TERMS_PATH', '/terms/accept/')
TERMS_RETURNTO_PARAM = getattr(settings, 'TERMS_RETURNTO_PARAM', 'returnTo')

LOGGER = logging.getLogger(name='termsandconditions')


def user_accept_terms(backend, user, uid, social_user=None, *args, **kwargs):
    """Check if the user has accepted the terms and conditions after creation."""

    LOGGER.debug('user_accept_terms')

    if not TermsAndConditions.agreed_to_latest(user):
        return redirect_to_terms_accept('/')
    else:
        return {'social_user': social_user, 'user': user}


def redirect_to_terms_accept(current_path='/', slug='default'):
    """Redirect the user to the terms and conditions accept page."""
    redirect_url_parts = list(urlparse(ACCEPT_TERMS_PATH))
    if slug != 'default':
        redirect_url_parts[2] += slug
    querystring = QueryDict(redirect_url_parts[4], mutable=True)
    querystring[TERMS_RETURNTO_PARAM] = current_path
    redirect_url_parts[4] = querystring.urlencode(safe='/')
    return HttpResponseRedirect(urlunparse(redirect_url_parts))
