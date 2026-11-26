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
from seahub.search.utils import get_invisible_repos_info_by_username, is_invisible_repo_path
from seahub.utils import is_org_context

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

        q = request.GET.get('q', None)
        if not q:
            error_msg = 'q invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not check_folder_permission(request, repo_id, '/'):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        file_list = []
        folder_list = []

        searched_files = seafile_api.search_files(repo_id, q)
        username = request.user.username
        org_id = request.user.org.org_id if is_org_context(request) else None
        repo_id_to_invisible_paths = get_invisible_repos_info_by_username(username, org_id)

        for searched_file in searched_files:
            if is_invisible_repo_path(repo_id_to_invisible_paths, repo, searched_file.path):
                continue

            # {'path': '/123.docx', 'size': 19446, 'mtime': 1604130882, 'is_dir': False}
            dirent_info = {}
            dirent_info['path'] = searched_file.path
            dirent_info['size'] = searched_file.size
            dirent_info['mtime'] = timestamp_to_isoformat_timestr(searched_file.mtime)

            if searched_file.is_dir:
                dirent_info['type'] = 'folder'
                folder_list.append(dirent_info)
            else:
                dirent_info['type'] = 'file'
                file_list.append(dirent_info)

        folder_list.sort(key=lambda x: x['mtime'], reverse=True)
        file_list.sort(key=lambda x: x['mtime'], reverse=True)

        return Response({'data': folder_list + file_list})
