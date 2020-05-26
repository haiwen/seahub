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
from seahub.api2.utils import api_error, to_python_boolean
from seahub.utils import get_virus_record, get_virus_record_by_id, handle_virus_record, update_virus_record

logger = logging.getLogger(__name__)


class AdminVirusScanRecords(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """get virus scan records
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

        try:
            has_handled = to_python_boolean(request.GET.get('has_handled', ''))
        except ValueError:
            has_handled = None

        start = (page - 1) * per_page
        count = per_page + 1

        try:
            virus_records = get_virus_record(has_handled=has_handled, start=start, limit=count)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if len(virus_records) > per_page:
            virus_records = virus_records[:per_page]
            has_next_page = True
        else:
            has_next_page = False

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
                record["has_deleted"] = virus_record.has_deleted
                record["has_ignored"] = virus_record.has_ignored
                record["virus_id"] = virus_record.vid
                record_list.append(record)

        return Response({"record_list": record_list, "has_next_page": has_next_page}, status=status.HTTP_200_OK)


class AdminVirusScanRecord(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def delete(self, request, virus_id):

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        virus_record = get_virus_record_by_id(virus_id)
        if not virus_record:
            error_msg = 'Virus record %d not found.' % virus_id
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
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({"success": True}, status=status.HTTP_200_OK)

    def put(self, request, virus_id):

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        ignore = request.data.get('ignore')
        if ignore not in ('true', 'false'):
            error_msg = 'ignore invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        ignore = to_python_boolean(ignore)

        virus_record = get_virus_record_by_id(virus_id)
        if not virus_record:
            error_msg = 'Virus record %d not found.' % virus_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            update_virus_record(virus_id, ignore)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        virus_record = get_virus_record_by_id(virus_id)

        return Response({"has_ignored": virus_record.has_ignored}, status=status.HTTP_200_OK)
