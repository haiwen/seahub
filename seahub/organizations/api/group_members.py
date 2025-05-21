# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response

from seaserv import ccnet_api, seafile_api

from seahub.api2.utils import api_error
from seahub.organizations.views import get_org_id_by_group
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.permissions import IsProVersion
from seahub.api2.endpoints.admin.group_members import AdminGroupMembers as SysAdminGroupMembers
from seahub.api2.endpoints.admin.group_members import AdminGroupMember as SysAdminGroupMember
from seahub.organizations.api.permissions import IsOrgAdmin
from seahub.organizations.api.utils import check_org_admin
from seahub.base.accounts import User
from seahub.group.utils import is_group_member, get_group_member_info, get_group_members_info
from seahub.base.templatetags.seahub_tags import email2nickname

from seahub.group.signals import add_user_to_group
from seahub.admin_log.signals import admin_operation
from seahub.admin_log.models import GROUP_MEMBER_ADD, GROUP_MEMBER_DELETE

logger = logging.getLogger(__name__)


class AdminGroupMembers(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsOrgAdmin, IsProVersion)

    @check_org_admin
    def get(self, request, org_id, group_id, format=None):
        """ List all group members

        Permission checking:
        1. only admin can perform this action.
        """
        # resource check
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        group_id = int(group_id)
        group = ccnet_api.get_group(group_id)
        if not group or get_org_id_by_group(group_id) != org_id:
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '100'))
        except ValueError:
            page = 1
            per_page = 100

        start = (page - 1) * per_page
        limit = per_page + 1

        try:
            members = ccnet_api.get_group_members(group_id, start, limit)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if len(members) > per_page:
            members = members[:per_page]
            has_next_page = True
        else:
            has_next_page = False

        
        member_usernames = [m.user_name for m in members]
        members_info = get_group_members_info(group_id, member_usernames)
        group_members = {
            'group_id': group_id,
            'group_name': group.group_name,
            'members': members_info,
            'page_info': {
                'has_next_page': has_next_page,
                'current_page': page
            }
        }
        return Response(group_members)

    @check_org_admin
    def post(self, request, org_id, group_id):
        """
        Bulk add group members.

        Permission checking:
        1. only admin can perform this action.
        """
        # resource check
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        group_id = int(group_id)
        group = ccnet_api.get_group(group_id)
        if not group or get_org_id_by_group(group_id) != org_id:
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        emails = request.POST.getlist('email', '')
        if not emails:
            error_msg = 'Email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        result = {}
        result['failed'] = []
        result['success'] = []
        emails_need_add = []

        for email in emails:
            try:
                User.objects.get(email=email)
            except User.DoesNotExist:
                result['failed'].append({
                    'email': email,
                    'error_msg': 'User %s not found.' % email
                    })
                continue

            if is_group_member(group_id, email, in_structure=False):
                result['failed'].append({
                    'email': email,
                    'error_msg': 'User %s is already a group member.' % email2nickname(email)
                    })
                continue

            emails_need_add.append(email)
        # Add user to group.
        for email in emails_need_add:
            try:
                ccnet_api.group_add_member(group_id, group.creator_name, email)
                member_info = get_group_member_info(request, group_id, email)
                result['success'].append(member_info)
            except Exception as e:
                logger.error(e)
                result['failed'].append({
                    'email': email,
                    'error_msg': 'Internal Server Error'
                    })

            add_user_to_group.send(sender=None,
                                   group_staff=request.user.username,
                                   group_id=group_id,
                                   added_user=email)

            admin_op_detail = {
                'id': group_id,
                'name': group.group_name,
                'user': email
            }
            admin_operation.send(sender=None, admin_name=request.user.username,
                                 operation=GROUP_MEMBER_ADD, detail=admin_op_detail)

        return Response(result)


class AdminGroupMember(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsOrgAdmin, IsProVersion)

    @check_org_admin
    def put(self, request, org_id, group_id, email, format=None):
        """ update role of a group member

        Permission checking:
        1. only admin can perform this action.
        """
        # resource check
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        group_id = int(group_id)
        group = ccnet_api.get_group(group_id)
        if not group or get_org_id_by_group(group_id) != org_id:
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            if not is_group_member(group_id, email):
                error_msg = 'Email %s invalid.' % email
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        is_admin = request.data.get('is_admin', '')
        try:
            # set/unset a specific group member as admin
            if is_admin.lower() == 'true':
                ccnet_api.group_set_admin(group_id, email)
            elif is_admin.lower() == 'false':
                ccnet_api.group_unset_admin(group_id, email)
            else:
                error_msg = 'is_admin invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        member_info = get_group_member_info(request, group_id, email)
        return Response(member_info)

    @check_org_admin
    def delete(self, request, org_id, group_id, email, format=None):
        """ Delete an user from group

        Permission checking:
        1. only admin can perform this action.
        """
        # resource check
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        group_id = int(group_id)
        group = ccnet_api.get_group(group_id)
        if not group or get_org_id_by_group(group_id) != org_id:
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        if group.creator_name == email:
            error_msg = '%s is group owner, can not be removed.' % email
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # delete member from group
        try:
            if not is_group_member(group_id, email):
                return Response({'success': True})
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        try:
            ccnet_api.group_remove_member(group_id, group.creator_name, email)
            # remove repo-group share info of all 'email' owned repos
            seafile_api.remove_group_repos_by_owner(group_id, email)
            admin_op_detail = {
                'id': group_id,
                'name': group.group_name,
                'user': email
            }
            admin_operation.send(sender=None, admin_name=request.user.username,
                                 operation=GROUP_MEMBER_DELETE, detail=admin_op_detail)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
