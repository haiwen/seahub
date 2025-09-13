# -*- coding: utf-8 -*-
import json
import logging

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.views import check_folder_permission
from seahub.constants import PERMISSION_READ_WRITE

logger = logging.getLogger(__name__)


class CrossUsersCopyView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def post(self, request):
        """Asynchronous multi copy files/folders.
        Permission check:
        User must has `rw` permission for dst folder.

        Parameter:
        {
            "src_repo_id":"201f7977-a22e-4861-b7ec-f8b7da947058",
            "src_parent_dir":"/a/b/c/",
            "src_dirents":["1.md", "2.md"],

            "dst_repo_id":"301f7977-a22e-4861-b7ec-f8b7da947059",
            "dst_parent_dir":"/x/y/",
        }
        """
        # argument check
        src_repo_id = request.data.get('src_repo_id', None)
        if not src_repo_id:
            error_msg = 'src_repo_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        src_parent_dir = request.data.get('src_parent_dir', None)
        if not src_parent_dir:
            error_msg = 'src_parent_dir invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        src_dirents = request.data.get('src_dirents', None)
        if not src_dirents:
            error_msg = 'src_dirents invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        dst_repo_id = request.data.get('dst_repo_id', None)
        if not dst_repo_id:
            error_msg = 'dst_repo_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        dst_parent_dir = request.data.get('dst_parent_dir', None)
        if not dst_parent_dir:
            error_msg = 'dst_parent_dir invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        if not seafile_api.get_repo(src_repo_id):
            error_msg = 'Library %s not found.' % src_repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not seafile_api.get_dir_id_by_path(src_repo_id, src_parent_dir):
            error_msg = 'Folder %s not found.' % src_parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not seafile_api.get_repo(dst_repo_id):
            error_msg = 'Library %s not found.' % dst_repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not seafile_api.get_dir_id_by_path(dst_repo_id, dst_parent_dir):
            error_msg = 'Folder %s not found.' % dst_parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        # User must have `rw` permission for dst parent dir.
        dst_parent_permission = check_folder_permission(request, dst_repo_id, dst_parent_dir)
        if dst_parent_permission != PERMISSION_READ_WRITE:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.user.username
        try:
            res = seafile_api.copy_file(
                src_repo_id, src_parent_dir, json.dumps(src_dirents),
                dst_repo_id, dst_parent_dir, json.dumps(src_dirents),
                username=username, need_progress=1, synchronous=0)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        result = dict()
        result['task_id'] = res.task_id if res.background else ''
        return Response(result)
