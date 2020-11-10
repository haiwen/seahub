# Copyright (c) 2012-2016 Seafile Ltd.

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status


from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

from seahub.views import check_folder_permission
from seahub.utils.timeutils import timestamp_to_isoformat_timestr

try:
    from seahub.settings import CLOUD_MODE
except ImportError:
    CLOUD_MODE = False


class SearchFile(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, format=None):
        """  Search file by name.
        """

        # argument check
        repo_id = request.GET.get('repo_id', None)
        if not repo_id:
            error_msg = 'repo_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        file_name = request.GET.get('file_name', None)
        if not file_name:
            error_msg = 'file_name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        if not seafile_api.get_repo(repo_id):
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not check_folder_permission(request, repo_id, '/'):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        result = []
        searched_files = seafile_api.search_files(repo_id, file_name)

        for searched_file in searched_files:
            # {'path': '/123.docx', 'size': 19446, 'mtime': 1604130882, 'is_dir': False}
            file_info = {}
            file_info['path'] = searched_file.path
            file_info['size'] = searched_file.size
            file_info['mtime'] = timestamp_to_isoformat_timestr(searched_file.mtime)
            file_info['type'] = 'folder' if searched_file.is_dir else 'file'
            result.append(file_info)

        return Response({'data': result})
