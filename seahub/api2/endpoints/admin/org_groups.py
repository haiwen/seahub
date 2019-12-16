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
from seahub.utils import is_pro_version
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email

try:
    from seahub.settings import ORG_MEMBER_QUOTA_ENABLED
except ImportError:
    ORG_MEMBER_QUOTA_ENABLED= False

logger = logging.getLogger(__name__)


class AdminOrgGroups(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser, IsProVersion)

    def get(self, request, org_id):
        """ Get all groups in an org.

        Permission checking:
        1. only admin can perform this action.
        """

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

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

        # Use dict to reduce memcache fetch cost in large for-loop.
        nickname_dict = {}
        contact_email_dict = {}
        creator_name_set = set([g.creator_name for g in groups])
        for e in creator_name_set:
            if e not in nickname_dict:
                nickname_dict[e] = email2nickname(e)
            if e not in contact_email_dict:
                contact_email_dict[e] = email2contact_email(e)

        groups_info = []
        for group in groups:
            group_info = {}
            group_info['group_name'] = group.group_name
            group_info['creator_email'] = group.creator_name
            group_info['creator_name'] = nickname_dict.get(group.creator_name, '')
            group_info['creator_contact_email'] = contact_email_dict.get(group.creator_name, '')
            group_info['created_at'] = timestamp_to_isoformat_timestr(group.timestamp)
            group_info['parent_group_id'] = group.parent_group_id if is_pro_version() else 0
            group_info['group_id'] = group.id

            groups_info.append(group_info)

        return Response({'group_list': groups_info})
