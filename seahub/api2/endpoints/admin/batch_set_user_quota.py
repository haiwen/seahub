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
from seahub.utils.file_size import get_file_size_unit

logger = logging.getLogger(__name__)


class AdminUsersBatchSetQuota(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def put(self, request):
        """ Set user quota in batch.

        Permission checking:
        1. admin user.
        """

        # argument check
        emails = request.data.getlist('email', None)
        if not emails:
            error_msg = 'email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        space_quota_mb = request.data.get('storage', None)
        if not space_quota_mb:
            error_msg = 'storage invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            space_quota_mb = int(space_quota_mb)
        except ValueError:
            error_msg = _('must be an integer that is greater than or equal to 0.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if space_quota_mb < 0:
            error_msg = _('Space quota is too low (minimum value is 0)')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        space_quota = space_quota_mb * get_file_size_unit('MB')

        result = {}
        result['failed'] = []
        result['success'] = []
        for email in emails:
            try:
                User.objects.get(email=email)
            except User.DoesNotExist:
                result['failed'].append({
                    'email': email,
                    'error_msg': 'User %s not found.' % email
                    })
                continue

            try:
                seafile_api.set_user_quota(email, space_quota)
            except Exception as e:
                logger.error(e)
                result['failed'].append({
                    'email': email,
                    'error_msg': 'Internal Server Error'
                    })
                continue

            result['success'].append({
                'email': email,
                'total': seafile_api.get_user_quota(email),
            })

        return Response(result)
