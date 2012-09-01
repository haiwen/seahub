import sys

from seaserv import get_org_id_by_repo_id, list_org_repos_by_owner
    
def access_org_repo(request, repo_id):
    """
    Check whether user can view org repo.
    """
    if not request.user.org:
        return False
    cur_org_id = request.user.org['org_id']
    org_id = get_org_id_by_repo_id(repo_id)
    return True if cur_org_id == org_id else False

def validate_org_repo_owner(org_id, repo_id, user):
    """
    Check whether user is the owner of org repo.
    """
    org_repos = list_org_repos_by_owner(org_id, user)
    print org_id, user, org_repos
    for r in org_repos:
        if r.id == repo_id:
            return True
    return False
