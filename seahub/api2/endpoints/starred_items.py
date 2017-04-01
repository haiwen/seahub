# Copyright (c) 2012-2016 Seafile Ltd.
import os
import logging
import posixpath

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api

from seahub.api2.utils import api_error
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.utils import is_org_context
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.views import check_folder_permission

from seahub.base.models import UserStarredFiles

logger = logging.getLogger(__name__)

def check_args(func):
    """
    Decorator for check args of StarredItems api
    """
    def _decorated(view, request):

        # argument check
        repo_id = request.data.get('repo_id', None)
        if not repo_id:
            error_msg = 'repo_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        path = request.data.get('path', None)
        if not path:
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # permission check
        if not check_folder_permission(request, repo_id, path):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        return func(view, request)

    return _decorated

class StarredItems(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get_starred_item_info(self, starred_item):
        result = {}
        result['email'] = starred_item.email
        result['repo_id'] = starred_item.repo_id
        result['path'] = starred_item.path
        result['is_dir'] = starred_item.is_dir
        return result

    def get(self, request):
        """ List all starred file/folder.

        Permission checking:
        1. all authenticated user can perform this action.
        """

        result = []
        email = request.user.username
        all_starred_items = UserStarredFiles.objects.filter(email=email)

        for starred_item in all_starred_items:
            repo_id = starred_item.repo_id
            path = starred_item.path

            repo = seafile_api.get_repo(repo_id)
            if not repo:
                starred_item.delete()
                continue

            if starred_item.is_dir:
                dir_id = seafile_api.get_dir_id_by_path(repo_id, path)
                if not dir_id:
                    starred_item.delete()
                    continue
            else:
                file_id = seafile_api.get_file_id_by_path(repo_id, path)
                if not file_id:
                    starred_item.delete()
                    continue

            item_info = self.get_starred_item_info(starred_item)

            dirent = seafile_api.get_dirent_by_path(repo_id, path)
            if dirent:
                item_info['mtime'] = timestamp_to_isoformat_timestr(dirent.mtime)
            else:
                item_info['mtime'] = 0

            repo = seafile_api.get_repo(repo_id)
            item_info['repo_name'] = repo.repo_name
            item_info['obj_name'] = os.path.basename(path.rstrip('/'))

            result.append(item_info)

        result.sort(lambda x, y: cmp(y['mtime'], x['mtime']))
        return Response(result)

    @check_args
    def post(self, request):
        """ Star a file/folder.

        Permission checking:
        1. all authenticated user can perform this action.
        2. r/rw permission
        """

        repo_id = request.data.get('repo_id', None)
        path = request.data.get('path', None)
        is_dir = request.data.get('is_dir', None)

        if not is_dir:
            error_msg = 'is_dir invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        is_dir = is_dir.lower()
        if is_dir not in ('true', 'false'):
            error_msg = "is_dir should be 'true' or 'false'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            if is_dir == 'true':
                dir_id = seafile_api.get_dir_id_by_path(repo_id, path)
                if not dir_id:
                    error_msg = 'Folder %s not found.' % path
                    return api_error(status.HTTP_404_NOT_FOUND, error_msg)
            else:
                file_id = seafile_api.get_file_id_by_path(repo_id, path)
                if not file_id:
                    error_msg = 'File %s not found.' % path
                    return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # star a item
        email = request.user.username
        try:
            starred_item = UserStarredFiles.objects.add(email, repo_id, path, is_dir)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # get info of new starred item
        item_info = self.get_starred_item_info(starred_item)
        return Response(item_info)

    @check_args
    def delete(self, request):
        """ Unstar a file/folder.

        Permission checking:
        1. all authenticated user can perform this action.
        2. r/rw permission
        """

        repo_id = request.data.get('repo_id', None)
        path = request.data.get('path', None)
        is_dir = request.data.get('is_dir', None)

        # star a item
        email = request.user.username
        try:
            UserStarredFiles.objects.delete(email, repo_id, path, is_dir)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
