# Copyright (c) 2012-2016 Seafile Ltd.
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.api2.endpoints.admin.statistics import (
    check_parameter, get_init_data, get_time_offset
)
from seahub.utils import get_org_traffic_by_day
from seahub.utils.timeutils import datetime_to_isoformat_timestr


class AdminOrgStatsTraffic(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    @check_parameter
    def get(self, request, start_time, end_time, *args, **kwargs):

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        org_id = kwargs['org_id']

        op_type_list = ['web-file-upload', 'web-file-download',
                        'sync-file-download', 'sync-file-upload',
                        'link-file-upload', 'link-file-download']
        init_count = [0] * 6
        init_data = get_init_data(start_time, end_time,
                                  dict(list(zip(op_type_list, init_count))))

        for e in get_org_traffic_by_day(org_id, start_time, end_time,
                                        get_time_offset()):
            dt, op_type, count = e
            init_data[dt].update({op_type: count})

        res_data = []
        for k, v in list(init_data.items()):
            res = {'datetime': datetime_to_isoformat_timestr(k)}
            res.update(v)
            res_data.append(res)

        return Response(sorted(res_data, key=lambda x: x['datetime']))
