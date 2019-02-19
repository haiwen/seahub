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

from seahub.api2.endpoints.illegal_reports import get_illegal_report_info
from seahub.illegal_reports.models import IllegalReport
from seahub.settings import ENABLE_SHARE_LINK_REPORT_ILLEGAL

logger = logging.getLogger(__name__)


class AdminIllegalReportsView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """ Get all illegal reports.

        Permission checking:
        1. only admin can perform this action.
        """

        if not ENABLE_SHARE_LINK_REPORT_ILLEGAL:
            error_msg = 'Feature not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        illegal_type = request.GET.get('illegal_type', '')
        handled = request.GET.get('handled', '')

        if handled:
            if handled not in ('true', 'false'):
                error_msg = 'handled invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            handled = to_python_boolean(handled)

        try:
            reports = IllegalReport.objects.get_illegal_reports(illegal_type=illegal_type,
                    handled=handled)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        info_list = []
        for report in reports:
            info = get_illegal_report_info(report)
            info_list.append(info)

        return Response({'illegal_report_list': info_list,})


class AdminIllegalReportView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser,)
    throttle_classes = (UserRateThrottle,)

    def put(self, request, pk):
        """ Mark an illegal report handled.

        Permission checking:
        1. only admin can perform this action.
        """

        if not ENABLE_SHARE_LINK_REPORT_ILLEGAL:
            error_msg = 'Feature not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # argument check
        handled = request.data.get('handled')
        if not handled:
            error_msg = 'handled invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if handled not in ('true', 'false'):
            error_msg = 'handled invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        report = IllegalReport.objects.get_illegal_report_by_id(pk)
        if not report:
            error_msg = 'Illegal report  %d not found.' % pk
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        report.handled = to_python_boolean(handled)
        report.save()

        info = get_illegal_report_info(report)
        return Response(info)
