import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api, ccnet_api

from seahub.api2.utils import api_error
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.permissions import IsProVersion
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.endpoints.utils import api_check_group

from seahub.group.utils import is_group_admin
from seahub.utils.timeutils import timestamp_to_isoformat_timestr

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
        "quota": seafile_api.get_group_quota(group.id),
    }


class AddressBookGroupsSubGroups(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAuthenticated, IsProVersion)

    @api_check_group
    def get(self, request, group_id):
        """ List sub groups of a group in address book.
        """

        if not is_group_admin(group_id, request.user.username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            groups = ccnet_api.get_descendants_groups(group_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return_results = []
        for group in groups:
            return_results.append(address_book_group_to_dict(group))

        return Response(return_results)
