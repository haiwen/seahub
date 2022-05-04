# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status


from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, get_token_v1

from seahub.base.accounts import User

logger = logging.getLogger(__name__)


class AdminGenerateUserAuthToken(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def post(self, request):

        email = request.data.get('email')
        if not email:
            error_msg = 'email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not user.is_active:
            error_msg = 'User %s is not active.' % email
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            token = get_token_v1(email)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        result = {
            'token': token.key
        }

        return Response(result)
