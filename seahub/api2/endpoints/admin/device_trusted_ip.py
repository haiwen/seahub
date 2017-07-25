# Copyright (c) 2012-2016 Seafile Ltd.
import re

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.trusted_ip.models import TrustedIP
from seahub.settings import ENABLE_LIMIT_IPADDRESS

from seahub.utils import is_pro_version


def cmpIP(big_ip, small_ip):
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
                return True
            elif new_big_ip[i] < new_small_ip[i]:
                return False
            else:
                if i == 3:
                    return True
                else:
                    pass
        else:
            if new_big_ip[i] == new_small_ip[i]:
                if i == 3:
                    return True
                pass
            elif new_big_ip[i] == '*':
                return True
            else:
                return False


def partiton(li, a, b):
    x = li[b]
    i = a
    for j in range(a, b):
        if cmpIP(x, li[j]):
            li[i], li[j] = li[j], li[i]
            i += 1
    li[i], li[b] = li[b], li[i]
    return i


def quickSort(li, a, b):
    if a >= b:
        return
    i = partiton(li, a, b)
    quickSort(li, a, i - 1)
    quickSort(li, i + 1, b)


def check_parameter(func):
    def _decorated(view, request, *args, **kwargs):
        """
        use re to match ipaddress.support wildcard.
        e.g.
            123.123.123.123
            123.123.123.*
            123.123.*.*
            123.*.*.*
        """
        if not is_pro_version() or not ENABLE_LIMIT_IPADDRESS:
            error_msg = 'Feature disabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if request.method in ["DELETE", "POST"]:
            if request.method == 'DELETE':
                ipaddress = request.GET.get('ipaddress', '')
            else:
                ipaddress = request.POST.get('ipaddress', '')
            if not ipaddress:
                error_msg = 'ip address can not be empty'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            pattern = "^(?:(?:1[0-9][0-9]\.)|(?:2[0-4][0-9]\.)|"
            pattern += "(?:25[0-5]\.)|(?:[1-9][0-9]\.)|(?:[0-9]\.)){3}"
            pattern += "(?:(?:1[0-9][0-9])|(?:2[0-4][0-9])|(?:25[0-5])"
            pattern += "|(?:[1-9][0-9])|(?:[0-9]))$|^(?:(?:1[0-9][0-9]\.)"
            pattern += "|(?:2[0-4][0-9]\.)|(?:25[0-5]\.)|(?:[1-9][0-9]\.)"
            pattern += "|(?:[0-9]\.)){3}\*$|^(?:(?:1[0-9][0-9]\.)|(?:2[0-4][0-9]\.)"
            pattern += "|(?:25[0-5]\.)|(?:[1-9][0-9]\.)|(?:[0-9]\.)){2}\*\.\*$|"
            pattern += "^(?:(?:1[0-9][0-9]\.)|(?:2[0-4][0-9]\.)|(?:25[0-5]\.)"
            pattern += "|(?:[1-9][0-9]\.)|(?:[0-9]\.))\*\.\*\.\*$"

            if not re.match(pattern, ipaddress):
                error_msg = "ip address invalid"
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        return func(view, request, *args, **kwargs)
    return _decorated


class AdminDeviceTrustedIP(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle, )
    permission_classes = (IsAdminUser,)

    @check_parameter
    def get(self, request, format=None):
        ip_list = [ip.to_dict() for ip in TrustedIP.objects.all()]
        if len(ip_list) >= 2:
            quickSort(ip_list, 0, len(ip_list)-1)
        return Response(ip_list, status=200)

    @check_parameter
    def post(self, request, format=None):
        new_ip = request.POST.get('ipaddress')
        ip_obj, created = TrustedIP.objects.get_or_create(new_ip)
        if created:
            return Response(ip_obj.to_dict(), status=status.HTTP_201_CREATED)
        else:
            return Response(ip_obj.to_dict(), status=status.HTTP_200_OK)

    @check_parameter
    def delete(self, request, format=None):
        new_ip = request.GET.get('ipaddress')
        TrustedIP.objects.delete(new_ip)
        return Response({}, status=status.HTTP_200_OK)
