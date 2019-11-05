# -*- coding: utf-8 -*-
import os
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.permissions import IsProVersion
from seahub.api2.utils import api_error
from seahub.utils import get_virus_record, get_virus_record_by_id, handle_virus_record

logger = logging.getLogger(__name__)


class AdminVirusScanRecords(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """get virus scan records
        """
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
            virus_records = get_virus_record(start=start, limit=count)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        record_list = list()
        for virus_record in virus_records:
            try:
                repo = seafile_api.get_repo(virus_record.repo_id)
                repo_owner = seafile_api.get_repo_owner(virus_record.repo_id)
            except Exception as e:
                logger.error(e)
                continue

            if not repo:
                continue
            else:
                record = dict()
                record["repo_name"] = repo.name
                record["repo_owner"] = repo_owner
                record["file_path"] = virus_record.file_path
                record["has_handle"] = virus_record.has_handle
                record["virus_id"] = virus_record.vid
                record_list.append(record)

        return Response({"record_list": record_list}, status=status.HTTP_200_OK)


class AdminVirusScanRecord(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def delete(self, request, virus_id):
        virus_record = get_virus_record_by_id(virus_id)
        if not virus_record:
            error_msg = 'Virus file %d not found.' % virus_record.file_path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        parent_dir = os.path.dirname(virus_record.file_path)
        filename = os.path.basename(virus_record.file_path)
        try:
            seafile_api.del_file(
                virus_record.repo_id, parent_dir, filename, request.user.username
            )
            handle_virus_record(virus_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Failed to delete, please try again later.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({"success": True}, status=status.HTTP_200_OK)
