import json
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.core.urlresolvers import reverse

from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.admin_log.models import AdminLog, ADMIN_LOG_OPERATION_TYPE

from seahub.api2.permissions import IsProVersion
from seahub.api2.utils import api_error
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.endpoints.utils import generate_links_header_for_paginator

logger = logging.getLogger(__name__)

def get_log_info(log_obj):
    isoformat_timestr = datetime_to_isoformat_timestr(log_obj.datetime)
    log_info = {
        "email": log_obj.email,
        "operation": log_obj.operation,
        "detail": json.loads(log_obj.detail),
        "datetime": isoformat_timestr,
    }

    return log_info


class AdminOperationLogs(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser, IsProVersion)

    def get(self, request):
        """ List all logs

        Permission checking:
        1. Admin user;
        """

        email = request.GET.get('email', '')
        operation = request.GET.get('operation', '')
        if operation:
            if operation not in ADMIN_LOG_OPERATION_TYPE:
                error_msg = 'operation invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '100'))
        except ValueError:
            page = 1
            per_page = 100

        if page <= 0:
            error_msg = 'page invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if per_page <= 0:
            error_msg = 'per_page invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # generate data result
        data = []
        offset = per_page * (page -1)
        total_count = AdminLog.objects.get_admin_logs(email=email, operation=operation).count()
        admin_logs = AdminLog.objects.get_admin_logs(email=email, operation=operation)[offset:offset+per_page]

        for log in admin_logs:
            log_info = get_log_info(log)
            data.append(log_info)

        result = {'data': data, 'total_count': total_count}
        resp = Response(result)

        ## generate `Links` header for paginator
        options_dict = {'email': email, 'operation': operation}
        base_url = reverse('api-v2.1-admin-admin-operation-logs')
        links_header = generate_links_header_for_paginator(base_url,
                page, per_page, total_count, options_dict)
        resp['Links'] = links_header

        return resp
