from django.http import Http404

from seahub.utils import check_and_get_org_by_repo, check_and_get_org_by_group

def sys_staff_required(func):
    """
    Decorator for views that checks the user is system staff.
    """
    def _decorated(request, *args, **kwargs):
        if request.user.is_staff:
            return func(request, *args, **kwargs)
        raise Http404
    return _decorated
    
def ctx_switch_required(func):
    """
    Decorator for views to change navigation bar automatically that render
    same template when both in org context and personal context.
    """
    def _decorated(request, *args, **kwargs):
        repo_id = kwargs.get('repo_id', '')
        group_id = kwargs.get('group_id', '')
        if repo_id and group_id:
            return func(request, *args, **kwargs)
        
        user = request.user.username
        if repo_id:
            org, base_template = check_and_get_org_by_repo(repo_id, user)

        if group_id:
            org, base_template = check_and_get_org_by_group(int(group_id), user)

        request.user.org = org
        request.base_template = base_template
        return func(request, *args, **kwargs)
    return _decorated
    
