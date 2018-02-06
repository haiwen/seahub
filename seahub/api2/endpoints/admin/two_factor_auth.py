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
from seahub.two_factor.models import devices_for_user


class TwoFactorAuthView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

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
