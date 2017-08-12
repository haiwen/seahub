# Copyright (c) 2012-2016 Seafile Ltd.
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api

from seahub.api2.endpoints.utils import check_time_period_valid, \
    get_log_events_by_type_and_time

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.utils import is_pro_version

class PermAudit(APIView):

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

        result = []
        events = get_log_events_by_type_and_time('perm_audit', start, end)
        if events:
            for ev in events:
                tmp_repo = seafile_api.get_repo(ev.repo_id)
                tmp_repo_name = tmp_repo.name if tmp_repo else ''

                result.append({
                    'etype': ev.etype,
                    'repo_id': ev.repo_id,
                    'repo_name': tmp_repo_name,
                    'permission': ev.permission,
                    'time': datetime_to_isoformat_timestr(ev.timestamp),
                    'file_path': ev.file_path,
                    'from_name': email2nickname(ev.from_user),
                    'from_email': ev.from_user,
                    'to': ev.to
                })

        return Response(result)
