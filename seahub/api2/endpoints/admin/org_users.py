# Copyright (c) 2012-2016 Seafile Ltd.
import logging
from types import FunctionType

from django.utils.translation import gettext as _
from seahub.utils.ccnet_db import CcnetDB
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from constance import config
from seaserv import ccnet_api, seafile_api

from seahub.settings import INIT_PASSWD, SEND_EMAIL_ON_RESETTING_USER_PASSWD
from seahub.base.models import UserLastLogin
from seahub.utils import is_valid_email, is_valid_username, IS_EMAIL_CONFIGURED, \
    send_html_email, get_site_name
from seahub.utils.licenseparse import user_number_over_limit
from seahub.utils.file_size import get_file_size_unit
from seahub.auth.utils import get_virtual_id_by_email
from seahub.base.accounts import User
from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email
from seahub.profile.models import Profile
from seahub.options.models import UserOptions
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.api2.permissions import IsProVersion
from seahub.api2.endpoints.utils import is_org_user
from seahub.utils.timeutils import timestamp_to_isoformat_timestr, \
        datetime_to_isoformat_timestr
from seahub.utils.db_api import SeafileDB
from seahub.share.models import ExtraSharePermission
from seahub.organizations.models import OrgMemberQuota

try:
    from seahub.settings import ORG_MEMBER_QUOTA_ENABLED
except ImportError:
    ORG_MEMBER_QUOTA_ENABLED= False

logger = logging.getLogger(__name__)

def get_org_user_info(org_id, user_obj):
    email = user_obj.email
    user_info = {}

    user_info['org_id'] = org_id
    user_info['email'] = email
    user_info['name'] = email2nickname(email)
    user_info['contact_email'] = email2contact_email(email)

    org_user_quota = seafile_api.get_org_user_quota(org_id, email)
    user_info['quota_total'] = org_user_quota

    org_user_quota_usage = seafile_api.get_org_user_quota_usage(org_id, email)
    user_info['quota_usage'] = org_user_quota_usage

    user_info['create_time'] = timestamp_to_isoformat_timestr(user_obj.ctime)

    user_info['last_login'] = ''
    last_login = UserLastLogin.objects.get_by_username(email).last_login \
            if UserLastLogin.objects.get_by_username(email) else ''
    if last_login:
        user_info['last_login'] = datetime_to_isoformat_timestr(last_login)

    user_info['is_org_staff'] = True if ccnet_api.is_org_staff(org_id, email) == 1 else False

    return user_info

def check_org_user(func):
    """
    Decorator for check if org user valid
    """
    def _decorated(view, request, org_id, email):

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

        # resource check
        if not org:
            error_msg = 'Organization %d not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not is_org_user(email, org_id):
            error_msg = 'User %s is not member of organization %s.' \
                    % (email, org.org_name)
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        return func(view, request, org_id, email)

    return _decorated

class AdminOrgUsers(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser, IsProVersion)

    def get(self, request, org_id):
        """ Get all users in an org.

        Permission checking:
        1. only admin can perform this action.
        """

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # argument check
        org_id = int(org_id)
        if org_id == 0:
            error_msg = 'org_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %d not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        result = []
        org_users = ccnet_api.get_org_emailusers(org.url_prefix, -1, -1)
        for org_user in org_users:
            user_info = get_org_user_info(org_id, org_user)
            user_info['active'] = org_user.is_active
            result.append(user_info)

        return Response({'users': result})

    def post(self, request, org_id):
        """ Add new user to org.

        Permission checking:
        1. only admin can perform this action.
        """

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

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

        active = request.POST.get('active', 'true')
        active = active.lower()
        if active not in ('true', 'false'):
            error_msg = 'active invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        is_active = active == 'true'

        vid = get_virtual_id_by_email(email)
        try:
            User.objects.get(email=vid)
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
        org_members = ccnet_api.get_org_emailusers(org.url_prefix, -1, -1)
        org_active_members = [member for member in org_members if member.is_active]
        org_active_members_count = len(org_active_members)
        if ORG_MEMBER_QUOTA_ENABLED:
            org_members_quota = OrgMemberQuota.objects.get_quota(org_id)
            if org_members_quota is not None and org_active_members_count >= org_members_quota:
                error_msg = 'The number of users exceeds the limit.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # create user
        try:
            user = User.objects.create_user(email, password, is_staff=False,
                    is_active=is_active)
        except User.DoesNotExist as e:
            logger.error(e)
            error_msg = 'Fail to add user %s.' % email
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # add user to org
        # set `is_staff` parameter as `0`
        try:
            ccnet_api.add_org_user(org_id, user.email, 0)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        name = request.POST.get('name', None)
        if name:
            Profile.objects.add_or_update(user.email, name)

        if config.FORCE_PASSWORD_CHANGE:
            UserOptions.objects.set_force_passwd_change(user.email)

        user_info = get_org_user_info(org_id, user)
        user_info['active'] = is_active
        return Response(user_info)


