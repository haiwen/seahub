import logging

from rest_framework import status

import seaserv
from pysearpc import SearpcError

from seahub.api2.utils import api_error

logger = logging.getLogger(__name__)

def api_check_group(func):
    """
    Decorator for check if group valid
    """
    def _decorated(view, request, group_id, *args, **kwargs):
        group_id = int(group_id) # Checked by URL Conf
        try:
            group = seaserv.get_group(group_id)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not group:
            error_msg = 'Group %d not found.' % group_id
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        return func(view, request, group_id, *args, **kwargs)

    return _decorated

def is_group_member(group_id, email):
    return seaserv.is_group_user(group_id, email)

def is_group_admin(group_id, email):
    return seaserv.check_group_staff(group_id, email)

def is_group_owner(group_id, email):
    group = seaserv.get_group(group_id)
    if email == group.creator_name:
        return True
    else:
        return False

def is_group_admin_or_owner(group_id, email):
    if is_group_admin(group_id, email) or \
        is_group_owner(group_id, email):
        return True
    else:
        return False
