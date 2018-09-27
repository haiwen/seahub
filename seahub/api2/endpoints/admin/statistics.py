# Copyright (c) 2012-2016 Seafile Ltd.
import datetime
import pytz
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.utils import timezone
from django.utils.translation import ugettext as _
from django.http import HttpResponse

from seahub.utils import get_file_ops_stats_by_day, \
        get_total_storage_stats_by_day, get_user_activity_stats_by_day, \
        is_pro_version, EVENTS_ENABLED, get_system_traffic_by_day, \
        get_all_users_traffic_by_month
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.utils.ms_excel import write_xls

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

logger = logging.getLogger(__name__)

def check_parameter(func):
    def _decorated(view, request, *args, **kwargs):
        if not is_pro_version() or not EVENTS_ENABLED:
            return api_error(status.HTTP_404_NOT_FOUND, 'Events not enabled.')
        start_time = request.GET.get("start", "")
        end_time = request.GET.get("end", "")
        if not start_time:
            error_msg = "Start time can not be empty"
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        if not end_time:
            error_msg = "End time can not be empty"
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

        return func(view, request, start_time, end_time, *args, **kwargs)
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
    def get(self, request, start_time, end_time):
        """
        Get records of the specified time range.
            param:
                start: the start time of the query.
                end: the end time of the query.
            return:
                the list of file operations record.
        """
        offset = get_time_offset()
        data = get_file_ops_stats_by_day(start_time, end_time, offset)
        ops_added_dict = get_init_data(start_time, end_time)
        ops_visited_dict = get_init_data(start_time, end_time)
        ops_deleted_dict = get_init_data(start_time, end_time)

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
    def get(self, request, start_time, end_time):
        data = get_total_storage_stats_by_day(start_time, end_time, get_time_offset())

        res_data = []
        init_data = get_init_data(start_time, end_time)
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
    def get(self, request, start_time, end_time):
        data = get_user_activity_stats_by_day(start_time, end_time, get_time_offset())

        res_data = []
        init_data = get_init_data(start_time, end_time)
        for e in data:
            init_data[e[0]] = e[1]
        for k, v in init_data.items():
            res_data.append({'datetime': datetime_to_isoformat_timestr(k), 'count': v})

        return Response(sorted(res_data, key=lambda x: x['datetime']))


class SystemTrafficView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    @check_parameter
    def get(self, request, start_time, end_time):
        op_type_list = ['web-file-upload', 'web-file-download',
                        'sync-file-download', 'sync-file-upload',
                        'link-file-upload', 'link-file-download']
        init_count = [0] * 6
        init_data = get_init_data(start_time, end_time,
                                  dict(zip(op_type_list, init_count)))

        for e in get_system_traffic_by_day(start_time, end_time,
                                           get_time_offset()):
            dt, op_type, count = e
            init_data[dt].update({op_type: count})

        res_data = []
        for k, v in init_data.items():
            res = {'datetime': datetime_to_isoformat_timestr(k)}
            res.update(v)
            res_data.append(res)

        return Response(sorted(res_data, key=lambda x: x['datetime']))


def get_init_data(start_time, end_time, init_data=0):
    res = {}
    start_time = start_time.replace(hour=0).replace(minute=0).replace(second=0)
    end_time = end_time.replace(hour=0).replace(minute=0).replace(second=0)
    time_delta = end_time - start_time
    date_length = time_delta.days + 1
    for offset in range(date_length):
        offset = offset * 24
        dt = start_time + datetime.timedelta(hours=offset)
        if isinstance(init_data, dict):
            res[dt] = init_data.copy()
        else:
            res[dt] = init_data
    return res

def get_time_offset():
    timezone_name = timezone.get_current_timezone_name()
    offset = pytz.timezone(timezone_name).localize(datetime.datetime.now()).strftime('%z')
    return offset[:3] + ':' + offset[3:]

class SystemUsersTrafficExcelView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def byte_to_mb(self, byte):

        return round(float(byte)/1000/1000, 2)

    def get(self, request):

        month = request.GET.get("month", "")
        if not month:
            error_msg = "month invalid."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            month_obj = datetime.datetime.strptime(month, "%Y-%m")
        except:
            error_msg = "Month %s invalid" % month
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            res_data = get_all_users_traffic_by_month(month_obj)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        data_list = []
        head = [_("Time"), _("User"), _("Web Download") + ('(MB)'), \
                _("Sync Download") + ('(MB)'), _("Link Download") + ('(MB)'), \
                _("Web Upload") + ('(MB)'), _("Sync Upload") + ('(MB)'), \
                _("Link Upload") + ('(MB)')]

        for data in res_data:
            web_download = self.byte_to_mb(data['web_file_download'])
            sync_download = self.byte_to_mb(data['sync_file_download'])
            link_download = self.byte_to_mb(data['link_file_download'])
            web_upload = self.byte_to_mb(data['web_file_upload'])
            sync_upload = self.byte_to_mb(data['sync_file_upload'])
            link_upload = self.byte_to_mb(data['link_file_upload'])

            row = [month, data['user'], web_download, sync_download, \
                    link_download, web_upload, sync_upload, link_upload]

            data_list.append(row)

        excel_name = _("User Traffic %s" % month)

        try:
            wb = write_xls(excel_name, head, data_list)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        response = HttpResponse(content_type='application/ms-excel')
        response['Content-Disposition'] = 'attachment; filename=%s.xlsx' % excel_name
        wb.save(response)

        return response
