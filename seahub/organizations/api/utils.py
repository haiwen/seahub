from rest_framework import status

from seahub.api2.utils import api_error

def check_org_admin(func):
    # return decorated function if request.user is admin of the specific org,
    # raise 403 otherwise
    def _decorated(view, request, org_id, *args, **kwargs):
        org = request.user.org
        if org and org.is_staff:
            org_id = int(org_id)
            if org_id == request.user.org.org_id:
                return func(view, request, org_id, *args, **kwargs)
            else:
                return api_error(status.HTTP_403_FORBIDDEN, '')
        else:
            return api_error(status.HTTP_403_FORBIDDEN, '')

    return _decorated

def update_log_perm_audit_type(event):
    if event.to.isdigit():
        etype = event.etype.replace('-', '-group-', 1)
    elif event.to == 'all':
        etype = event.etype.replace('-', '-public-', 1)
    else:
        etype = event.etype.replace('-', '-user-', 1)

    etype = etype.replace('perm', 'permission')
    return etype
