import sys
from django.core.cache import cache
from settings import ORG_CACHE_PREFIX

def clear_org_ctx(request):
    """
    """
    cache.delete(ORG_CACHE_PREFIX + request.user.username)
    request.user.org = None

def set_org_ctx(request, org_dict):
    """
    """
    cache.set(ORG_CACHE_PREFIX + request.user.username, org_dict, sys.maxint)
    request.user.org = org_dict
    
    


