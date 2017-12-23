import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from django.utils.translation import ugettext as _

from seaserv import seafile_api, ccnet_api
from pysearpc import SearpcError

from seahub.base.accounts import User
from seahub.utils import is_valid_username
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
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

class AdminAddressBookGroups(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def get(self, request):
        """List top groups in address book."""
        return_results = []

        groups = ccnet_api.get_top_groups()
        for group in groups:
            return_results.append(address_book_group_to_dict(group))

        return Response({"data": return_results})

    def post(self, request):
        """Add a group in address book.

        parent_group: -1 - no parent group;
                      > 0 - have parent group.
        group_owner: default to system admin
        group_staff: default to system admin
        """
        group_name = request.data.get('group_name', '').strip()
        if not group_name:
            error_msg = 'group_name %s invalid.' % group_name
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # Check whether group name is validate.
        if not validate_group_name(group_name):
            error_msg = _(u'Group name can only contain letters, numbers, blank, hyphen or underscore')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # Check whether group name is duplicated.
        if check_group_name_conflict(request, group_name):
            error_msg = _(u'There is already a group with that name.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        group_owner = request.data.get('group_owner', '')
        if group_owner:
            try:
                User.objects.get(email=group_owner)
            except User.DoesNotExist:
                error_msg = 'User %s not found.' % group_owner
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        else:
            group_owner = request.user.username

        try:
            parent_group = int(request.data.get('parent_group', -1))
        except ValueError:
            error_msg = 'parent_group invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if parent_group < 0 and parent_group != -1:
            error_msg = 'parent_group invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # TODO: check parent group exists

        try:
            group_id = ccnet_api.create_group(group_name, group_owner,
                                              parent_group_id=parent_group)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # get info of new group
        group_info = address_book_group_to_dict(group_id)

        return Response(group_info, status=status.HTTP_200_OK)
