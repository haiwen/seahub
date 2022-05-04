# Copyright (c) 2012-2016 Seafile Ltd.
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.api2.models import Token

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

        username = request.user.username
        try:
            token_obj = Token.objects.get(user=username)
            token = token_obj.key
        except Token.DoesNotExist:
            token = ''

        return Response({'token': token})

    def post(self, request):

        if not ENABLE_GET_AUTH_TOKEN_BY_SESSION:
            error_msg = 'Feature is not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.user.username
        if len(Token.objects.filter(user=username)) > 0:
            return api_error(status.HTTP_409_CONFLICT, 'Token already exists.')

        token_obj = Token.objects.add_or_update(username)
        return Response({'token': token_obj.key})

    def delete(self, request):

        if not ENABLE_GET_AUTH_TOKEN_BY_SESSION:
            error_msg = 'Feature is not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.user.username
        Token.objects.filter(user=username).delete()

        return Response({'success': True})
