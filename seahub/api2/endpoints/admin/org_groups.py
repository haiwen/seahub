import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import ccnet_api, seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.api2.permissions import IsProVersion
from seahub.utils.timeutils import timestamp_to_isoformat_timestr

try:
    from seahub.settings import ORG_MEMBER_QUOTA_ENABLED
except ImportError:
    ORG_MEMBER_QUOTA_ENABLED= False

logger = logging.getLogger(__name__)


def get_org_group_info(group):
    group_info = {}
    group_info['group_name'] = group.group_name
    group_info['creator_name'] = group.creator_name
    group_info['created_at'] = timestamp_to_isoformat_timestr(group.timestamp)
    group_info['group_id'] = group.id

    return group_info


class AdminOrgGroups(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser, IsProVersion)

    def get(self, request, org_id):
        """ Get all groups in an org.

        Permission checking:
        1. only admin can perform this action.
        """
        org_id = int(org_id)
        if org_id == 0:
            error_msg = 'org_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %d not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            groups = ccnet_api.get_org_groups(org_id, -1, -1)
        except Exception as e:
            logger.error(e)
            error_msg = "Internal Server Error"
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        groups_info = []
        for group in groups:
            groups_info.append(get_org_group_info(group))

        return Response({'group_list': groups_info})
