# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.endpoints.utils import check_time_period_valid
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.utils import is_pro_version
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

logger = logging.getLogger(__name__)

class Login(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication )
    permission_classes = (IsAdminUser,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):

        if not is_pro_version():
            error_msg = 'Feature disabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

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