class AdminOrgUser(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser, IsProVersion)

    @check_org_user
    def get(self, request, org_id, email):
        """ get base info of a org user

        Permission checking:
        1. only admin can perform this action.
        """

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

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
            user_obj = User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        user_info = get_org_user_info(org_id, user_obj)
        user_info['active'] = user_obj.is_active
        return Response(user_info)

    @check_org_user
    def put(self, request, org_id, email):
        """ update base info of a org user

        Permission checking:
        1. only admin can perform this action.
        """

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')
        
        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %d not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # update active
        active = request.data.get('active', None)
        if active:
            active = active.lower()
            if active not in ('true', 'false'):
                error_msg = "active invalid, should be 'true' or 'false'."
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if active == 'true':
                if not user.is_active and ORG_MEMBER_QUOTA_ENABLED:
                    org_members = ccnet_api.get_org_emailusers(org.url_prefix, -1, -1)
                    org_active_members = [member for member in org_members if member.is_active]
                    org_active_members_count = len(org_active_members)
                    org_members_quota = OrgMemberQuota.objects.get_quota(org_id)
                    if org_members_quota is not None and org_active_members_count >= org_members_quota:
                        err_msg = 'The number of users exceeds the limit.'
                        return api_error(status.HTTP_403_FORBIDDEN, err_msg)
                user.is_active = True
            else:
                user.is_active = False

            keep_sharing = request.data.get("keep_sharing", None)
            username = request.user.username
            if keep_sharing and keep_sharing == 'false':
                seafile_db = SeafileDB()
                orgs = ccnet_api.get_orgs_by_user(email)
                if orgs:
                    org_id = orgs[0].org_id
                    seafile_db.delete_received_share_by_user(email, org_id)
                    seafile_db.delete_share_by_user(email, org_id)
                else:
                    seafile_db.delete_received_share_by_user(email)
                    seafile_db.delete_share_by_user(email)
                ExtraSharePermission.objects.filter(share_to=username).delete()

            try:
                # update user status
                result_code = user.save()
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            if result_code == -1:
                error_msg = 'Fail to update user %s.' % email
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # update name
        name = request.data.get('name', None)
        if name:
            profile = Profile.objects.get_profile_by_user(email)
            if profile is None:
                profile = Profile(user=email)
            profile.nickname = name
            profile.save()

        # update contact_email
        contact_email = request.data.get('contact_email', None)
        if contact_email:
            profile = Profile.objects.get_profile_by_user(email)
            if profile is None:
                profile = Profile(user=email)
            profile.contact_email = contact_email
            profile.save()

        # update user quota
        user_quota_mb = request.data.get("quota_total", None)
        if user_quota_mb:
            try:
                user_quota_mb = int(user_quota_mb)
            except Exception as e:
                logger.error(e)
                error_msg = "quota_total invalid."
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            user_quota = int(user_quota_mb) * get_file_size_unit('MB')

            org_quota = seafile_api.get_org_quota(org_id)

            # -1 means org has unlimited quota
            if org_quota > 0:
                org_quota_mb = org_quota / get_file_size_unit('MB')
                if user_quota_mb > org_quota_mb:
                    error_msg = 'Failed to set quota: maximum quota is %d MB' % org_quota_mb
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            seafile_api.set_org_user_quota(org_id, email, user_quota)

        # update is_org_staff
        is_org_staff = request.data.get("is_org_staff", '')
        if is_org_staff:

            is_org_staff = is_org_staff.lower()
            if is_org_staff not in ('true', 'false'):
                error_msg = 'is_org_staff invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if is_org_staff == 'true':
                if ccnet_api.is_org_staff(org_id, email):
                    error_msg = '%s is already organization staff.' % email
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

                ccnet_api.set_org_staff(org_id, email)
            else:
                if not ccnet_api.is_org_staff(org_id, email):
                    error_msg = '%s is not organization staff.' % email
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

                ccnet_api.unset_org_staff(org_id, email)

        user_info = get_org_user_info(org_id, user)
        user_info['active'] = user.is_active
        return Response(user_info)

    @check_org_user
    def delete(self, request, org_id, email):
        """ Delete an user from org

        Permission checking:
        1. only admin can perform this action.
        """

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        org = ccnet_api.get_org_by_id(org_id)
        if org.creator == email:
            error_msg = 'Failed to delete: %s is an organization creator.' % email
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            ccnet_api.remove_org_user(org_id, email)
            User.objects.get(email=email).delete()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class AdminOrgAdminUsers(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser, IsProVersion)

    def get(self, request, org_id):

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # argument check
        org_id = int(org_id)
        if org_id == 0:
            error_msg = 'org_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %d not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        ccnet_db = CcnetDB()
        staff = ccnet_db.get_org_staffs(int(org_id))

        result = []
        for email in staff:
            org_user = User.objects.get(email=email)
            user_info = get_org_user_info(org_id, org_user)
            user_info['active'] = org_user.is_active
            result.append(user_info)

        return Response({'users': result})
