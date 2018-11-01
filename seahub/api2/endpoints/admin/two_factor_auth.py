# Copyright (c) 2012-2016 Seafile Ltd.
from rest_framework import status
from rest_framework.permissions import IsAdminUser
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response

from seahub.base.accounts import User
from seahub.api2.base import APIView
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import json_response, api_error
from seahub.api2.authentication import TokenAuthentication
from seahub.options.models import UserOptions
from seahub.two_factor.models import devices_for_user


class TwoFactorAuthView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def put(self, request, email):
        """Set/unset force 2FA for the user `email`.
        """
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = "User %s not found" % email
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        force_2fa = request.data.get('force_2fa', None)
        if force_2fa == '1':
            UserOptions.objects.set_force_2fa(email)
        if force_2fa == '0':
            UserOptions.objects.unset_force_2fa(email)

        return Response({'success': True}, status=status.HTTP_200_OK)

    def delete(self, request, email):
        if not email:
            error_msg = "email can not be empty"
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = "User %s not found" % email
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        devices = devices_for_user(user)
        if devices:
            for device in devices:
                device.delete()
        return Response({'success': True}, status=status.HTTP_200_OK)
