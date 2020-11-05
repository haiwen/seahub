# Copyright (c) 2012-2019 Seafile Ltd.
# encoding: utf-8

import stat
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error
from seahub.views import check_folder_permission
from seaserv import seafile_api
from seahub.utils import normalize_dir_path

logger = logging.getLogger(__name__)


class RepoCommitDirView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def _get_item_info(self, dirent, path):

        # # seahub/seahub/api2/views get_dir_file_recursively
        entry = {}
        if stat.S_ISDIR(dirent.mode):
            entry['type'] = 'dir'
        else:
            entry['type'] = 'file'
            entry['size'] = dirent.size

        entry['parent_dir'] = path
        entry['obj_id'] = dirent.obj_id
        entry['name'] = dirent.obj_name

        return entry

    def get(self, request, repo_id, commit_id, format=None):
        """ List dir by commit
        used when get files/dirs in a trash or history dir

        Permission checking:
        1. all authenticated user can perform this action.
        """

        # argument check
        path = request.GET.get('path', '/')
        path = normalize_dir_path(path)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        commit = seafile_api.get_commit(repo.id, repo.version, commit_id)
        if not commit:
            error_msg = 'Commit %s not found.' % commit_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        dir_id = seafile_api.get_dir_id_by_commit_and_path(repo_id, commit_id, path)
        if not dir_id:
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not check_folder_permission(request, repo_id, '/'):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # # seafile_api.list_dir_by_commit_and_path
        # def list_dir_by_commit_and_path(self, repo_id, commit_id, path, offset=-1, limit=-1):
        #     dir_id = seafserv_threaded_rpc.get_dir_id_by_commit_and_path(repo_id, commit_id, path)
        #     if dir_id is None:
        #         return None
        #     return seafserv_threaded_rpc.list_dir(repo_id, dir_id, offset, limit)

        dir_entries = seafile_api.list_dir_by_dir_id(repo_id, dir_id)

        items = []
        for dirent in dir_entries:
            items.append(self._get_item_info(dirent, path))

        return Response({'dirent_list': items})
