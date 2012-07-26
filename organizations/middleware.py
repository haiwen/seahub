from django.core.cache import cache
from django.http import HttpResponseRedirect

from seaserv import get_org_by_url_prefix

from settings import ORG_CACHE_PREFIX

class OrganizationMiddleware(object):
    """
    Middleware that add organization info to request when user in organization
    context.
    """
    
    def process_request(self, request):
        """
        """
        org = cache.get(ORG_CACHE_PREFIX + request.user.username)
        request.user.org = org
            
        # full_path = request.get_full_path()
        # if full_path.startswith('/organizations/'):
        #     url_prefix = full_path.split('/')[2]
        #     org = get_org_by_url_prefix(url_prefix)
        #     if org:
        #         request.org = org
            
        return None

    def process_response(self, request, response):
        return response
