import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.views import APIView
from rest_framework import status

from seaserv import ccnet_api

from seahub.api2.utils import api_error
from seahub.organizations.views import get_org_id_by_group
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.permissions import IsProVersion
from seahub.api2.endpoints.admin.groups import AdminGroup as SysAdminGroup

from seahub.organizations.api.permissions import IsOrgAdmin
from seahub.organizations.api.utils import check_org_admin

logger = logging.getLogger(__name__)


class AdminGroup(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsOrgAdmin, IsProVersion)

    @check_org_admin
    def put(self, request, org_id, group_id):
        """ Admin update a group

        1. transfer a group.
        2. set group quota

        Permission checking:
        1. Admin user;
        """
        # resource check
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        group_id = int(group_id)
        if get_org_id_by_group(group_id) != org_id:
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        return SysAdminGroup().put(request, group_id)
