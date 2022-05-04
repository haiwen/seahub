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
from seahub.organizations.api.permissions import IsOrgAdmin
from seahub.organizations.api.utils import check_org_admin
from seahub.api2.endpoints.admin.group_owned_libraries import AdminGroupOwnedLibraries as SysAdminGroupOwnedLibraries
from seahub.api2.endpoints.admin.group_owned_libraries import AdminGroupOwnedLibrary as SysAdminGroupOwnedLibrary


logger = logging.getLogger(__name__)

class AdminGroupOwnedLibraries(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsOrgAdmin, IsProVersion)

    @check_org_admin
    def post(self, request, org_id, group_id):
        """ Add a group owned library.
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

        return SysAdminGroupOwnedLibraries().post(request, group_id)


class AdminGroupOwnedLibrary(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsOrgAdmin, IsProVersion)

    @check_org_admin
    def delete(self, request, org_id, group_id, repo_id):
        """ Delete a group owned library.
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

        return SysAdminGroupOwnedLibrary().delete(request, group_id, repo_id)
