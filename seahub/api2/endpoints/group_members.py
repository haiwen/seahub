# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from django.utils.translation import ugettext as _

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

import seaserv
from seaserv import seafile_api, ccnet_api
from pysearpc import SearpcError

from seahub.api2.utils import api_error
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.avatar.settings import AVATAR_DEFAULT_SIZE
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.utils import string2list, is_org_context
from seahub.base.accounts import User
from seahub.group.signals import add_user_to_group
from seahub.group.utils import is_group_member, is_group_admin, \
    is_group_owner, is_group_admin_or_owner, get_group_member_info

from .utils import api_check_group

logger = logging.getLogger(__name__)

class GroupMembers(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    @api_check_group
    def get(self, request, group_id, format=None):
        """
        Get all group members.
        """

        try:
            avatar_size = int(request.GET.get('avatar_size',
                AVATAR_DEFAULT_SIZE))
        except ValueError:
            avatar_size = AVATAR_DEFAULT_SIZE

        try:
            # only group member can get info of all group members
            if not is_group_member(group_id, request.user.username):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            members = ccnet_api.get_group_members(group_id)

        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        group_members = []
        is_admin = request.GET.get('is_admin', 'false')
        for m in members:
            # only return group admins
            if is_admin == 'true' and not m.is_staff:
                continue

            member_info = get_group_member_info(request, group_id, m.user_name, avatar_size)
            group_members.append(member_info)

        return Response(group_members)

    @api_check_group
    def post(self, request, group_id):
        """
        Add a group member.
        """
        username = request.user.username

        # only group owner/admin can add a group member
        if not is_group_admin_or_owner(group_id, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        email = request.data.get('email', None)
        try:
            User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            if is_group_member(group_id, email):
                error_msg = _(u'User %s is already a group member.') % email2nickname(email)
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if is_org_context(request):
                org_id = request.user.org.org_id
                if not ccnet_api.org_user_exists(org_id, email):
                    error_msg = _(u'User %s not found in organization.') % email2nickname(email)
                    return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            ccnet_api.group_add_member(group_id, username, email)
            add_user_to_group.send(sender=None,
                                   group_staff=username,
                                   group_id=group_id,
                                   added_user=email)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        member_info = get_group_member_info(request, group_id, email)

        return Response(member_info, status=status.HTTP_201_CREATED)


class GroupMember(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    @api_check_group
    def get(self, request, group_id, email):
        """
        Get info of a specific group member.
        """
        try:
            # only group member can get info of a specific group member
            if not is_group_member(group_id, request.user.username):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            if not is_group_member(group_id, email):
                error_msg = 'Email %s invalid.' % email
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        try:
            avatar_size = int(request.GET.get('avatar_size',
                AVATAR_DEFAULT_SIZE))
        except ValueError:
            avatar_size = AVATAR_DEFAULT_SIZE

        member_info = get_group_member_info(request, group_id, email, avatar_size)

        return Response(member_info)

    @api_check_group
    def put(self, request, group_id, email):
        """
        Set/unset a specific group member as admin.
        """

        username = request.user.username
        is_admin = request.data.get('is_admin', '')
        try:
            # only group owner can set/unset a specific group member as admin
            if not is_group_owner(group_id, username):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            if not is_group_member(group_id, email):
                error_msg = 'Email %s invalid.' % email
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            # set/unset a specific group member as admin
            if is_admin.lower() == 'true':
                ccnet_api.group_set_admin(group_id, email)
            elif is_admin.lower() == 'false':
                ccnet_api.group_unset_admin(group_id, email)
            else:
                error_msg = 'is_admin invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        member_info = get_group_member_info(request, group_id, email)

        return Response(member_info)

    @api_check_group
    def delete(self, request, group_id, email):
        """
        User leave group or group owner/admin delete a group member.
        """

        try:
            if not is_group_member(group_id, email):
                error_msg = 'Email %s invalid.' % email
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        username = request.user.username
        # user leave group
        if username == email:
            try:
                ccnet_api.quit_group(group_id, username)
                # remove repo-group share info of all 'email' owned repos
                seafile_api.remove_group_repos_by_owner(group_id, email)
                return Response({'success': True})
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # group owner/admin delete a group member
        try:
            if is_group_owner(group_id, username):
                # group owner can delete all group member
                ccnet_api.group_remove_member(group_id, username, email)
                seafile_api.remove_group_repos_by_owner(group_id, email)
                return Response({'success': True})

            elif is_group_admin(group_id, username):
                # group admin can NOT delete group owner/admin
                if not is_group_admin_or_owner(group_id, email):
                    ccnet_api.group_remove_member(group_id, username, email)
                    seafile_api.remove_group_repos_by_owner(group_id, email)
                    return Response({'success': True})
                else:
                    error_msg = 'Permission denied.'
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            else:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)


class GroupMembersBulk(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    @api_check_group
    def post(self, request, group_id):
        """
        Bulk add group members.
        """
        username = request.user.username
        try:
            if not is_group_admin_or_owner(group_id, username):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        emails_str = request.data.get('emails', '')
        emails_list = string2list(emails_str)
        emails_list = [x.lower() for x in emails_list]

        result = {}
        result['failed'] = []
        result['success'] = []
        emails_need_add = []

        org_id = None
        if is_org_context(request):
            org_id = request.user.org.org_id

        for email in emails_list:
            email_name = email2nickname(email)
            try:
                User.objects.get(email=email)
            except User.DoesNotExist:
                result['failed'].append({
                    'email': email,
                    'email_name': email_name,
                    'error_msg': 'User %s not found.' % email_name
                    })
                continue

            if is_group_member(group_id, email, in_structure=False):
                result['failed'].append({
                    'email': email,
                    'email_name': email_name,
                    'error_msg': _(u'User %s is already a group member.') % email_name
                    })
                continue

            # Can only invite organization users to group
            if org_id and not \
                seaserv.ccnet_threaded_rpc.org_user_exists(org_id, email):
                result['failed'].append({
                    'email': email,
                    'email_name': email_name,
                    'error_msg': _(u'User %s not found in organization.') % email_name
                    })
                continue

            emails_need_add.append(email)

        # Add user to group.
        for email in emails_need_add:
            try:
                seaserv.ccnet_threaded_rpc.group_add_member(group_id,
                    username, email)
                member_info = get_group_member_info(request, group_id, email)
                result['success'].append(member_info)
            except SearpcError as e:
                logger.error(e)
                result['failed'].append({
                    'email': email,
                    'error_msg': 'Internal Server Error'
                    })

            add_user_to_group.send(sender=None,
                                   group_staff=username,
                                   group_id=group_id,
                                   added_user=email)
        return Response(result)
