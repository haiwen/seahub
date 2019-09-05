# Copyright (c) 2012-2016 Seafile Ltd.
import os
import logging
import posixpath

from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api

from seahub.api2.utils import api_error
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import AnonRateThrottle
from seahub.share.models import FileShare
from seahub.utils import normalize_file_path
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.settings import ENABLE_SHARE_LINK_REPORT_ABUSE

from seahub.abuse_reports.models import COPYRIGHT_ISSUE, \
    VIRUS_ISSUE, ABUSE_CONTENT_ISSUE, OTHER_ISSUE, AbuseReport

logger = logging.getLogger(__name__)


def get_abuse_report_info(report):
    data = {}

    file_path = report.file_path

    data['id'] = report.id
    data['reporter'] = report.reporter
    data['repo_id'] = report.repo_id
    data['repo_name'] = report.repo_name
    data['file_path'] = file_path
    data['file_name'] = os.path.basename(file_path)
    data['time'] = datetime_to_isoformat_timestr(report.time)
    data['abuse_type'] = report.abuse_type
    data['description'] = report.description
    data['handled'] = report.handled

    return data


class AbuseReportsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (AnonRateThrottle,)

    def post(self, request):
        """ Create abuse report.

        Permission checking:
        1. all user;
        """

        if not ENABLE_SHARE_LINK_REPORT_ABUSE:
            error_msg = 'Feature not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # argument check
        share_link_token = request.data.get('share_link_token', '')
        if not share_link_token:
            error_msg = 'share_link_token invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        abuse_type = request.data.get('abuse_type', '')
        if not abuse_type:
            error_msg = 'abuse_type invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if abuse_type not in (COPYRIGHT_ISSUE, VIRUS_ISSUE,
                              ABUSE_CONTENT_ISSUE, OTHER_ISSUE):
            error_msg = 'abuse_type invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        reporter = request.data.get('reporter', '')
        description = request.data.get('description', '')

        # resource check
        share_link = FileShare.objects.get_valid_file_link_by_token(share_link_token)
        if not share_link:
            error_msg = 'Share link %s not found.' % share_link_token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_id = share_link.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        file_path = share_link.path
        file_path = normalize_file_path(file_path)
        file_id = seafile_api.get_file_id_by_path(repo_id, file_path)

        if not file_id:
            # view file via shared dir
            req_path = request.data.get('file_path', '')
            if not req_path:
                file_id = None
            else:
                dir_path = normalize_file_path(share_link.path)
                file_path = posixpath.join(dir_path, normalize_file_path(req_path).lstrip('/'))
                file_id = seafile_api.get_file_id_by_path(repo_id, file_path)

        if not file_id:
            error_msg = 'File %s not found.' % file_path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            report = AbuseReport.objects.add_abuse_report(
                reporter, repo_id, repo.repo_name, file_path, abuse_type, description)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        info = get_abuse_report_info(report)
        return Response(info)
