# Copyright (c) 2012-2016 Seafile Ltd.
import logging
import datetime

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.utils import get_file_ops_stats, get_file_ops_stats_by_day, \
        get_total_storage_stats, get_total_storage_stats_by_day, \
        get_user_activity_stats, get_user_activity_stats_by_day
from seahub.utils.timeutils import datetime_to_isoformat_timestr

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

logger = logging.getLogger(__name__)


def check_parameter(func):
    def _decorated(view, request, *args, **kwargs):
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
            error_msg = "Records can only group by day or hour"
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


def get_data_by_hour_or_day(parameter, start_time, end_time, func, func_by_day):
    if parameter == "hour":
        data = func(start_time, end_time)
        logger.error("seafile hour:%s" % str(data))
    elif parameter == "day":
        data = func_by_day(start_time, end_time)
        logger.error("seafile day:%s" % str(data))
    return data


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
        if data is None:
            error_msg = "unsupported service"
            return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, error_msg)

        # save time to dict key, and save data to dict key  
        # e.g.
        # data = [(datetime.datetime(2017, 5, 16, 13, 0), u'Added', 1L),
        #        (datetime.datetime(2017, 5, 16, 13, 0), u'Visited', 113L),
        #        (datetime.datetime(2017, 5, 16, 13, 0), u'Delete', 113L)]
        # dict_data = {(datetime.datetime(2017, 5, 16, 13, 0)): {'added': 1L, 'Visited': 113L, 'Delete': 113L}}
        # and then combined into api desired data
        # e.g
        # dict_data -> {"datetime": datetime.datetime(2017, 5, 16, 13, 0), 'added': 1L, 'visited': 133L, 'deleted': 113L}
        # then sort dict_data,
        data = fill_data('file_ops', start_time, end_time, group_by, data)
        res_data = []
        dict_data = {}
        for e in data:
            timestamp = e[0]
            if dict_data.get(timestamp, None) is None:
                dict_data[timestamp] = {}
            dict_data[timestamp][e[1]] = e[2]
        if len(dict_data) == 0:
            return Response(status.HTTP_200_OK)
        for x, y in dict_data.items():
            added = y.get('Added', 0)
            deleted = y.get('Deleted', 0)
            visited = y.get('Visited', 0)
            res_data.append(dict(zip(['datetime', 'added', 'deleted',
                                      'visited'], [x, added, deleted,
                                                   visited])))
        logger.error("seahub file ops :%s" % str(res_data))
        return Response(sorted(res_data, key=lambda x: x['datetime']))


class TotalStorageView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    @check_parameter
    def get(self, request, start_time, end_time, group_by):
        data = get_data_by_hour_or_day(group_by, start_time, end_time, get_total_storage_stats, get_total_storage_stats_by_day)
        if data is None:
            error_msg = "unsupported service"
            return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, error_msg)

        data = fill_data('total_storage', start_time, end_time, group_by, data)
        res_data = []
        for e in data:
            res_data.append({'datetime': e[0], 'total_storage': e[1]})
        logger.error("seahub totalstorage:%s" % str(res_data))
        if len(res_data) > 0:
            return Response(sorted(res_data, key=lambda x: x['datetime']))
        else:
            return Response(status.HTTP_200_OK)


class ActiveUsersView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    @check_parameter
    def get(self, request, start_time, end_time, group_by):
        data = get_data_by_hour_or_day(group_by, start_time, end_time, get_user_activity_stats, get_user_activity_stats_by_day)
        if data is None:
            error_msg = "unsupported service"
            return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, error_msg)

        data = fill_data('active_user', start_time, end_time, group_by, data)
        res_data = []
        for e in data:
            res_data.append({'datetime': e[0], 'count': e[1]})
        logger.error("seahub active:%s" % str(res_data))
        if len(res_data) > 0:
            return Response(sorted(res_data, key=lambda x: x['datetime']))
        else:
            return Response(status.HTTP_200_OK)


def fill_data(method_type, start_time, end_time, group_by, data):
    if group_by == 'day':
        start_time = start_time.replace(hour=0).replace(minute=0).replace(second=0)
        end_time = end_time.replace(hour=0).replace(minute=0).replace(second=0)
        time_delta = end_time - start_time
        date_length = time_delta.days + 1
    elif group_by == 'hour':
        start_time = start_time.replace(minute=0).replace(second=0)
        end_time = end_time.replace(minute=0).replace(second=0)
        time_delta = end_time - start_time
        date_length = (time_delta.days * 24) + time_delta.seconds/3600 + 1

    res_data = []
    for i in range(date_length):
        res_data.append(1)
    file_ops_list = []
    if method_type =='file_ops':
        for e in data:
            if group_by == 'hour':
                offset = (e[0] - start_time).seconds/3600 + (e[0] - start_time).days * 24
            else:
                offset = (e[0] - start_time).days
            temp_data = (datetime_to_isoformat_timestr(e[0]), e[1], e[2])
            file_ops_list.append(temp_data)
            res_data[offset] = 2
    else:
        for e in data:
            if group_by == 'hour':
                offset = (e[0] - start_time).seconds/3600
            else:
                offset = (e[0] - start_time).days
            temp_data = [datetime_to_isoformat_timestr(e[0])]
            temp_data.extend(e[1:])
            res_data[offset] = temp_data

    file_ops_del = 0
    for i in range(date_length):
        if res_data[i] == 1:
            if method_type == 'file_ops':
                file_ops_del += 1
                res_data.extend(get_fill_data(method_type, group_by, 
                                              start_time, i))
            else:
                res_data[i] = get_fill_data(method_type, group_by, 
                                            start_time, i)
    if method_type == 'file_ops':
        while 1 in res_data:
            res_data.remove(1)
        while 2 in res_data:
            res_data.remove(2)
        res_data.extend(file_ops_list)
    return res_data


def get_fill_data(method_type, group_by, start_time, offset):
    offset = offset if group_by == 'hour' else offset * 24
    dt = start_time + datetime.timedelta(hours=offset)
    if method_type == 'active_user':
        fill_data = [datetime_to_isoformat_timestr(dt), 0]
    elif method_type == 'file_ops':
        fill_data = [(datetime_to_isoformat_timestr(dt), 'Added', 0), 
                     (datetime_to_isoformat_timestr(dt), 'Visited', 0), 
                     (datetime_to_isoformat_timestr(dt), 'Delete', 0)]
    elif method_type == 'total_storage':
        fill_data = [datetime_to_isoformat_timestr(dt), 0]
    return fill_data
