from django.core.cache import cache
from django.http import HttpResponseRedirect

from seaserv import get_org_by_url_prefix, get_orgs_by_user

from settings import ORG_CACHE_PREFIX
try:
    from seahub.settings import OFFICIAL_MODE
except ImportError:
    OFFICIAL_MODE = False
    
class OrganizationMiddleware(object):
    """
    Middleware that add organization info to request when user in organization
    context.
    """

    def process_request(self, request):
        if OFFICIAL_MODE:
            request.official_mode = True
            
            # Get current org context
            org = cache.get(ORG_CACHE_PREFIX + request.user.username)
            request.user.org = org

            # Get all orgs user created.
            orgs = get_orgs_by_user(request.user.username)
            request.user.orgs = orgs
        else:
            request.official_mode = False
            request.user.org = None
            request.user.orgs = None
            
        return None

    def process_response(self, request, response):
        return response
