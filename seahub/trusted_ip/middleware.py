# Copyright (c) 2012-2016 Seafile Ltd.
import json

from django.http import HttpResponse
from django.shortcuts import render
from django.utils.deprecation import MiddlewareMixin

from seahub.utils.ip import get_remote_ip
from seahub.trusted_ip.models import TrustedIP
from seahub.settings import ENABLE_LIMIT_IPADDRESS, TRUSTED_IP_LIST


class LimitIpMiddleware(MiddlewareMixin):
    def process_request(self, request):
        if not ENABLE_LIMIT_IPADDRESS:
            return None

        ip = get_remote_ip(request)
        if not TrustedIP.objects.match_ip(ip) and ip not in TRUSTED_IP_LIST:
            if "api2/" in request.path or "api/v2.1/" in request.path:
                return HttpResponse(
                    json.dumps({"err_msg": "you can't login, because IP \
                    address was not in range"}),
                    status=403,
                    content_type='application/json; charset=utf-8'
                )
            else:
                return render(request, 'trusted_ip/403_trusted_ip.html',
                              status=403)
