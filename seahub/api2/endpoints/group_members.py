import logging

from django.utils.translation import ugettext as _

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

import seaserv
from seaserv import seafile_api
from pysearpc import SearpcError

from seahub.profile.models import Profile
from seahub.api2.utils import api_error
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.avatar.settings import AVATAR_DEFAULT_SIZE
from seahub.avatar.templatetags.avatar_tags import api_avatar_url, \
    get_default_avatar_url
from seahub.utils import is_valid_username, string2list, is_org_context
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.base.accounts import User

from .utils import api_check_group_member, api_check_group_staff

logger = logging.getLogger(__name__)

def get_group_member_info(request, group_id, email, avatar_size=AVATAR_DEFAULT_SIZE):
    p = Profile.objects.get_profile_by_user(email)
    if p:
        login_id = p.login_id if p.login_id else ''
    else:
        login_id = ''

    try:
        avatar_url, is_default, date_uploaded = api_avatar_url(email, avatar_size)
    except Exception as e:
        logger.error(e)
        avatar_url = get_default_avatar_url()

    is_admin = seaserv.check_group_staff(group_id, email)
    member_info = {
        "name": email2nickname(email),
        'email': email,
        "contact_email": Profile.objects.get_contact_email_by_user(email),
        "login_id": login_id,
        "avatar_url": request.build_absolute_uri(avatar_url),
        "is_admin": is_admin,
    }

    return member_info


class GroupMembers(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    @api_check_group_member
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
            members = seaserv.get_group_members(group_id)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        is_admin = request.GET.get('is_admin', 'false')
        if is_admin.lower() not in ('true', 'false'):
            error_msg = 'is_admin invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        group_members = []
        for m in members:
            # only return group admins
            if is_admin == 'true' and not m.is_staff:
                continue

            member_info = get_group_member_info(request, group_id, m.user_name, avatar_size)
            group_members.append(member_info)

        return Response(group_members)

    @api_check_group_staff
    def post(self, request, group_id):
        """
        Add a group member.
        """
        username = request.user.username
        email = request.data.get('email', None)

        try:
            User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = 'Email %s invalid.' % email
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            seaserv.ccnet_threaded_rpc.group_add_member(group_id, username, email)
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

    @api_check_group_member
    def get(self, request, group_id, email):
        """
        Get info of a specific group member.
        """
        try:
            avatar_size = int(request.GET.get('avatar_size',
                AVATAR_DEFAULT_SIZE))
        except ValueError:
            avatar_size = AVATAR_DEFAULT_SIZE

        member_info = get_group_member_info(request, group_id, email, avatar_size)

        return Response(member_info)

    @api_check_group_staff
    def put(self, request, group_id, email):
        """
        Set/unset a specific group member as admin.
        """

        is_admin = request.data.get('is_admin', '')
        if is_admin.lower() == 'true':
            try:
                seaserv.ccnet_threaded_rpc.group_set_admin(group_id, email)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        elif is_admin.lower() == 'false':
            try:
                seaserv.ccnet_threaded_rpc.group_unset_admin(group_id, email)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        else:
            error_msg = 'is_admin invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        member_info = get_group_member_info(request, group_id, email)

        return Response(member_info)

    @api_check_group_member
    def delete(self, request, group_id, email):
        """
        Delete a group member.
        """
        username = request.user.username

        if not is_valid_username(email):
            error_msg = 'Email %s invalid.' % email
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if username == email:
            # user leave group
            try:
                seaserv.ccnet_threaded_rpc.quit_group(group_id, username)
                seafile_api.remove_group_repos_by_owner(group_id, email)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        else:
            # admin delete group memeber
            try:
                if not seaserv.check_group_staff(group_id, username):
                    error_msg = 'Permission denied.'
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)

                seaserv.ccnet_threaded_rpc.group_remove_member(group_id, username, email)
                seafile_api.remove_group_repos_by_owner(group_id, email)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class GroupMembersBulk(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    @api_check_group_staff
    def post(self, request, group_id):
        """
        Bulk add group members.
        """
        username = request.user.username

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
            try:
                User.objects.get(email=email)
            except User.DoesNotExist:
                result['failed'].append({
                    'email': email,
                    'error_msg': 'Email %s invalid.' % email
                    })
                continue

            if seaserv.is_group_user(group_id, email):
                result['failed'].append({
                    'email': email,
                    'error_msg': _(u'User %s is already a group member.') % email
                    })
                continue

            # Can only invite organization users to group
            if org_id and not \
                seaserv.ccnet_threaded_rpc.org_user_exists(org_id, email):
                result['failed'].append({
                    'email': email,
                    'error_msg': _(u'User %s not found in organizaiont.') % email
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

        return Response(result)
