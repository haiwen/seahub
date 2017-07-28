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
from seahub.admin_log.models import USER_DELETE
from seahub.admin_log.signals import admin_operation

logger = logging.getLogger(__name__)


class AdminUsersBatch(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def post(self, request):
        """ Set user quota / delete users in batch.

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
            error_msg = "operation can only be 'set-quota' or 'delete-user'."
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
            institution_name = request.POST.get('institution_name', None)
            if institution_name is None:
                error_msg = 'institution name can not be blank.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            emails = [email.strip() for email in emails if email.strip()]
            if institution_name != '':
                try:
                    obj_insti = Institution.objects.get(name=institution_name)
                except Institution.DoesNotExist:
                    error_msg = 'institution %s does not exists' % institution_name
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            for email in emails:
                try:
                    User.objects.get(email=email)
                except User.DoesNotExist:
                    continue

            for email in emails:
                profile = Profile.objects.get_profile_by_user(email)
                if profile is None:
                    profile = Profile(user=email)
                profile.institution = institution_name
                profile.save()

        return Response(result)
