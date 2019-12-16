# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, to_python_boolean

from seahub.api2.endpoints.abuse_reports import get_abuse_report_info
from seahub.abuse_reports.models import AbuseReport
from seahub.settings import ENABLE_SHARE_LINK_REPORT_ABUSE

logger = logging.getLogger(__name__)


class AdminAbuseReportsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """ Get all abuse reports.

        Permission checking:
        1. only admin can perform this action.
        """

        if not ENABLE_SHARE_LINK_REPORT_ABUSE:
            error_msg = 'Feature not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        abuse_type = request.GET.get('abuse_type', '')
        handled = request.GET.get('handled', '')

        if handled:
            if handled not in ('true', 'false'):
                error_msg = 'handled invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            handled = to_python_boolean(handled)

        try:
            reports = AbuseReport.objects.get_abuse_reports(
                abuse_type=abuse_type, handled=handled)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        info_list = []
        for report in reports:
            info = get_abuse_report_info(report)
            info_list.append(info)

        return Response({'abuse_report_list': info_list, })


class AdminAbuseReportView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser,)
    throttle_classes = (UserRateThrottle,)

    def put(self, request, pk):
        """ Mark an abuse report handled.

        Permission checking:
        1. only admin can perform this action.
        """

        if not ENABLE_SHARE_LINK_REPORT_ABUSE:
            error_msg = 'Feature not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # argument check
        handled = request.data.get('handled')
        if not handled:
            error_msg = 'handled invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if handled not in ('true', 'false'):
            error_msg = 'handled invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        report = AbuseReport.objects.get_abuse_report_by_id(pk)
        if not report:
            error_msg = 'abuse report  %d not found.' % pk
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        report.handled = to_python_boolean(handled)
        report.save()

        info = get_abuse_report_info(report)
        return Response(info)
