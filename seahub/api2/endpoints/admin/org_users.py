# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from constance import config
from seaserv import ccnet_api

from seahub.utils import clear_token, is_valid_email
from seahub.utils.licenseparse import user_number_over_limit
from seahub.base.accounts import User
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.profile.models import Profile
from seahub.options.models import UserOptions
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.api2.permissions import IsProVersion

try:
    from seahub.settings import ORG_MEMBER_QUOTA_ENABLED
except ImportError:
    ORG_MEMBER_QUOTA_ENABLED= False

logger = logging.getLogger(__name__)

def get_org_user_info(org_id, user_obj):
    user_info = {}
    email = user_obj.username
    user_info['org_id'] = org_id
    user_info['active'] = user_obj.is_active
    user_info['email'] = email
    user_info['name'] = email2nickname(email)
    user_info['contact_email'] = Profile.objects.get_contact_email_by_user(email)

    return user_info

class AdminOrgUsers(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser, IsProVersion)

    def post(self, request, org_id):
        """ Add new user to org.

        Permission checking:
        1. only admin can perform this action.
        """
        # argument check
        org_id = int(org_id)
        if org_id == 0:
            error_msg = 'org_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %d not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        email = request.POST.get('email', None)
        if not email or not is_valid_email(email):
            error_msg = 'email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        password = request.POST.get('password', None)
        if not password:
            error_msg = 'password invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            User.objects.get(email=email)
            user_exists = True
        except User.DoesNotExist:
            user_exists = False

        if user_exists:
            error_msg = 'User %s already exists.' % email
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # check user number limit by license
        if user_number_over_limit():
            error_msg = 'The number of users exceeds the limit.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # check user number limit by org member quota
        org_members = len(ccnet_api.get_org_emailusers(org.url_prefix, -1, -1))
        if ORG_MEMBER_QUOTA_ENABLED:
            from seahub_extra.organizations.models import OrgMemberQuota
            org_members_quota = OrgMemberQuota.objects.get_quota(org_id)
            if org_members_quota is not None and org_members >= org_members_quota:
                error_msg = 'Failed. You can only invite %d members.' % org_members_quota
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # create user
        try:
            user = User.objects.create_user(email,
                    password, is_staff=False, is_active=True)
        except User.DoesNotExist as e:
            logger.error(e)
            error_msg = 'Fail to add user %s.' % email
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # add user to org
        # set `is_staff` parameter as `0`
        try:
            ccnet_api.add_org_user(org_id, email, 0)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        name = request.POST.get('name', None)
        if name:
            Profile.objects.add_or_update(email, name)

        if config.FORCE_PASSWORD_CHANGE:
            UserOptions.objects.set_force_passwd_change(email)

        user_info = get_org_user_info(org_id, user)
        return Response(user_info)


class AdminOrgUser(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser, IsProVersion)

    def put(self, request, org_id, email):
        """ update active of a org user

        Permission checking:
        1. only admin can perform this action.
        """

        # argument check
        org_id = int(org_id)
        if org_id == 0:
            error_msg = 'org_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            org = ccnet_api.get_org_by_id(org_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not org:
            error_msg = 'Organization %d not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        active = request.data.get('active', None)
        if not active:
            error_msg = 'active invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if active.lower() not in ('true', 'false'):
            error_msg = "active invalid, should be 'true' or 'false'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        active_user = True if active.lower() == 'true' else False

        try:
            if active_user:
                user.is_active = True
            else:
                user.is_active = False

            # update user status
            result_code = user.save()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if result_code == -1:
            error_msg = 'Fail to add user %s.' % email
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # clear web api and repo sync token
        # when inactive an user
        try:
            if not active_user:
                clear_token(email)
        except Exception as e:
            logger.error(e)

        user_info = get_org_user_info(org_id, user)
        return Response(user_info)

    def delete(self, request, org_id, email):
        """ Delete an user from org

        Permission checking:
        1. only admin can perform this action.
        """
        # argument check
        org_id = int(org_id)
        if org_id == 0:
            error_msg = 'org_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %d not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if org.creator == email:
            error_msg = 'Failed to delete: %s is an organization creator.' % email
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            ccnet_api.remove_org_user(org_id, email)
            user.delete()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
