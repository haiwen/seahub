# Copyright (c) 2012-2016 Seafile Ltd.

import logging
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from django.utils.translation import ugettext as _

from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

from seahub.base.accounts import User
from seahub.profile.models import Profile
from seahub.institutions.models import Institution
from seahub.utils.file_size import get_file_size_unit
from seahub.utils import is_valid_username
from seahub.admin_log.models import USER_DELETE
from seahub.admin_log.signals import admin_operation
from seahub.utils.timeutils import timestamp_to_isoformat_timestr, datetime_to_isoformat_timestr
from seahub.constants import DEFAULT_ADMIN
from seahub.role_permissions.models import AdminRole
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email
from seahub.base.models import UserLastLogin

logger = logging.getLogger(__name__)


class AdminAdminUsersBatch(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def post(self, request):
        """ Add admin in batch
        """
        # argument check
        emails = request.POST.getlist('email', None)
        if not emails:
            error_msg = 'email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        result = {}
        result['failed'] = []
        result['success'] = []
        for email in emails:
            if not is_valid_username(email):
                result['failed'].append({
                    'email': email,
                    'error_msg': 'email %s invalid.' % email
                })
                continue

            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                result['failed'].append({
                    'email': email,
                    'error_msg': 'user %s not found.' % email
                })
                continue

            user.is_staff = True
            try:
                user.save()
            except Exception as e:
                logger.error(e)
                result['failed'].append({
                    'email': email,
                    'error_msg': 'Internal Server Error'
                })
                continue

            profile = Profile.objects.get_profile_by_user(user.email)
            user_info = {}
            user_info['email'] = user.email
            user_info['name'] = email2nickname(user.email)
            user_info['contact_email'] = email2contact_email(user.email)
            user_info['login_id'] = profile.login_id if profile and profile.login_id else ''

            user_info['is_staff'] = user.is_staff
            user_info['is_active'] = user.is_active

            user_info['quota_total'] = seafile_api.get_user_quota(user.email)
            user_info['quota_usage'] = seafile_api.get_user_self_usage(user.email)

            user_info['create_time'] = timestamp_to_isoformat_timestr(user.ctime)
            last_login_obj = UserLastLogin.objects.get_by_username(user.email)
            user_info['last_login'] = datetime_to_isoformat_timestr(last_login_obj.last_login) if last_login_obj else ''

            try:
                admin_role = AdminRole.objects.get_admin_role(user.email)
                user_info['admin_role'] = admin_role.role
            except AdminRole.DoesNotExist:
                user_info['admin_role'] = DEFAULT_ADMIN
            result['success'].append(user_info)

        return Response(result)


class AdminUsersBatch(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def post(self, request):
        """ Set user quota, set user institution, delete users, in batch.

        Permission checking:
        1. admin user.
        """

        # argument check
        emails = request.POST.getlist('email', None)
        if not emails:
            error_msg = 'email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        operation = request.POST.get('operation', None)
        if operation not in ('set-quota', 'delete-user', 'set-institution'):
            error_msg = "operation can only be 'set-quota', 'delete-user', or 'set-institution'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        result = {}
        result['failed'] = []
        result['success'] = []

        existed_users = []
        for email in emails:
            try:
                user = User.objects.get(email=email)
                existed_users.append(user)
            except User.DoesNotExist:
                result['failed'].append({
                    'email': email,
                    'error_msg': 'User %s not found.' % email
                    })
                continue

        if operation == 'set-quota':
            quota_total_mb = request.POST.get('quota_total', None)
            if not quota_total_mb:
                error_msg = 'quota_total invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            try:
                quota_total_mb = int(quota_total_mb)
            except ValueError:
                error_msg = _('must be an integer that is greater than or equal to 0.')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if quota_total_mb < 0:
                error_msg = _('Space quota is too low (minimum value is 0)')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            quota_total_byte = quota_total_mb * get_file_size_unit('MB')

            for user in existed_users:
                email = user.email
                try:
                    seafile_api.set_user_quota(email, quota_total_byte)
                except Exception as e:
                    logger.error(e)
                    result['failed'].append({
                        'email': email,
                        'error_msg': 'Internal Server Error'
                        })
                    continue

                result['success'].append({
                    'email': email,
                    'quota_total': seafile_api.get_user_quota(email),
                })

        if operation == 'delete-user':
            for user in existed_users:
                email = user.email
                try:
                    user.delete()
                except Exception as e:
                    logger.error(e)
                    result['failed'].append({
                        'email': email,
                        'error_msg': 'Internal Server Error'
                        })
                    continue

                result['success'].append({
                    'email': email,
                })

                # send admin operation log signal
                admin_op_detail = {
                    "email": email,
                }
                admin_operation.send(sender=None, admin_name=request.user.username,
                        operation=USER_DELETE, detail=admin_op_detail)

        if operation == 'set-institution':
            institution = request.POST.get('institution', None)
            if institution is None:
                error_msg = 'Institution can not be blank.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if institution != '':
                try:
                    obj_insti = Institution.objects.get(name=institution)
                except Institution.DoesNotExist:
                    error_msg = 'Institution %s does not exist' % institution
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            for user in existed_users:
                email = user.email
                profile = Profile.objects.get_profile_by_user(email)
                if profile is None:
                    profile = Profile(user=email)
                profile.institution = institution
                profile.save()
                result['success'].append({
                    'email': email,
                    'institution': institution
                })

        return Response(result)
