import os
import logging
from shutil import rmtree
from django.http import FileResponse
from rest_framework.authentication import SessionAuthentication
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
from seahub.organizations.api.permissions import IsOrgAdmin
from seahub.organizations.decorators import org_staff_required



logger = logging.getLogger(__name__)


class OrgLogsExport(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsOrgAdmin, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, org_id):
        start = request.GET.get('start', None)
        end = request.GET.get('end', None)
        log_type = request.GET.get('logType', None)
        if not check_time_period_valid(start, end):
            error_msg = 'Failed to export excel, invalid start or end date.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        task_id = export_logs_to_excel(start, end, log_type, org_id)
        res_data = {'task_id': task_id}
        return Response(res_data)


@login_required
@org_staff_required
@api_view(('GET',))
def org_log_export_excel(request):
    task_id = request.GET.get('task_id', None)
    log_type = request.GET.get('log_type', None)
    if not task_id:
        error_msg = 'task_id invalid.'
        return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

    if log_type == 'fileaudit':
        excel_name = 'file-access-logs.xlsx'
    elif log_type == 'fileupdate':
        excel_name = 'file-update-logs.xlsx'
    elif log_type == 'permaudit':
        excel_name = 'perm-audit-logs.xlsx'
    else:
        error_msg = 'log_type invalid'
        return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
    target_dir = os.path.join('/tmp/seafile_events/', task_id)
    tmp_excel_path = os.path.join(target_dir, excel_name)
    if not os.path.isfile(tmp_excel_path):
        return api_error(status.HTTP_400_BAD_REQUEST, excel_name + ' not found.')
    response = FileResponse(open(tmp_excel_path, 'rb'), content_type='application/ms-excel', as_attachment=True)
    try:
        rmtree(target_dir)
    except OSError:
        pass
    response['Content-Disposition'] = 'attachment;filename*=UTF-8\'\'' + quote(excel_name)
    return response
