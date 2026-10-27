# Copyright (c) 2012-2016 Seafile Ltd.
import logging
import posixpath

import dateutil.parser

from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

from seahub.settings import ENABLE_RESUMABLE_FILEUPLOAD

logger = logging.getLogger(__name__)
json_content_type = 'application/json; charset=utf-8'

class RepoFileUploadedBytesView(APIView):

    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id):
        """ For resumable fileupload

        Optional file_mtime is an ISO 8601 timestamp with timezone.
        """

        # argument check
        parent_dir = request.GET.get('parent_dir', None)
        if not parent_dir:
            error_msg = 'parent_dir invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        file_name = request.GET.get('file_name')
        if not file_name:
            error_msg = 'file_name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        file_mtime = request.GET.get('file_mtime')
        last_modify = 0
        if file_mtime:
            try:
                mtime = dateutil.parser.isoparse(file_mtime)
                if mtime.tzinfo is None:
                    raise ValueError('Timezone is required.')
                last_modify = int(mtime.timestamp())
            except (TypeError, ValueError, OverflowError):
                error_msg = 'file_mtime invalid, should be ISO 8601 format with timezone.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not seafile_api.get_dir_id_by_path(repo_id, parent_dir):
            error_msg = 'Folder %s not found.' % parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        file_path = posixpath.join(parent_dir, file_name)
        try:
            uploadedBytes = seafile_api.get_upload_tmp_file_offset(repo_id, file_path, last_modify)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        response = Response({"uploadedBytes": uploadedBytes})
        if ENABLE_RESUMABLE_FILEUPLOAD:
            response["Accept-Ranges"] = "bytes"

        return response
