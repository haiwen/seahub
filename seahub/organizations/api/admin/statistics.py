# Copyright (c) 2012-2016 Seafile Ltd.
import calendar
import datetime
import json
import logging
from zoneinfo import ZoneInfo

from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.utils import timezone
from django.utils.translation import gettext as _
from django.http import HttpResponse

from seaserv import ccnet_api, seafile_api

from seahub.ai.db_utils import query_ai_statistics_detail, query_ai_statistics_overview
from seahub.profile.models import Profile
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


def get_user_nickname_map(usernames):
    if not usernames:
        return {}
    profiles = Profile.objects.filter(user__in=usernames)
    return {profile.user: profile.nickname for profile in profiles}


def get_group_info_map(group_ids):
    group_name_map = {}
    group_creator_map = {}
    for group_id in set(group_ids):
        group = ccnet_api.get_group(int(group_id))
        if not group:
            continue
        group_name_map[group_id] = getattr(group, 'group_name', '')
        group_creator_map[group_id] = getattr(group, 'creator_name', '')
    return group_name_map, group_creator_map


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
        head = [_("Time"), _("User"), _("Name"), _("Web Download") + ('(MB)'),
                _("Sync Download") + ('(MB)'), _("Link Download") + ('(MB)'),
                _("Web Upload") + ('(MB)'), _("Sync Upload") + ('(MB)'),
                _("Link Upload") + ('(MB)')]

        for data in res_data:
            user_name = email2nickname(data['user'])
            web_download = byte_to_mb(data['web_file_download'])
            sync_download = byte_to_mb(data['sync_file_download'])
            link_download = byte_to_mb(data['link_file_download'])
            web_upload = byte_to_mb(data['web_file_upload'])
            sync_upload = byte_to_mb(data['sync_file_upload'])
            link_upload = byte_to_mb(data['link_file_upload'])

            row = [month, data['user'], user_name, web_download, sync_download,
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


class OrgAdminAIStatisticsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def get(self, request, org_id):
        org_id = int(org_id)
        if not request.user.org or request.user.org.org_id != org_id:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        date = request.GET.get('date')
        month = request.GET.get('month')
        if not date and not month:
            return api_error(status.HTTP_400_BAD_REQUEST, 'date or month required')
        if date:
            try:
                date_obj = datetime.datetime.strptime(date, '%Y-%m-%d').date()
                date_range = [date_obj.isoformat(), date_obj.isoformat()]
            except Exception:
                return api_error(status.HTTP_400_BAD_REQUEST, 'date invalid')
        else:
            try:
                month_start = datetime.datetime.strptime(month, '%Y%m').date()
                _, last_day_num = calendar.monthrange(month_start.year, month_start.month)
                month_end = datetime.date(month_start.year, month_start.month, last_day_num)
                date_range = [month_start.isoformat(), month_end.isoformat()]
            except Exception:
                return api_error(status.HTTP_400_BAD_REQUEST, 'month invalid')

        group_by = request.GET.get('group_by', 'user')
        if group_by not in ('user', 'repo', 'group'):
            return api_error(status.HTTP_400_BAD_REQUEST, 'group_by invalid. Must be "user" or "repo" or "group"')

        try:
            page = int(request.GET.get('page', 1))
            per_page = int(request.GET.get('per_page', 25))
        except Exception:
            page, per_page = 1, 25
        start, end = (page - 1) * per_page, page * per_page

        try:
            if group_by == 'repo':
                records = query_ai_statistics_overview('repo_id', date_range, org_id)
                return self._stats_by_repo(records, start, end)
            if group_by == 'user':
                records = query_ai_statistics_overview('username', date_range, org_id)
                return self._stats_by_user(records, start, end)
            records = query_ai_statistics_overview('group_id', date_range, org_id)
            return self._stats_by_group(records, start, end)
        except Exception as error:
            logger.exception(error)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal server error')

    def _stats_by_repo(self, records, start, end):
        total_count = records.count()
        stats = list(records[start:end])
        if not stats:
            return Response({'results': [], 'count': 0})

        repo_owner_names = [item['repo_owner'] for item in stats if item.get('repo_owner') and not item.get('group_id')]
        repo_owner_nickname_map = get_user_nickname_map(repo_owner_names)
        group_ids = [item['group_id'] for item in stats if item.get('group_id') is not None]
        group_name_map, _ = get_group_info_map(group_ids)

        results = []
        for item in stats:
            repo = seafile_api.get_repo(item['repo_id'])
            result = {
                'repo_id': item['repo_id'],
                'repo_name': repo.name if repo else None,
                'total_credit_used': item['total_credit_used'],
            }
            if item.get('group_id') is not None:
                result['repo_owner'] = item.get('repo_owner') or f"{item['group_id']}@seafile_group"
                result['group_id'] = item['group_id']
                result['group_name'] = group_name_map.get(item['group_id'], item['group_id'])
            elif item.get('repo_owner'):
                result['repo_owner'] = item['repo_owner']
                result['nickname'] = repo_owner_nickname_map.get(item['repo_owner'], email2nickname(item['repo_owner']))
            results.append(result)

        return Response({'results': results, 'count': total_count})

    def _stats_by_user(self, records, start, end):
        total_count = records.count()
        stats = list(records[start:end])
        if not stats:
            return Response({'results': [], 'count': 0})

        usernames = [item['username'] for item in stats]
        nickname_map = get_user_nickname_map(usernames)
        results = []
        for item in stats:
            username = item['username']
            results.append({
                'username': username,
                'nickname': nickname_map.get(username, email2nickname(username)),
                'total_credit_used': item['total_credit_used'],
            })

        return Response({'results': results, 'count': total_count})

    def _stats_by_group(self, records, start, end):
        total_count = records.count()
        stats = list(records[start:end])
        if not stats:
            return Response({'results': [], 'count': 0})

        group_ids = [item['group_id'] for item in stats]
        group_id_to_name_map, group_id_to_creator_map = get_group_info_map(group_ids)
        nickname_map = get_user_nickname_map(set(group_id_to_creator_map.values()))

        results = []
        for item in stats:
            creator = group_id_to_creator_map.get(item['group_id'], '')
            results.append({
                'group_id': item['group_id'],
                'group_name': group_id_to_name_map.get(item['group_id'], ''),
                'creator': creator,
                'creator_name': nickname_map.get(creator, email2nickname(creator)),
                'total_credit_used': item['total_credit_used'],
            })

        return Response({'results': results, 'count': total_count})


class OrgAdminAIStatisticsDetailView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def get(self, request, org_id):
        org_id = int(org_id)
        if not request.user.org or request.user.org.org_id != org_id:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        group_by = request.GET.get('group_by')
        if group_by == 'repo':
            group_by = 'repo_id'
        elif group_by == 'user':
            group_by = 'username'
        elif group_by != 'date':
            return api_error(status.HTTP_400_BAD_REQUEST, 'group_by invalid. Must be sub-group_by of "repo" or "user" or "date"')

        condition = request.GET.get('condition')
        if isinstance(condition, str):
            try:
                condition = json.loads(condition)
            except Exception:
                return api_error(status.HTTP_400_BAD_REQUEST, 'condition invalid. Must be an object')
        if not isinstance(condition, dict):
            return api_error(status.HTTP_400_BAD_REQUEST, 'condition invalid. Must be an object')
        if not condition:
            return api_error(status.HTTP_400_BAD_REQUEST, 'condition must cannot be empty')

        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        if not start_date or not end_date:
            return api_error(status.HTTP_400_BAD_REQUEST, 'range of date must be provided')

        start_date = datetime.datetime.strptime(start_date.split('T')[0], '%Y-%m-%d').date()
        end_date = datetime.datetime.strptime(end_date.split('T')[0], '%Y-%m-%d').date()
        scenarios_str = request.GET.get('scenarios')
        scenarios = [item.strip() for item in scenarios_str.split(',') if item.strip()] if scenarios_str else []

        query_set = query_ai_statistics_detail(group_by, [start_date, end_date], condition, scenarios=scenarios or None)
        if group_by == 'date':
            return Response({'results': list(query_set)})

        if group_by == 'username':
            query_set = list(query_set[:30])
            usernames = [item['username'] for item in query_set]
            nickname_map = get_user_nickname_map(usernames)
            results = []
            for item in query_set:
                username = item['username']
                results.append({
                    'username': username,
                    'nickname': nickname_map.get(username, email2nickname(username)),
                    'total_credit_used': item['total_credit_used'],
                    'total_input_tokens': item['total_input_tokens'],
                    'total_output_tokens': item['total_output_tokens'],
                })
            results.reverse()
            return Response({'results': results})

        query_set = list(query_set[:30])
        results = []
        for item in query_set:
            repo = seafile_api.get_repo(item['repo_id'])
            results.append({
                'repo_id': item['repo_id'],
                'repo_name': repo.name if repo else '<Unknown library>',
                'total_credit_used': item['total_credit_used'],
                'total_input_tokens': item['total_input_tokens'],
                'total_output_tokens': item['total_output_tokens'],
            })
        results.reverse()
        return Response({'results': results})


class OrgAdminAIStatisticsOverviewView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    @staticmethod
    def _get_month_range(date_obj):
        _, last_day_num = calendar.monthrange(date_obj.year, date_obj.month)
        start_date = datetime.date(date_obj.year, date_obj.month, 1)
        end_date = datetime.date(date_obj.year, date_obj.month, last_day_num)
        return [start_date.isoformat(), end_date.isoformat()]

    @staticmethod
    def _get_total_credit_used(date_range, org_id):
        records = query_ai_statistics_overview('org_id', date_range, org_id)
        record = records.first()
        return record['total_credit_used'] if record else 0

    @staticmethod
    def _get_scenario_percentages(date_range, org_id):
        records = list(query_ai_statistics_overview('scenario', date_range, org_id))
        if not records:
            return {'results': [], 'count': 0}

        total_credit_used = sum(item['total_credit_used'] for item in records)
        results = []
        for item in records:
            percentage = 0
            if total_credit_used:
                percentage = round(item['total_credit_used'] / total_credit_used, 3)
            results.append({
                'scenario': item.get('scenario') or '',
                'total_credit_used': round(item['total_credit_used'], 0),
                'percentage': percentage,
            })

        return {'results': results, 'count': len(results)}

    @staticmethod
    def _get_month_start(date_obj):
        return datetime.date(date_obj.year, date_obj.month, 1)

    @staticmethod
    def _add_months(date_obj, months):
        month_index = date_obj.month - 1 + months
        year = date_obj.year + month_index // 12
        month = month_index % 12 + 1
        return datetime.date(year, month, 1)

    @staticmethod
    def _get_last_month_same_day_range(today):
        if today.month == 1:
            last_month_date = datetime.date(today.year - 1, 12, 1)
        else:
            last_month_date = datetime.date(today.year, today.month - 1, 1)

        _, last_day_num = calendar.monthrange(last_month_date.year, last_month_date.month)
        same_day = min(today.day, last_day_num)
        end_date = datetime.date(last_month_date.year, last_month_date.month, same_day)
        return [last_month_date.isoformat(), end_date.isoformat()]

    def _get_monthly_credits(self, org_id, months_count=6):
        current_month_start = self._get_month_start(datetime.date.today())
        results = []
        for offset in range(months_count - 1, -1, -1):
            month_start = self._add_months(current_month_start, -offset)
            date_range = self._get_month_range(month_start)
            results.append({
                'month': month_start.strftime('%Y-%m'),
                'total_credit_used': round(self._get_total_credit_used(date_range, org_id), 0),
            })
        return {'results': results, 'count': len(results)}

    @staticmethod
    def _get_daily_credits_current_month(org_id):
        today = datetime.date.today()
        month_start = datetime.date(today.year, today.month, 1)
        query_set = query_ai_statistics_detail('date', [month_start, today], {'org_id': org_id})
        date_to_credit = {item['date']: item['total_credit_used'] for item in query_set}

        results = []
        current_date = month_start
        while current_date <= today:
            results.append({
                'date': current_date.isoformat(),
                'total_credit_used': round(date_to_credit.get(current_date, 0), 0),
            })
            current_date += datetime.timedelta(days=1)
        return {'results': results, 'count': len(results)}

    def get(self, request, org_id):
        org_id = int(org_id)
        if not request.user.org or request.user.org.org_id != org_id:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        today = datetime.date.today()
        current_month_range = self._get_month_range(today)
        group_by = request.GET.get('group_by')
        if group_by and group_by not in ('scenario', 'month', 'date'):
            return api_error(status.HTTP_400_BAD_REQUEST, 'group_by invalid. Must be "scenario" or "month" or "date"')

        try:
            if group_by == 'scenario':
                return Response(self._get_scenario_percentages(current_month_range, org_id))
            if group_by == 'month':
                return Response(self._get_monthly_credits(org_id))
            if group_by == 'date':
                return Response(self._get_daily_credits_current_month(org_id))

            if today.month == 1:
                last_month_date = datetime.date(today.year - 1, 12, 1)
            else:
                last_month_date = datetime.date(today.year, today.month - 1, 1)
            last_month_range = self._get_month_range(last_month_date)
            last_month_same_day_range = self._get_last_month_same_day_range(today)

            current_month_credit = self._get_total_credit_used(current_month_range, org_id)
            last_month_credit = self._get_total_credit_used(last_month_range, org_id)
            last_month_same_day_credit = self._get_total_credit_used(last_month_same_day_range, org_id)
            month_on_month_change = current_month_credit - last_month_credit
        except Exception as error:
            logger.exception(error)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal server error')

        return Response({
            'current_month_credit': round(current_month_credit, 0),
            'last_month_credit': round(last_month_credit, 0),
            'last_month_same_day_credit': round(last_month_same_day_credit, 0),
            'month_on_month_change': round(month_on_month_change, 0),
        })
