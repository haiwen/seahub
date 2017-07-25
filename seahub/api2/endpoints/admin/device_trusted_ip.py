# Copyright (c) 2012-2016 Seafile Ltd.

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


def check_parameter(func):
    def _decorated(view, request, *args, **kwargs):
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
            ipaddress = ipaddress.split('.')
            for i in ipaddress:
                try:
                    i = int(i)
                except ValueError:
                    if i == '*':
                        continue
                    else:
                        error_msg = "ip address invalid"
                        return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
                if i >= 0 and i <= 255:
                    pass
                else:
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
        return_results = [ip.to_dict() for ip in 
                            TrustedIP.objects.all()]
        return Response(return_results, status=200)

    @check_parameter
    def post(self, request, format=None):
        new_ip = request.POST.get('ipaddress')
        ip_obj, created = TrustedIP.objects.get_or_create(new_ip)
        if created:
            return Response({'ip': ip_obj.ip}, status=status.HTTP_201_CREATED)
        else:
            return Response({'ip': ip_obj.ip}, status=status.HTTP_200_OK)

    @check_parameter
    def delete(self, request, format=None):
        new_ip = request.GET.get('ipaddress')
        TrustedIP.objects.delete(new_ip)
        return Response({}, status=status.HTTP_200_OK)
