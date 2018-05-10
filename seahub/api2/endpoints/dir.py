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
from seahub.api2.views import get_dir_file_recursively, \
    get_dir_entrys_by_id

from seahub.views import check_folder_permission
from seahub.utils import check_filename_with_rename, is_valid_dirent_name, \
        normalize_dir_path
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

        # argument check
        recursive = request.GET.get('recursive', '0')
        if recursive not in ('1', '0'):
            error_msg = "If you want to get recursive dir entries, you should set 'recursive' argument as '1'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        request_type = request.GET.get('t', '')
        if request_type and request_type not in ('f', 'd'):
            error_msg = "'t'(type) should be 'f' or 'd'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # recource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = request.GET.get('p', '/')
        path = normalize_dir_path(path)

        dir_id = seafile_api.get_dir_id_by_path(repo_id, path)
        if not dir_id:
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        permission = check_folder_permission(request, repo_id, path)
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        old_oid = request.GET.get('oid', None)
        if old_oid and old_oid == dir_id:
            resp = Response({'success': True})
            resp["oid"] = dir_id
            return resp

        if recursive == '1':
            result = []
            username = request.user.username
            dir_file_list = get_dir_file_recursively(username, repo_id, path, [])
            if request_type == 'f':
                for item in dir_file_list:
                    if item['type'] == 'file':
                        result.append(item)
            elif request_type == 'd':
                for item in dir_file_list:
                    if item['type'] == 'dir':
                        result.append(item)
            else:
                result = dir_file_list

            resp = Response(result)
            resp["oid"] = dir_id
            resp["dir_perm"] = permission
            return resp

        return get_dir_entrys_by_id(request, repo, path, dir_id, request_type)

    def post(self, request, repo_id, format=None):
        """ Create, rename, revert dir.

        Permission checking:
        1. create: user with 'rw' permission for current dir's parent dir;
        2. rename: user with 'rw' permission for current dir;
        3. revert: user with 'rw' permission for current dir's parent dir;
        """

        # argument check
        path = request.GET.get('p', None)
        if not path or path[0] != '/':
            error_msg = 'p invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if path == '/':
            error_msg = 'Can not operate root dir.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        operation = request.data.get('operation', None)
        if not operation:
            error_msg = 'operation invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        operation = operation.lower()
        if operation not in ('mkdir', 'rename', 'revert'):
            error_msg = "operation can only be 'mkdir', 'rename' or 'revert'."
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
            # resource check
            parent_dir_id = seafile_api.get_dir_id_by_path(repo_id, parent_dir)
            if not parent_dir_id:
                error_msg = 'Folder %s not found.' % parent_dir
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            # permission check
            if check_folder_permission(request, repo_id, parent_dir) != 'rw':
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            new_dir_name = os.path.basename(path)

            if not is_valid_dirent_name(new_dir_name):
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'name invalid.')

            retry_count = 0
            while retry_count < 10:
                new_dir_name = check_filename_with_rename(repo_id,
                        parent_dir, new_dir_name)
                try:
                    seafile_api.post_dir(repo_id,
                            parent_dir, new_dir_name, username)
                    break
                except SearpcError as e:
                    if str(e) == 'file already exists':
                        retry_count += 1
                    else:
                        logger.error(e)
                        error_msg = 'Internal Server Error'
                        return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                                error_msg)

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

            if not is_valid_dirent_name(new_dir_name):
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'name invalid.')

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

        if operation == 'revert':
            commit_id = request.data.get('commit_id', None)
            if not commit_id:
                error_msg = 'commit_id invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if seafile_api.get_dir_id_by_path(repo_id, path):
                # dir exists in repo
                if check_folder_permission(request, repo_id, path) != 'rw':
                    error_msg = 'Permission denied.'
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)
            else:
                # dir NOT exists in repo
                if check_folder_permission(request, repo_id, '/') != 'rw':
                    error_msg = 'Permission denied.'
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            try:
                seafile_api.revert_dir(repo_id, commit_id, path, username)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            return Response({'success': True})

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
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

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


class DirDetailView(APIView):
    """ Get detailed info of a folder.
    """
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id):
        """ Get dir info.

        Permission checking:
        1. user with either 'r' or 'rw' permission.
        """

        # parameter check
        path = request.GET.get('path', None)
        if not path:
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        path = normalize_dir_path(path)
        if path == '/':
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        dir_id = seafile_api.get_dir_id_by_path(repo_id, path)
        if not dir_id:
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not check_folder_permission(request, repo_id, path):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            dir_obj = seafile_api.get_dirent_by_path(repo_id, path)
            count_info = seafile_api.get_file_count_info_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        dir_info = {
            'repo_id': repo_id,
            'path': path,
            'name': dir_obj.obj_name,
            'file_count': count_info.file_count,
            'dir_count': count_info.dir_count,
            'size': count_info.size,
            'mtime': timestamp_to_isoformat_timestr(dir_obj.mtime),
        }

        return Response(dir_info)
