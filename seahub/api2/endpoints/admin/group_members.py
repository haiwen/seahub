# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api, ccnet_api

from seahub.group.utils import get_group_member_info, is_group_member
from seahub.avatar.settings import AVATAR_DEFAULT_SIZE
from seahub.base.accounts import User

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

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

        group_id = int(group_id)
        group = ccnet_api.get_group(group_id)
        if not group:
            error_msg = 'Group %d not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            avatar_size = int(request.GET.get('avatar_size',
                AVATAR_DEFAULT_SIZE))
        except ValueError:
            avatar_size = AVATAR_DEFAULT_SIZE

        try:
            members = ccnet_api.get_group_members(group_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        group_members_info = []
        for m in members:
            member_info = get_group_member_info(request, group_id, m.user_name, avatar_size)
            group_members_info.append(member_info)

        group_members = {
            'group_id': group_id,
            'group_name': group.group_name,
            'members': group_members_info
        }

        return Response(group_members)

    def post(self, request, group_id):
        """
        Bulk add group members.

        Permission checking:
        1. only admin can perform this action.
        """

        # argument check
        group_id = int(group_id)
        group = ccnet_api.get_group(group_id)
        if not group:
            error_msg = 'Group %d not found.' % group_id
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
                    'error_msg': 'User %s is already a group member.' % email
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

        # argument check
        group_id = int(group_id)
        group = ccnet_api.get_group(group_id)
        if not group:
            error_msg = 'Group %d not found.' % group_id
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

    def delete(self, request, group_id, email, format=None):
        """ Delete an user from group

        Permission checking:
        1. only admin can perform this action.
        """

        # argument check
        group_id = int(group_id)
        group = ccnet_api.get_group(group_id)
        if not group:
            error_msg = 'Group %d not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

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
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
