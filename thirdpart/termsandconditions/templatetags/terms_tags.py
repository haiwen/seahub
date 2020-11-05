"""Django Tags"""
from django import template
from ..models import TermsAndConditions, DEFAULT_TERMS_SLUG
from ..middleware import is_path_protected
from django.conf import settings

try:
    from urllib.parse import urlparse
except ImportError:
    from urllib.parse import urlparse

register = template.Library()
DEFAULT_HTTP_PATH_FIELD = 'PATH_INFO'
TERMS_HTTP_PATH_FIELD = getattr(settings, 'TERMS_HTTP_PATH_FIELD', DEFAULT_HTTP_PATH_FIELD)


@register.inclusion_tag('termsandconditions/snippets/termsandconditions.html',
                        takes_context=True)
def show_terms_if_not_agreed(context, slug=DEFAULT_TERMS_SLUG, field=TERMS_HTTP_PATH_FIELD):
    """Displays a modal on a current page if a user has not yet agreed to the
    given terms. If terms are not specified, the default slug is used.

    How it works? A small snippet is included into your template if a user
    who requested the view has not yet agreed the terms. The snippet takes
    care of displaying a respective modal.
    """
    request = context['request']
    terms = TermsAndConditions.get_active(slug)
    agreed = TermsAndConditions.agreed_to_terms(request.user, terms)

    # stop here, if terms has been agreed
    if agreed:
        return {}

    # handle excluded url's
    url = urlparse(request.META[field])
    protected = is_path_protected(url.path)

    if (not agreed) and terms and protected:
        return {'terms': terms}

    return {}
