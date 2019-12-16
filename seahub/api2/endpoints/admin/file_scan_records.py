# Copyright (c) 2012-2016 Seafile Ltd.
import logging
import json

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.permissions import IsProVersion
from seahub.api2.utils import api_error
from seahub.utils import get_file_scan_record

from seaserv import seafile_api

logger = logging.getLogger(__name__)


class AdminFileScanRecords(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """get file content scan records
        """

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            page = int(request.GET.get('page', ''))
        except ValueError:
            page = 1

        try:
            per_page = int(request.GET.get('per_page', ''))
        except ValueError:
            per_page = 25

        start = (page - 1) * per_page
        count = per_page

        try:
            record_list = get_file_scan_record(start, count)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        for record in record_list:
            repo = seafile_api.get_repo(record["repo_id"])
            if not repo:
                record["repo_name"] = ""
            else:
                record["repo_name"] = repo.name
            record_detail = json.loads(record['detail'])
            detail_dict = list(record_detail.values())[0]
            detail = dict()
            detail["suggestion"] = detail_dict["suggestion"]
            detail["label"] = detail_dict["label"]
            record["detail"] = detail

        return Response({"record_list": record_list}, status=status.HTTP_200_OK)
