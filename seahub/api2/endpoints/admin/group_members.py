# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api, ccnet_api

from seahub.base.models import GROUP_INVITE_DELETE
from seahub.group.utils import get_group_member_info, is_group_member, get_group_members_info
from seahub.group.signals import add_user_to_group
from seahub.avatar.settings import AVATAR_DEFAULT_SIZE
from seahub.base.accounts import User
from seahub.base.templatetags.seahub_tags import email2nickname

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.signals import group_invite_log

logger = logging.getLogger(__name__)


class AdminGroupMembers(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def get(self, request, group_id, format=None):
        """ List all group members

        Permission checking:
        1. only admin can perform this action.
        """

        if not request.user.admin_permissions.can_manage_group():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        group_id = int(group_id)
        group = ccnet_api.get_group(group_id)
        if not group:
            error_msg = 'Group %d not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        is_org = ccnet_api.is_org_group(group_id)
        if is_org:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

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

    def post(self, request, group_id):
        """
        Bulk add group members.

        Permission checking:
        1. only admin can perform this action.
        """

        if not request.user.admin_permissions.can_manage_group():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # argument check
        group_id = int(group_id)
        group = ccnet_api.get_group(group_id)
        if not group:
            error_msg = 'Group %d not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        is_org = ccnet_api.is_org_group(group_id)
        if is_org:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

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
        emails_added = []
        for email in emails_need_add:
            try:
                ccnet_api.group_add_member(group_id, group.creator_name, email)
                member_info = get_group_member_info(request, group_id, email)
                result['success'].append(member_info)
                emails_added.append(email)
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

        group_invite_log.send(sender=None,
                              org_id=-1,
                              group_id=group_id,
                              users=emails_added,
                              operator=request.user.username,
                              operation=GROUP_INVITE_DELETE)

        return Response(result)


class AdminGroupMember(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def put(self, request, group_id, email, format=None):
        """ update role of a group member

        Permission checking:
        1. only admin can perform this action.
        """

        if not request.user.admin_permissions.can_manage_group():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # argument check
        group_id = int(group_id)
        group = ccnet_api.get_group(group_id)
        if not group:
            error_msg = 'Group %d not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        is_org = ccnet_api.is_org_group(group_id)
        if is_org:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

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

    def delete(self, request, group_id, email, format=None):
        """ Delete an user from group

        Permission checking:
        1. only admin can perform this action.
        """

        if not request.user.admin_permissions.can_manage_group():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # argument check
        group_id = int(group_id)
        group = ccnet_api.get_group(group_id)
        if not group:
            error_msg = 'Group %d not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        is_org = ccnet_api.is_org_group(group_id)
        if is_org:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # delete member from group
        try:
            if not is_group_member(group_id, email):
                return Response({'success': True})
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if group.creator_name == email:
            error_msg = '%s is group owner, can not be removed.' % email
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            ccnet_api.group_remove_member(group_id, group.creator_name, email)
            # remove repo-group share info of all 'email' owned repos
            seafile_api.remove_group_repos_by_owner(group_id, email)
            group_invite_log.send(sender=None,
                                  org_id=-1,
                                  group_id=group_id,
                                  users=[email],
                                  operator=request.user.username,
                                  operation=GROUP_INVITE_DELETE)
            
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
