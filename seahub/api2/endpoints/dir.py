# Copyright (c) 2012-2016 Seafile Ltd.
import os
import logging
import posixpath

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error
from seahub.api2.views import get_dir_recursively, \
    get_dir_entrys_by_id

from seahub.views import check_folder_permission
from seahub.utils import check_filename_with_rename
from seahub.utils.timeutils import timestamp_to_isoformat_timestr

from seaserv import seafile_api
from pysearpc import SearpcError

logger = logging.getLogger(__name__)

class DirView(APIView):
    """
    Support uniform interface for directory operations, including
    create/delete/rename/list, etc.
    """
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get_dir_info(self, repo_id, dir_path):

        dir_obj = seafile_api.get_dirent_by_path(repo_id, dir_path)
        dir_info = {
            'type': 'dir',
            'repo_id': repo_id,
            'parent_dir': os.path.dirname(dir_path.rstrip('/')),
            'obj_name': dir_obj.obj_name,
            'obj_id': dir_obj.obj_id,
            'mtime': timestamp_to_isoformat_timestr(dir_obj.mtime),
        }

        return dir_info

    def get(self, request, repo_id, format=None):
        """ Get dir info.

        Permission checking:
        1. user with either 'r' or 'rw' permission.
        """

        path = request.GET.get('p', '/')
        if path[-1] != '/':
            path = path + '/'

        # recource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            dir_id = seafile_api.get_dir_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not dir_id:
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not check_folder_permission(request, repo_id, path):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        old_oid = request.GET.get('oid', None)
        if old_oid and old_oid == dir_id:
            resp = Response({'success': True})
            resp["oid"] = dir_id
            return resp
        else:
            request_type = request.GET.get('t', None)
            if request_type and request_type not in ('f', 'd'):
                error_msg = "'t'(type) should be 'f' or 'd'."
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if request_type == 'd':
                recursive = request.GET.get('recursive', '0')
                if recursive not in ('1', '0'):
                    error_msg = "If you want to get recursive dir entries, you should set 'recursive' argument as '1'."
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

                if recursive == '1':
                    username = request.user.username
                    dir_list = get_dir_recursively(username, repo_id, path, [])
                    dir_list.sort(lambda x, y: cmp(x['name'].lower(), y['name'].lower()))

                    resp = Response(dir_list)
                    resp["oid"] = dir_id
                    resp["dir_perm"] = seafile_api.check_permission_by_path(repo_id, path, username)
                    return resp

            return get_dir_entrys_by_id(request, repo, path, dir_id, request_type)

    def post(self, request, repo_id, format=None):
        """ Create, rename dir.

        Permission checking:
        1. user with 'rw' permission.
        """

        # argument check
        path = request.GET.get('p', None)
        if not path or path[0] != '/':
            error_msg = 'p invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if path == '/':
            error_msg = 'Can not make or rename root dir.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        operation = request.data.get('operation', None)
        if not operation:
            error_msg = 'operation invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        operation = operation.lower()
        if operation not in ('mkdir', 'rename'):
            error_msg = "operation can only be 'mkdir', 'rename'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = path.rstrip('/')
        username = request.user.username
        parent_dir = os.path.dirname(path)
        if operation == 'mkdir':
            # permission check
            if check_folder_permission(request, repo_id, parent_dir) != 'rw':
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # resource check
            parent_dir_id = seafile_api.get_dir_id_by_path(repo_id, parent_dir)
            if not parent_dir_id:
                error_msg = 'Folder %s not found.' % parent_dir
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            new_dir_name = os.path.basename(path)
            new_dir_name = check_filename_with_rename(repo_id, parent_dir, new_dir_name)
            try:
                seafile_api.post_dir(repo_id, parent_dir, new_dir_name, username)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            new_dir_path = posixpath.join(parent_dir, new_dir_name)
            dir_info = self.get_dir_info(repo_id, new_dir_path)
            resp = Response(dir_info)

            return resp

        if operation == 'rename':
            # resource check
            dir_id = seafile_api.get_dir_id_by_path(repo_id, path)
            if not dir_id:
                error_msg = 'Folder %s not found.' % path
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            # permission check
            if check_folder_permission(request, repo_id, path) != 'rw':
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            old_dir_name = os.path.basename(path)
            new_dir_name = request.data.get('newname', None)
            if not new_dir_name:
                error_msg = 'newname invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if new_dir_name == old_dir_name:
                dir_info = self.get_dir_info(repo_id, path)
                resp = Response(dir_info)
                return resp

            try:
                # rename duplicate name
                new_dir_name = check_filename_with_rename(repo_id, parent_dir, new_dir_name)
                # rename dir
                seafile_api.rename_file(repo_id, parent_dir, old_dir_name,
                                        new_dir_name, username)

                new_dir_path = posixpath.join(parent_dir, new_dir_name)
                dir_info = self.get_dir_info(repo_id, new_dir_path)
                resp = Response(dir_info)
                return resp
            except SearpcError, e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

    def delete(self, request, repo_id, format=None):
        """ Delete dir.

        Permission checking:
        1. user with 'rw' permission.
        """

        # argument check
        path = request.GET.get('p', None)
        if not path:
            error_msg = 'p invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if path == '/':
            error_msg = 'Can not delete root path.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        dir_id = seafile_api.get_dir_id_by_path(repo_id, path)
        if not dir_id:
            return Response({'success': True})

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if check_folder_permission(request, repo_id, path) != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if path[-1] == '/':
            path = path[:-1]

        path = path.rstrip('/')
        username = request.user.username
        parent_dir = os.path.dirname(path)
        dir_name = os.path.basename(path)
        try:
            seafile_api.del_file(repo_id, parent_dir, dir_name, username)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
