import datetime
import time
import logging
import copy

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from django.utils.translation import ugettext as _
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.utils import get_file_audit_stats, get_file_audit_stats_by_day
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

logger = logging.getLogger(__name__)


class FileOperations(APIView):
    """
    The  File Operations Record .
        Permission checking:
        1. only admin can perform this action.
    """
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def get(self, request):
        """
        Get a record of the specifiy time
            param:
                start: the start time of the query.
                end: the end time of the query.
                group_by:decide the record group by day or hour, default group by hour.
            return:
                the list of file operations record.
        """
        request_get = request.GET
        get_start = request_get.get("start", "")
        get_end = request_get.get("end", "")
        get_group_by = request_get.get("group_by", "hour")
        if not get_start:
            error_msg = _("Start time can not be empty")
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        if not get_end:
            error_msg = _("End time can not be empty")
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        if get_group_by.lower() not in ["hour", "day"]:
            error_msg = "Record only can group by day or hour"
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        try:
            start_time = datetime.datetime.strptime(get_start,
                    "%Y-%m-%d %H:%M:%S")
        except:
            error_msg = _("Start time %s invalid") % start_time
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        try:
            end_time = datetime.datetime.strptime(get_end, "%Y-%m-%d %H:%M:%S")
        except:
            error_msg = _("End time %s invalid") % end_time
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if get_group_by == "hour":
            data = get_file_audit_stats(start_time, end_time)
        elif get_group_by == "day":
            data = get_file_audit_stats_by_day(start_time, end_time)
        res_data = []
        dict_data = {}
        for i in data:
            timestamp = str(int(time.mktime(i[0].timetuple())))
            if dict_data.get(timestamp, None) == None:
                dict_data[timestamp] = {}
            dict_data[timestamp][i[1]] = i[2]
        for x, y in dict_data.items():
            timeArray = time.localtime(int(x))
            x = time.strftime("%Y-%m-%d %H:%M:%S", timeArray)
            added = y.get('Added', '0')
            deleted = y.get('Deleted', '0')
            visited = y.get('Visited', '0')
            res_data.append(dict(zip(['datetime', 'added', 'deleted',
                    'visited'], [x, added, deleted, visited])))
        return Response(sorted(res_data, key=lambda x: x['datetime']))
