# Copyright (c) 2012-2016 Seafile Ltd.
import logging
from urllib.parse import urlparse

from django.conf import settings
from django.http import HttpResponseRedirect
from django.utils.deprecation import MiddlewareMixin

from .settings import ORG_REDIRECT
from seahub.utils import get_service_url, get_site_scheme_and_netloc

# Get an instance of a logger
logger = logging.getLogger(__name__)

# class OrganizationMiddleware(object):
#     def process_request(self, request):
#         orgs = seaserv.get_orgs_by_user(request.user.username)
#         if orgs:
#             request.user.org = orgs[0]

#         return None

#     def process_response(self, request, response):
#         return response
    
class RedirectMiddleware(MiddlewareMixin):
    """Middleware class that redirects non "www" subdomain requests to a
    specified URL or business.
    """
    def process_request(self, request):
        """Returns an HTTP redirect response for requests including non-"www"
        subdomains.
        """
        if getattr(settings, 'MULTI_TENANCY', False) is False:
            return None

        if ORG_REDIRECT is False:
            return None

        path = request.get_full_path()
        domain = request.headers.get('host') or request.META.get('SERVER_NAME')

        if request.user.is_anonymous:
            return None

        if request.user.org is None: # personal user
            sub_domain = get_subdomain(domain)
            if sub_domain is not None:
                return HttpResponseRedirect(get_site_scheme_and_netloc() + path)
            else:
                return None
        else:                   # org user
            url_prefix = request.user.org.url_prefix
            sub_domain = get_subdomain(domain)
            if sub_domain is None or sub_domain != url_prefix:
                return HttpResponseRedirect(construct_org_url(url_prefix,
                                                              path))
            else:
                return None

def get_subdomain(domain):
    service_url_netloc = urlparse(get_service_url()).netloc
    domain_remaining = domain.replace(service_url_netloc, '')

    if domain_remaining == '':
        return None
    elif domain_remaining[-1] == '.':
        return domain_remaining[:-1]
    else:
        logger.warning('Invalid domain: %s, service_url: %s' % (domain, service_url_netloc))
        return None

def construct_org_url(url_prefix, path):
    service_url = get_service_url()
    p = urlparse(service_url)
    scheme = p.scheme
    netloc = p.netloc
    return "%s://%s.%s%s" % (scheme, url_prefix, netloc, path)
