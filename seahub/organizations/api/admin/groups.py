# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication

from seaserv import ccnet_api, seafile_api

from seahub.api2.permissions import IsProVersion, IsOrgAdminUser
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error
from seahub.api2.endpoints.admin.groups import AdminGroup as SysAdminGroup
from seahub.avatar.settings import GROUP_AVATAR_DEFAULT_SIZE
from seahub.avatar.templatetags.group_avatar_tags import api_grp_avatar_url, get_default_group_avatar_url
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email
from seahub.utils.ccnet_db import CcnetDB
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.admin_log.signals import admin_operation
from seahub.admin_log.models import GROUP_TRANSFER

from pysearpc import SearpcError

from seahub.organizations.views import get_org_groups, get_org_id_by_group, remove_org_group


logger = logging.getLogger(__name__)


class OrgAdminGroups(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def get(self, request, org_id):
        """List organization group
        """
        # resource check
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # Make sure page request is an int. If not, deliver first page.
        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '25'))
        except ValueError:
            current_page = 1
            per_page = 25

        groups_plus_one = get_org_groups(org_id, per_page * (current_page - 1),
                                         per_page + 1)
        groups = groups_plus_one[:per_page]

        groups_list = []
        for i in groups:
            group = {}
            group['id'] = i.id
            group['group_name'] = i.group_name
            group['ctime'] = timestamp_to_isoformat_timestr(i.timestamp)
            group['creator_name'] = email2nickname(i.creator_name)
            group['creator_email'] = i.creator_name
            group['creator_contact_email'] = email2contact_email(i.creator_name)
            groups_list.append(group)


        if len(groups_plus_one) == per_page + 1:
            page_next = True
        else:
            page_next = False

        return Response({
                'groups': groups_list,
                'page': current_page,
                'per_page': per_page,
                'page_next': page_next,
                })


class OrgAdminGroup(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def get(self, request, org_id, group_id):
        """get org group info
        """
        # resource check
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        group_id = int(group_id)
        if get_org_id_by_group(group_id) != org_id:
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # main
        group = ccnet_api.get_group(group_id)

        group_info = {
            "id": group.id,
            "group_name": group.group_name,
            "ctime": timestamp_to_isoformat_timestr(group.timestamp),
            "creator_email": group.creator_name,
            "creator_name": email2nickname(group.creator_name),
            'creator_contact_email': email2contact_email(group.creator_name),
        }

        return Response(group_info)

    def put(self, request, org_id, group_id):
        """ Admin update a group

        1. transfer a group.abs
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


    def delete(self, request, org_id, group_id):
        """Remove an organization group
        """
        # resource check

        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission checking
        group_id = int(group_id)
        if get_org_id_by_group(group_id) != org_id:
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            remove_org_group(org_id, group_id, request.user.username)
        except SearpcError as e:
            logger.error(e)

        return Response({'success': True})


class OrgAdminSearchGroup(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def get(self, request, org_id):
        """List organization group
        """
        # resource check
        org_id = int(org_id)
        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if request.user.org.org_id != org.org_id:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        query = request.GET.get('query', '')
        if not query:
            error_msg = 'query invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        org_groups = ccnet_api.search_org_groups(org_id, query, -1, -1)
        groups_list = []

        for i in org_groups:

            if query not in i.group_name:
                continue

            group = {}
            group['id'] = i.id
            group['group_name'] = i.group_name
            group['ctime'] = timestamp_to_isoformat_timestr(i.timestamp)
            group['creator_name'] = email2nickname(i.creator_name)
            group['creator_email'] = i.creator_name
            group['creator_contact_email'] = email2contact_email(i.creator_name)
            groups_list.append(group)

        return Response({'group_list': groups_list})


class OrgAdminDepartments(APIView):
    """
    List all departments of the current organization
    """
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsProVersion, IsOrgAdminUser)
    throttle_classes = (UserRateThrottle,)
    
    def get(self, request, org_id):
        try:
            db_api = CcnetDB()
            departments = db_api.list_org_departments(int(org_id))
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        
        result = []
        for group in departments:
            created_at = timestamp_to_isoformat_timestr(group.timestamp)
            department_info = {
                "id": group.id,
                "email": '%s@seafile_group' % str(group.id),
                "parent_group_id": group.parent_group_id,
                "name": group.group_name,
                "owner": group.creator_name,
                "created_at": created_at,
            }
            result.append(department_info)
        
        return Response(result)


class OrgAdminGroupToDeptView(APIView):
    """org group to department"""
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsProVersion, IsOrgAdminUser)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, org_id, group_id):
        # resource check
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        group_id = int(group_id)
        if get_org_id_by_group(group_id) != org_id:
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        group = ccnet_api.get_group(group_id)
        if group.creator_name == 'system admin':
            error_msg = 'Group %s is already a department' % group_id
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        try:
            # group to department
            ccnet_db = CcnetDB()
            ccnet_db.change_groups_into_departments(group_id)
            seafile_api.set_group_quota(group_id, -2)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        group = ccnet_api.get_group(group_id)
        group_info = {
            "id": group.id,
            "group_name": group.group_name,
            "ctime": timestamp_to_isoformat_timestr(group.timestamp),
            "creator_email": group.creator_name,
            "creator_name": email2nickname(group.creator_name),
            'creator_contact_email': email2contact_email(group.creator_name),
        }
        return Response(group_info)


class OrgAdminMoveDepartment(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsProVersion, IsOrgAdminUser)
    throttle_classes = (UserRateThrottle,)

    def put(self, request, org_id, group_id):
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        group_id = int(group_id)
        group = ccnet_api.get_group(group_id)
        if not group:
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        if group.creator_name != 'system admin':
            error_msg = 'Group %s is not a department' % group_id
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        if get_org_id_by_group(group_id) != org_id:
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        target_group_id = request.data.get('target_group_id')
        try:
            target_group_id = int(target_group_id)
        except:
            error_msg = 'target_group_id %s invalid' % target_group_id
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        target_group = ccnet_api.get_group(target_group_id)
        if not target_group:
            error_msg = 'Group %s not found.' % target_group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        if target_group.creator_name != 'system admin':
            error_msg = 'Group %s is not a department' % target_group_id
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if get_org_id_by_group(target_group_id) != org_id:
            error_msg = 'Group %s not found.' % target_group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        if group.parent_group_id == target_group_id or group_id == target_group_id:
            return Response({'success': True})
        
        try:
            ccnet_db = CcnetDB()
            sub_groups = ccnet_db.get_all_sub_groups(group_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        
        if target_group_id in sub_groups:
            error_msg = 'Cannot move to its own sub department.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            ccnet_db.move_department(group_id, target_group_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
