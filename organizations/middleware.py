from django.core.cache import cache
from django.http import HttpResponseRedirect

from seaserv import get_org_by_url_prefix, get_orgs_by_user

from settings import ORG_CACHE_PREFIX

class OrganizationMiddleware(object):
    """
    Middleware that add organization info to request when user in organization
    context.
    """
    
    def process_request(self, request):
        """
        """
        # Get current org context
        org = cache.get(ORG_CACHE_PREFIX + request.user.username)
        request.user.org = org

        # Get all orgs user created.
        orgs = get_orgs_by_user(request.user.username)
        request.user.orgs = orgs
            
        return None

    def process_response(self, request, response):
        return response
