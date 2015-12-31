import logging

from rest_framework import status

import seaserv
from pysearpc import SearpcError

from seahub.api2.utils import api_error

logger = logging.getLogger(__name__)

def api_check_group_member(func):
    """
    Decorator for check if group valid and if is group member
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

        username = request.user.username
        try:
            is_group_member = seaserv.is_group_user(group_id,
                                                    username)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not is_group_member:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        return func(view, request, group_id, *args, **kwargs)

    return _decorated

def api_check_group_staff(func):
    """
    Decorator for check if group valid and if is group staff
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

        username = request.user.username
        try:
            is_group_staff = seaserv.check_group_staff(group_id, username)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not is_group_staff:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        return func(view, request, group_id, *args, **kwargs)

    return _decorated

def api_check_group_owner(func):
    """
    Decorator for check if group valid and if is group owner
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

        username = request.user.username
        if not (username == group.creator_name):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        return func(view, request, group_id, *args, **kwargs)

    return _decorated
