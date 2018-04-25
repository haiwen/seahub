import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from django.utils.translation import ugettext as _

from seaserv import seafile_api, ccnet_api
from pysearpc import SearpcError

from seahub.api2.utils import to_python_boolean
from seahub.avatar.settings import AVATAR_DEFAULT_SIZE
from seahub.base.accounts import User
from seahub.utils import is_valid_username
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.group.utils import get_group_member_info
from seahub.group.utils import is_group_member, is_group_admin, \
        validate_group_name, check_group_name_conflict
from seahub.admin_log.signals import admin_operation
from seahub.admin_log.models import GROUP_CREATE, GROUP_DELETE, GROUP_TRANSFER
from seahub.api2.utils import api_error
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication

logger = logging.getLogger(__name__)

def address_book_group_to_dict(group):
    if isinstance(group, int):
        group = ccnet_api.get_group(group)

    return {
        "id": group.id,
        "name": group.group_name,
        "owner": group.creator_name,
        "created_at": timestamp_to_isoformat_timestr(group.timestamp),
        "parent_group_id": group.parent_group_id,
    }

class AdminAddressBookGroup(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def get(self, request, group_id):
        """List child groups and members in an address book group."""
        group_id = int(group_id)

        group = ccnet_api.get_group(group_id)
        if not group:
            error_msg = 'Group %d not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            avatar_size = int(request.GET.get('avatar_size',
                                              AVATAR_DEFAULT_SIZE))
        except ValueError:
            avatar_size = AVATAR_DEFAULT_SIZE

        try:
            return_ancestors = to_python_boolean(request.GET.get(
                'return_ancestors', 'f'))
        except ValueError:
            return_ancestors = False

        ret_dict = address_book_group_to_dict(group)
        ret_groups = []
        ret_members = []

        groups = ccnet_api.get_child_groups(group_id)
        for group in groups:
            ret_groups.append(address_book_group_to_dict(group))

        try:
            members = ccnet_api.get_group_members(group_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        for m in members:
            member_info = get_group_member_info(request, group_id, m.user_name,
                                                avatar_size)
            ret_members.append(member_info)

        ret_dict['groups'] = ret_groups
        ret_dict['members'] = ret_members

        if return_ancestors:
            # get ancestor groups and remove last group which is self
            ancestor_groups = ccnet_api.get_ancestor_groups(group_id)[:-1]
            ret_dict['ancestor_groups'] = [address_book_group_to_dict(grp)
                                           for grp in ancestor_groups]
        else:
            ret_dict['ancestor_groups'] = []

        return Response(ret_dict)

    def delete(self, request, group_id):
        """Dismiss a specific group."""
        group_id = int(group_id)

        group = ccnet_api.get_group(group_id)
        if not group:
            return Response({'success': True})

        group_owner = group.creator_name
        group_name = group.group_name

        try:
            ret_code = ccnet_api.remove_group(group_id)
            if ret_code == -1:
                error_msg = 'Failed to remove: this group has child groups.'
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 error_msg)

            seafile_api.remove_group_repos(group_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # send admin operation log signal
        admin_op_detail = {
            "id": group_id,
            "name": group_name,
            "owner": group_owner,
        }
        admin_operation.send(sender=None, admin_name=request.user.username,
                             operation=GROUP_DELETE, detail=admin_op_detail)

        return Response({'success': True})
