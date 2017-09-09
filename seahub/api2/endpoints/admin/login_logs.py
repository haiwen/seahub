# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.core.urlresolvers import reverse

from seaserv import ccnet_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.permissions import IsProVersion
from seahub.api2.utils import api_error

from seahub.api2.endpoints.utils import check_time_period_valid, \
        generate_links_header_for_paginator, get_user_name_dict, \
        get_user_contact_email_dict

from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.utils.timeutils import datetime_to_isoformat_timestr

logger = logging.getLogger(__name__)

class LoginLogs(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):

        # check the date format, should be like '2015-10-10'
        start = request.GET.get('start', None)
        end = request.GET.get('end', None)

        if not check_time_period_valid(start, end):
            error_msg = 'start or end date invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # Filtering a DateTimeField with dates won't include items on the last day,
        # because the bounds are interpreted as '0am on the given date'.
        end = end + ' 23:59:59'

        result = []
        from seahub_extra.sysadmin_extra.models import UserLoginLog
        logs = UserLoginLog.objects.filter(login_date__range=(start, end))
        for log in logs:
            result.append({
                'login_time': datetime_to_isoformat_timestr(log.login_date),
                'login_ip': log.login_ip,
                'name': email2nickname(log.username),
                'email':log.username
            })

        return Response(result)

class AdminLoginLogs(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def _get_admin_user_emails(self):

        admin_users = ccnet_api.get_superusers()
        admin_user_emails = []
        for user in admin_users:
            admin_user_emails.append(user.email)

        return admin_user_emails

    def _get_response_data(self, logs):

        user_list = []
        for log in logs:
            user_list.append(log.username)

        name_dict = get_user_name_dict(user_list)
        contact_email_dict = get_user_contact_email_dict(user_list)

        data = []
        for log in logs:
            email = log.username
            data.append({
                'login_time': datetime_to_isoformat_timestr(log.login_date),
                'login_ip': log.login_ip,
                'login_success': log.login_success,
                'email': email,
                'name': name_dict[email],
                'contact_email': contact_email_dict[email],
            })

        return data

    def get(self, request):

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

        offset = per_page * (page -1)

        from seahub_extra.sysadmin_extra.models import UserLoginLog
        admin_user_emails = self._get_admin_user_emails()
        all_logs = UserLoginLog.objects.filter(username__in=admin_user_emails)

        total_count = all_logs.count()
        logs = all_logs[offset:offset+per_page]

        data = self._get_response_data(logs)
        result = {'data': data, 'total_count': total_count}
        resp = Response(result)

        ## generate `Links` header for paginator
        base_url = reverse('api-v2.1-admin-admin-login-logs')
        links_header = generate_links_header_for_paginator(base_url,
                page, per_page, total_count)

        resp['Links'] = links_header

        return resp
