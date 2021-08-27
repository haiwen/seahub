import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.views import APIView
from rest_framework import status

from seaserv import ccnet_api

from seahub.api2.utils import api_error
from seahub.organizations.views import get_org_id_by_group
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.permissions import IsProVersion
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.endpoints.admin.address_book.groups import (
    AdminAddressBookGroups as SysAdminAddressBookGroups,
    AdminAddressBookGroup as SysAdminAddressBookGroup
)
from seahub.organizations.api.permissions import IsOrgAdmin
from seahub.organizations.api.utils import check_org_admin


logger = logging.getLogger(__name__)


class AdminAddressBookGroups(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsOrgAdmin, IsProVersion)

    @check_org_admin
    def get(self, request, org_id):
        """List top groups in org address book."""
        return SysAdminAddressBookGroups().get(request)

    @check_org_admin
    def post(self, request, org_id):
        """Add a group in an org address book.

        parent_group: -1 - no parent group;
                      > 0 - have parent group.
        group_owner: default to system admin
        group_staff: default to system admin
        """
        return SysAdminAddressBookGroups().post(request)


class AdminAddressBookGroup(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsOrgAdmin, IsProVersion)

    @check_org_admin
    def get(self, request, org_id, group_id):
        """List child groups and members in an org address book group."""
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

        return SysAdminAddressBookGroup().get(request, group_id)

    @check_org_admin
    def delete(self, request, org_id, group_id):
        """ Delete an org address book group.
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

        return SysAdminAddressBookGroup().delete(request, group_id)
