# Copyright (c) 2012-2016 Seafile Ltd.
import datetime
import pytz

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.utils import timezone

from seahub.utils import get_file_ops_stats, get_file_ops_stats_by_day, \
        get_total_storage_stats, get_total_storage_stats_by_day, \
        get_user_activity_stats, get_user_activity_stats_by_day, \
        is_pro_version, EVENTS_ENABLED
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.settings import TIME_ZONE

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error



def check_parameter(func):
    def _decorated(view, request, *args, **kwargs):
        if not is_pro_version() or not EVENTS_ENABLED:
            return api_error(status.HTTP_404_NOT_FOUND, 'Events not enabled.')
        start_time = request.GET.get("start", "")
        end_time = request.GET.get("end", "")
        group_by = request.GET.get("group_by", "hour")
        if not start_time:
            error_msg = "Start time can not be empty"
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        if not end_time:
            error_msg = "End time can not be empty"
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        if group_by.lower() not in ["hour", "day"]:
            error_msg = "group_by can only be day or hour."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        try:
            start_time = datetime.datetime.strptime(start_time,
                                                    "%Y-%m-%d %H:%M:%S")
        except:
            error_msg = "Start time %s invalid" % start_time
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        try:
            end_time = datetime.datetime.strptime(end_time,
                                                  "%Y-%m-%d %H:%M:%S")
        except:
            error_msg = "End time %s invalid" % end_time
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        return func(view, request, start_time, end_time, group_by)
    return _decorated


class FileOperationsView(APIView):
    """
    Get file operations statistics.
        Permission checking:
        1. only admin can perform this action.
    """
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    @check_parameter
    def get(self, request, start_time, end_time, group_by):
        """
        Get records of the specified time range.
            param:
                start: the start time of the query.
                end: the end time of the query.
                group_by: group records by day or by hour, default group by hour.
            return:
                the list of file operations record.
        """
        data = get_data_by_hour_or_day(group_by, start_time, end_time, get_file_ops_stats, get_file_ops_stats_by_day)
        ops_added_dict = get_init_data(start_time, end_time, group_by)
        ops_visited_dict = get_init_data(start_time, end_time, group_by)
        ops_deleted_dict = get_init_data(start_time, end_time, group_by)

        for e in data:
            if e[1] == 'Added':
                ops_added_dict[e[0]] = e[2]
            elif e[1] == 'Visited':
                ops_visited_dict[e[0]] = e[2]
            elif e[1] == 'Deleted':
                ops_deleted_dict[e[0]] = e[2]

        res_data = []
        for k, v in ops_added_dict.items():
            res_data.append({'datetime': datetime_to_isoformat_timestr(k), 
                         'added': v, 
                         'visited': ops_visited_dict[k], 
                         'deleted': ops_deleted_dict[k]})
        return Response(sorted(res_data, key=lambda x: x['datetime']))


class TotalStorageView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    @check_parameter
    def get(self, request, start_time, end_time, group_by):
        data = get_data_by_hour_or_day(group_by, start_time, end_time, get_total_storage_stats, get_total_storage_stats_by_day)

        res_data = []
        init_data = get_init_data(start_time, end_time, group_by)
        for e in data:
            init_data[e[0]] = e[1]
        for k, v in init_data.items():
            res_data.append({'datetime': datetime_to_isoformat_timestr(k), 'total_storage': v})

        return Response(sorted(res_data, key=lambda x: x['datetime']))


class ActiveUsersView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    @check_parameter
    def get(self, request, start_time, end_time, group_by):
        data = get_data_by_hour_or_day(group_by, start_time, end_time, get_user_activity_stats, get_user_activity_stats_by_day)

        res_data = []
        init_data = get_init_data(start_time, end_time, group_by)
        for e in data:
            init_data[e[0]] = e[1]
        for k, v in init_data.items():
            res_data.append({'datetime': datetime_to_isoformat_timestr(k), 'count': v})

        return Response(sorted(res_data, key=lambda x: x['datetime']))


def get_init_data(start_time, end_time, group_by):
    res = {}
    if group_by == 'hour':
        start_time = start_time.replace(minute=0).replace(second=0)
        end_time = end_time.replace(minute=0).replace(second=0)
        time_delta = end_time - start_time
        date_length = (time_delta.days * 24) + time_delta.seconds/3600 + 1
    else:
        start_time = start_time.replace(hour=0).replace(minute=0).replace(second=0)
        end_time = end_time.replace(hour=0).replace(minute=0).replace(second=0)
        time_delta = end_time - start_time
        date_length = time_delta.days + 1
    for offset in range(date_length):
        offset = offset if group_by == 'hour' else offset * 24
        dt = start_time + datetime.timedelta(hours=offset)
        res[dt] = 0
    return res


def get_data_by_hour_or_day(parameter, start_time, end_time, func, func_by_day):
    timezone_name = timezone.get_current_timezone_name()
    offset = pytz.timezone(timezone_name).localize(datetime.datetime.now()).strftime('%z')
    offset = offset[:3] + ':' + offset[3:]
    if parameter == "hour":
        data = func(start_time, end_time, offset)
    elif parameter == "day":
        data = func_by_day(start_time, end_time, offset)
    return data
