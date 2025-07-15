import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import ccnet_api, seafile_api

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
from seahub.utils import is_pro_version
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.group.utils import validate_group_name, set_group_name_cache
from seahub.utils.ccnet_db import CcnetDB


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

    @check_org_admin
    def put(self, request, org_id, group_id):
        """ Update an org address book group.
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

        new_group_name = request.data.get('group_name', '').strip()
        if not new_group_name:
            error_msg = 'name %s invalid.' % new_group_name
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # Check whether group name is validate.
        if not validate_group_name(new_group_name):
            error_msg = 'Group name can only contain letters, numbers, blank, hyphen, dot, single quote or underscore'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            ccnet_api.set_group_name(group_id, new_group_name)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        set_group_name_cache(group_id, new_group_name)

        group = ccnet_api.get_group(group_id)
        isoformat_timestr = timestamp_to_isoformat_timestr(group.timestamp)
        group_info = {
            "id": group.id,
            "name": group.group_name,
            "owner": group.creator_name,
            "owner_name": email2nickname(group.creator_name),
            "created_at": isoformat_timestr,
            "quota": seafile_api.get_group_quota(group_id) if is_pro_version() else 0,
            "parent_group_id": group.parent_group_id if is_pro_version() else 0
        }

        return Response(group_info)
    
    @check_org_admin
    def post(self, request, org_id, group_id):
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        group_id = int(group_id)
        if get_org_id_by_group(group_id) != org_id:
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        target_department_id = request.data.get('target_department_id')

        try:
            target_department_id = int(target_department_id)
            if get_org_id_by_group(target_department_id) != org_id:
                error_msg = 'Group %s not found.' % target_department_id
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        except Exception as e:
            error_msg = 'Group %s not found.' % target_department_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        department = ccnet_api.get_group(group_id)
        if department.parent_group_id == target_department_id:
            return Response({'success': True})
        try:
            # group to department
            ccnet_db = CcnetDB()
            sub_groups = ccnet_db.get_all_sub_groups(group_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        if target_department_id in sub_groups:
            error_msg = 'Cannot move to its own sub department.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            ccnet_db.update_group_structure(group_id, target_department_id, sub_groups)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
