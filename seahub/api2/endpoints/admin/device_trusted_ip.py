# Copyright (c) 2012-2016 Seafile Ltd.
from functools import cmp_to_key

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.core.validators import validate_ipv4_address
from django.core.exceptions import ValidationError
from django.conf import settings

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.permissions import IsProVersion
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.trusted_ip.models import TrustedIP


def cmp_ip(big_ip, small_ip):
    big_ip = big_ip['ip'].split('.')
    small_ip = small_ip['ip'].split('.')
    new_big_ip = []
    for ip in big_ip:
        try:
            new_big_ip.append(int(ip))
        except ValueError:
            new_big_ip.append(ip)
    new_small_ip = []
    for ip in small_ip:
        try:
            new_small_ip.append(int(ip))
        except ValueError:
            new_small_ip.append(ip)
    for i in range(4):
        if isinstance(new_big_ip[i], int) and isinstance(new_small_ip[i], int):
            if new_big_ip[i] > new_small_ip[i]:
                return 1
            elif new_big_ip[i] < new_small_ip[i]:
                return -1
            else:
                if i == 3:
                    return 1
                else:
                    continue
        else:
            if new_big_ip[i] == new_small_ip[i]:
                if i == 3:
                    return 1
                continue
            elif new_big_ip[i] == '*':
                return 1
            else:
                return -1


def check_parameter(func):
    def _decorated(view, request, *args, **kwargs):
        if not settings.ENABLE_LIMIT_IPADDRESS:
            error_msg = 'Feature disabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if request.method in ["DELETE", "POST"]:
            ipaddress = request.data.get('ipaddress', '')
            if not ipaddress:
                error_msg = 'IP address can not be empty.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            try:
                validate_ipv4_address(ipaddress.replace('*', '1'))
            except ValidationError:
                error_msg = "IP address invalid."
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        return func(view, request, *args, **kwargs)
    return _decorated


class AdminDeviceTrustedIP(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle, )
    permission_classes = (IsAdminUser, IsProVersion)

    @check_parameter
    def get(self, request, format=None):

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        ip_list = [ip.to_dict() for ip in TrustedIP.objects.all()]
        ip_list = sorted(ip_list, key=cmp_to_key(cmp_ip))
        return Response(ip_list)

    @check_parameter
    def post(self, request, format=None):

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        new_ip = request.data.get('ipaddress')
        ip_obj, created = TrustedIP.objects.get_or_create(new_ip)
        if created:
            return Response(ip_obj.to_dict(), status=status.HTTP_201_CREATED)
        else:
            error_msg = "IP address %s already exists" % new_ip
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

    @check_parameter
    def delete(self, request, format=None):

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        new_ip = request.data.get('ipaddress', '')
        TrustedIP.objects.delete(new_ip)
        return Response({})
