# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

from seahub.views.modules import MOD_PERSONAL_WIKI, enable_mod_for_user, \
    disable_mod_for_user

logger = logging.getLogger(__name__)
json_content_type = 'application/json; charset=utf-8'

class UserEnabledModulesView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        """ currently only used for add personal wiki module

        Permission checking:
        1. login user.
        2. user can add repo
        """

        if not request.user.permissions.can_add_repo():
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.user.username
        try:
            enable_mod_for_user(username, MOD_PERSONAL_WIKI)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})

    def delete(self, request):
        """ currently only used for delete personal wiki module

        Permission checking:
        1. login user.
        2. user can add repo
        """

        if not request.user.permissions.can_add_repo():
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.user.username
        try:
            disable_mod_for_user(username, MOD_PERSONAL_WIKI)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
