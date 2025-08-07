# Copyright (c) 2012-2016 Seafile Ltd.
import datetime
import logging
from zoneinfo import ZoneInfo

from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.utils import timezone
from django.utils.translation import gettext as _
from django.http import HttpResponse

from seaserv import ccnet_api

from seahub.utils import get_org_file_ops_stats_by_day, \
        get_org_total_storage_stats_by_day, get_org_user_activity_stats_by_day, \
        get_org_traffic_by_day, is_pro_version, EVENTS_ENABLED, \
        get_all_users_traffic_by_month
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.utils.ms_excel import write_xls
from seahub.utils.file_size import byte_to_mb
from seahub.views.sysadmin import _populate_user_quota_usage
from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email

from seahub.api2.permissions import IsProVersion, IsOrgAdminUser
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

logger = logging.getLogger(__name__)


def get_time_offset():
    timezone_name = timezone.get_current_timezone_name()
    tz = ZoneInfo(timezone_name)
    now_in_tz = datetime.datetime.now(tz)
    offset = now_in_tz.strftime('%z')
    return offset[:3] + ':' + offset[3:]


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


def check_parameter(func):

    def _decorated(view, request, org_id, *args, **kwargs):

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
            start_time = datetime.datetime.strptime(start_time, "%Y-%m-%d %H:%M:%S")
        except Exception:
            error_msg = "Start time %s invalid" % start_time
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            end_time = datetime.datetime.strptime(end_time, "%Y-%m-%d %H:%M:%S")
        except Exception:
            error_msg = "End time %s invalid" % end_time
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        return func(view, request, org_id, start_time, end_time, *args, **kwargs)

    return _decorated


class OrgFileOperationsView(APIView):

    """
    Get file operations statistics.
        Permission checking:
        1. only org admin can perform this action.
    """

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    @check_parameter
    def get(self, request, org_id, start_time, end_time):
        """
        Get records of the specified time range.
            param:
                start: the start time of the query.
                end: the end time of the query.
            return:
                the list of file operations record.
        """
        data = get_org_file_ops_stats_by_day(org_id, start_time, end_time, get_time_offset())
        ops_added_dict = get_init_data(start_time, end_time)
        ops_visited_dict = get_init_data(start_time, end_time)
        ops_deleted_dict = get_init_data(start_time, end_time)
        ops_modified_dict = get_init_data(start_time, end_time)

        # [{'number': 2,
        #   'op_type': 'Added',
        #   'timestamp': datetime.datetime(2022, 10, 27, 0, 0)}]
        for item in data:
            if item.get('op_type') == 'Added':
                ops_added_dict[item.get('timestamp')] = item.get('number')
            if item.get('op_type') == 'Visited':
                ops_visited_dict[item.get('timestamp')] = item.get('number')
            if item.get('op_type') == 'Deleted':
                ops_deleted_dict[item.get('timestamp')] = item.get('number')
            if item.get('op_type') == 'Modified':
                ops_modified_dict[item.get('timestamp')] = item.get('number')

        res_data = []
        for k, v in list(ops_added_dict.items()):
            res_data.append({'datetime': datetime_to_isoformat_timestr(k),
                             'added': v,
                             'visited': ops_visited_dict[k],
                             'deleted': ops_deleted_dict[k],
                             'modified': ops_modified_dict[k]})

        return Response(sorted(res_data, key=lambda x: x['datetime']))


class OrgTotalStorageView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    @check_parameter
    def get(self, request, org_id, start_time, end_time):

        data = get_org_total_storage_stats_by_day(org_id, start_time, end_time, get_time_offset())

        # [{'number': Decimal('2558796'),
        #   'timestamp': datetime.datetime(2022, 11, 1, 0, 0)},
        #  {'number': Decimal('2558796'),
        #   'timestamp': datetime.datetime(2022, 11, 2, 0, 0)}]
        init_data = get_init_data(start_time, end_time)
        for e in data:
            init_data[e.get("timestamp")] = e.get("number")

        res_data = []
        for k, v in list(init_data.items()):
            res_data.append({'datetime': datetime_to_isoformat_timestr(k), 'total_storage': v})

        return Response(sorted(res_data, key=lambda x: x['datetime']))


class OrgActiveUsersView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    @check_parameter
    def get(self, request, org_id, start_time, end_time):

        data = get_org_user_activity_stats_by_day(org_id, start_time, end_time)

        # [{'number': 1, 'timestamp': datetime.datetime(2022, 10, 27, 0, 0)},
        #  {'number': 2, 'timestamp': datetime.datetime(2022, 10, 31, 0, 0)},
        #  {'number': 2, 'timestamp': datetime.datetime(2022, 11, 1, 0, 0)},
        #  {'number': 1, 'timestamp': datetime.datetime(2022, 11, 2, 0, 0)}]
        init_data = get_init_data(start_time, end_time)
        for e in data:
            init_data[e.get("timestamp")] = e.get("number")

        res_data = []
        for k, v in list(init_data.items()):
            res_data.append({'datetime': datetime_to_isoformat_timestr(k), 'count': v})

        return Response(sorted(res_data, key=lambda x: x['datetime']))


