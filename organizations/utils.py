import sys
from django.core.cache import cache
from settings import ORG_CACHE_PREFIX

from seaserv import get_org_id_by_repo_id

def clear_org_ctx(request):
    """
    Clear current context.
    """
    cache.delete(ORG_CACHE_PREFIX + request.user.username)
    request.user.org = None

def set_org_ctx(request, org_dict):
    """
    Set current context to org.
    """
    cache.set(ORG_CACHE_PREFIX + request.user.username, org_dict, sys.maxint)
    request.user.org = org_dict

def access_org_repo(request, repo_id):
    """
    Check whether user can view org repo.
    Arguments:
    - `request`: request must has org dict.
    - `repo_id`: repo id
    """
    cur_org_id = request.user.org['org_id']
    org_id = get_org_id_by_repo_id(repo_id)
    return True if cur_org_id == org_id else False
    


