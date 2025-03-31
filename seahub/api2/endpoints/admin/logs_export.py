import os
from shutil import rmtree
from datetime import datetime
from django.http import FileResponse
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.decorators import api_view
from urllib.parse import quote

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.endpoints.utils import check_time_period_valid, export_logs_to_excel
from seahub.api2.permissions import IsProVersion
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.auth.decorators import login_required
from seahub.base.decorators import sys_staff_required
from seahub.settings import ADMIN_LOGS_EXPORT_MAX_DAYS


class SysLogsExport(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        start = request.GET.get('start', None)
        end = request.GET.get('end', None)
        log_type = request.GET.get('logType', None)

        if not check_time_period_valid(start, end):
            error_msg = 'Failed to export excel, invalid start or end date.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        start_date = datetime.strptime(start, '%Y-%m-%d')
        end_date = datetime.strptime(end, '%Y-%m-%d')
        if start_date > end_date:
            error_msg = 'invalid start or end date'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        if (end_date - start_date).days > ADMIN_LOGS_EXPORT_MAX_DAYS:
            error_msg = 'Failed to export excel, only can export logs within %s days' % ADMIN_LOGS_EXPORT_MAX_DAYS
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        task_id = export_logs_to_excel(start, end, log_type)
        res_data = {'task_id': task_id}
        return Response(res_data)


@login_required
@sys_staff_required
@api_view(('GET',))
def sys_log_export_excel(request):
    task_id = request.GET.get('task_id', None)
    log_type = request.GET.get('log_type', None)

    if not task_id:
        error_msg = 'task_id invalid.'
        return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

    if log_type == 'loginadmin':
        excel_name = 'login-logs.xlsx'
    elif log_type == 'fileaudit':
        excel_name = 'file-access-logs.xlsx'
    elif log_type == 'fileupdate':
        excel_name = 'file-update-logs.xlsx'
    elif log_type == 'permaudit':
        excel_name = 'perm-audit-logs.xlsx'
    else:
        error_msg = 'log_type invalid'
        return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

    base_dir = '/tmp/seafile_events/'
    target_dir = os.path.join(base_dir, task_id)
    tmp_excel_path = os.path.join(target_dir, excel_name)

    target_dir = os.path.normpath(target_dir)
    tmp_excel_path = os.path.normpath(tmp_excel_path)

    if not target_dir.startswith(base_dir) or not tmp_excel_path.startswith(base_dir):
        return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid path.')

    if not os.path.isfile(tmp_excel_path):
        return api_error(status.HTTP_400_BAD_REQUEST, excel_name + ' not found.')

    response = FileResponse(open(tmp_excel_path, 'rb'),
                            content_type='application/ms-excel',
                            as_attachment=True)

    try:
        rmtree(target_dir)
    except OSError:
        pass
    response['Content-Disposition'] = 'attachment;filename*=UTF-8\'\'' + quote(excel_name)

    return response