class OrgSystemTrafficView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    @check_parameter
    def get(self, request, org_id, start_time, end_time):

        op_type_list = ['web-file-upload', 'web-file-download',
                        'sync-file-download', 'sync-file-upload',
                        'link-file-upload', 'link-file-download']
        init_count = [0] * 6
        init_data = get_init_data(start_time, end_time,
                                  dict(list(zip(op_type_list, init_count))))

        data = get_org_traffic_by_day(org_id, start_time, end_time, get_time_offset())
        # [(datetime.datetime(2022, 11, 1, 0, 0), 'web-file-upload', 2558798),
        #  (datetime.datetime(2022, 11, 2, 0, 0), 'web-file-upload', 48659279),
        #  (datetime.datetime(2022, 11, 3, 0, 0), 'link-file-download', 48658882),
        #  (datetime.datetime(2022, 11, 3, 0, 0), 'web-file-upload', 24329441)]
        for e in data:
            dt, op_type, count = e
            init_data[dt].update({op_type: count})

        res_data = []
        for k, v in list(init_data.items()):
            res = {'datetime': datetime_to_isoformat_timestr(k)}
            res.update(v)
            res_data.append(res)

        return Response(sorted(res_data, key=lambda x: x['datetime']))


class OrgUserTrafficView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def get(self, request, org_id):

        month = request.GET.get("month", "")
        if not month:
            error_msg = "month invalid."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            month_obj = datetime.datetime.strptime(month, "%Y%m")
        except Exception as e:
            logger.error(e)
            error_msg = "month %s invalid" % month
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '25'))
        except ValueError:
            page = 1
            per_page = 25
        start = (page - 1) * per_page

        order_by = request.GET.get('order_by', '')
        filters = [
            'sync_file_upload', 'sync_file_download',
            'web_file_upload', 'web_file_download',
            'link_file_upload', 'link_file_download',
        ]
        if order_by not in filters and \
           order_by not in map(lambda x: x + '_desc', filters):
            order_by = 'link_file_download_desc'

        # get one more item than per_page, to judge has_next_page
        try:
            traffics = get_all_users_traffic_by_month(month_obj,
                                                                     start,
                                                                     start + per_page + 1,
                                                                     order_by,
                                                                     org_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if len(traffics) == per_page + 1:
            has_next_page = True
            traffics = traffics[:per_page]
        else:
            has_next_page = False

        user_monthly_traffic_list = []
        for traffic in traffics:
            info = {}
            info['email'] = traffic['user']
            info['name'] = email2nickname(traffic['user'])
            info['sync_file_upload'] = traffic['sync_file_upload']
            info['sync_file_download'] = traffic['sync_file_download']
            info['web_file_upload'] = traffic['web_file_upload']
            info['web_file_download'] = traffic['web_file_download']
            info['link_file_upload'] = traffic['link_file_upload']
            info['link_file_download'] = traffic['link_file_download']
            user_monthly_traffic_list.append(info)

        return Response({
            'user_monthly_traffic_list': user_monthly_traffic_list,
            'has_next_page': has_next_page
        })


class OrgUserTrafficExcelView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def get(self, request, org_id):

        month = request.GET.get("month", "")
        if not month:
            error_msg = "month invalid."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            month_obj = datetime.datetime.strptime(month, "%Y%m")
        except Exception:
            error_msg = "Month %s invalid" % month
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            res_data = get_all_users_traffic_by_month(month_obj,
                                                                     -1, -1,
                                                                     org_id=org_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        data_list = []
        head = [_("Time"), _("User"), _("Web Download") + ('(MB)'),
                _("Sync Download") + ('(MB)'), _("Link Download") + ('(MB)'),
                _("Web Upload") + ('(MB)'), _("Sync Upload") + ('(MB)'),
                _("Link Upload") + ('(MB)')]

        for data in res_data:
            web_download = byte_to_mb(data['web_file_download'])
            sync_download = byte_to_mb(data['sync_file_download'])
            link_download = byte_to_mb(data['link_file_download'])
            web_upload = byte_to_mb(data['web_file_upload'])
            sync_upload = byte_to_mb(data['sync_file_upload'])
            link_upload = byte_to_mb(data['link_file_upload'])

            row = [month, data['user'], web_download, sync_download,
                   link_download, web_upload, sync_upload, link_upload]

            data_list.append(row)

        excel_name = "User Traffic %s" % month

        try:
            wb = write_xls(excel_name, head, data_list)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        response = HttpResponse(content_type='application/ms-excel')
        response['Content-Disposition'] = 'attachment; filename="%s.xlsx"' % excel_name
        wb.save(response)

        return response


class OrgUserStorageExcelView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def get(self, request, org_id):

        org_id = int(org_id)
        org = ccnet_api.get_org_by_id(org_id)
        all_users = ccnet_api.get_org_users_by_url_prefix(org.url_prefix, -1, -1)

        head = [_("Email"), _("Name"), _("Contact Email"),
                _("Space Usage") + "(MB)", _("Space Quota") + "(MB)"]

        data_list = []
        for user in all_users:

            user_email = user.email
            user_name = email2nickname(user_email)
            user_contact_email = email2contact_email(user_email)

            _populate_user_quota_usage(user)
            space_usage_MB = byte_to_mb(user.space_usage)
            space_quota_MB = byte_to_mb(user.space_quota)

            row = [user_email, user_name, user_contact_email,
                   space_usage_MB, space_quota_MB]

            data_list.append(row)

        excel_name = 'User Storage'
        try:
            wb = write_xls('users', head, data_list)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        response = HttpResponse(content_type='application/ms-excel')
        response['Content-Disposition'] = 'attachment; filename="%s.xlsx"' % excel_name
        wb.save(response)

        return response
