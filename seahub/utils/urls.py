from django.urls import reverse

from seahub.utils import get_site_scheme_and_netloc

def abs_reverse(viewname, urlconf=None, args=None, kwargs=None, current_app=None):
    return get_site_scheme_and_netloc().rstrip('/') + reverse(
        viewname, urlconf, args, kwargs, current_app)
