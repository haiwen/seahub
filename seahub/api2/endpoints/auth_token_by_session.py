# Copyright (c) 2012-2016 Seafile Ltd.
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import get_token_v1, api_error

from seahub.settings import ENABLE_GET_AUTH_TOKEN_BY_SESSION


class AuthTokenBySession(APIView):
    """ Get user's auth token.
    """

    authentication_classes = (SessionAuthentication,)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):

        if not ENABLE_GET_AUTH_TOKEN_BY_SESSION:
            error_msg = 'Feature is not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        token = get_token_v1(request.user.username)

        return Response({'token': token.key})
