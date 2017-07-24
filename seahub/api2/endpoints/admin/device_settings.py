# Copyright (c) 2012-2016 Seafile Ltd.

from django.conf import settings
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.settings import ENABLE_LIMIT_IPADDRESS

from seahub.utils import is_pro_version


def check_parameter(func):
    def _decorated(view, request, *args, **kwargs):
        if not is_pro_version() or not ENABLE_LIMIT_IPADDRESS:
            error_msg = 'Feature disabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if request.method in ["DELETE", "POST"]:
            ipaddress = request.POST.get('ipaddress', '')
            if not ipaddress:
                error_msg = 'ip address can not be empty'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            ipaddress = ipaddress.split('.')
            valid_num = len(filter(lambda x: x > 0 and x < 255, \
                                   map(int, filter(lambda x: x.isdigit(),
                                                   ipaddress))))

            if len(ipaddress) != 4 or valid_num != 4:
                error_msg = "ip address invalid"
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        return func(view, request, *args, **kwargs)
    return _decorated


class AdminDeviceAccessibleIpSetting(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle, )
    permission_classes = (IsAdminUser,)

    @check_parameter
    def get(self, request, format=None):
        return_results = []
        accessible_ip = settings.ACCESSIBLE_IPADDRESS_RANGE
        for ip in accessible_ip:
            return_results.append({'ip_address': ip})
        return Response(return_results)

    @check_parameter
    def post(self, request, format=None):
        accessible_ip = list(settings.ACCESSIBLE_IPADDRESS_RANGE)
        new_ip = request.POST.get('ipaddress')
        if new_ip not in accessible_ip:
            accessible_ip.append(new_ip)
            settings.ACCESSIBLE_IPADDRESS_RANGE = tuple(accessible_ip)
            return Response({'ip': new_ip}, status=status.HTTP_201_CREATED)
        return Response({'ip': new_ip}, status=status.HTTP_200_OK)

    @check_parameter
    def delete(self, request, format=None):
        accessible_ip = list(settings.ACCESSIBLE_IPADDRESS_RANGE)
        new_ip = request.POST.get('ipaddress')
        if new_ip in accessible_ip:
            accessible_ip.remove(new_ip)
            settings.ACCESSIBLE_IPADDRESS_RANGE = tuple(accessible_ip)
        return Response({}, status=status.HTTP_200_OK)
