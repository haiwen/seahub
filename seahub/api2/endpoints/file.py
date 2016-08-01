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

from seahub.utils import check_filename_with_rename, is_pro_version
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.views import check_folder_permission, check_file_lock

from seahub.settings import MAX_UPLOAD_FILE_NAME_LEN, FILE_LOCK_EXPIRATION_DAYS

from seaserv import seafile_api
from pysearpc import SearpcError

logger = logging.getLogger(__name__)


class FileView(APIView):
    """
    Support uniform interface for file related operations,
    including create/delete/rename/view, etc.
    """

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get_file_info(self, username, repo_id, file_path):

        file_obj = seafile_api.get_dirent_by_path(repo_id, file_path)
        is_locked, locked_by_me = check_file_lock(repo_id, file_path, username)
        file_info = {
            'type': 'file',
            'repo_id': repo_id,
            'parent_dir': os.path.dirname(file_path),
            'obj_name': file_obj.obj_name,
            'obj_id': file_obj.obj_id,
            'size': file_obj.size,
            'mtime': timestamp_to_isoformat_timestr(file_obj.mtime),
            'is_locked': is_locked,
        }

        return file_info

    def get(self, request, repo_id, format=None):
        """ Get file info.

        Permission checking:
        1. user with either 'r' or 'rw' permission.
        """

        # argument check
        path = request.GET.get('p', None)
        if not path:
            error_msg = 'p invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            file_id = seafile_api.get_file_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not file_id:
            error_msg = 'File %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        parent_dir = os.path.dirname(path)
        if check_folder_permission(request, repo_id, parent_dir) is None:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        file_info = self.get_file_info(request.user.username, repo_id, path)
        return Response(file_info)

    def post(self, request, repo_id, format=None):
        """ Create, rename, move, copy file

        Permission checking:
        1. create: user with 'rw' permission for current parent dir;
        2. rename: user with 'rw' permission for current file;
        3. move  : user with 'rw' permission for current file, 'rw' permission for dst parent dir;
        4. copy  : user with 'r' permission for current file, 'rw' permission for dst parent dir;
        """

        # argument check
        path = request.GET.get('p', None)
        if not path or path[0] != '/':
            error_msg = 'p invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        operation = request.data.get('operation', None)
        if not operation:
            error_msg = 'operation invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        operation = operation.lower()
        if operation not in ('create', 'rename', 'move', 'copy'):
            error_msg = "operation can only be 'create', 'rename', 'move' or 'copy'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        username = request.user.username
        parent_dir = os.path.dirname(path)

        if operation == 'create':
            # resource check
            try:
                parent_dir_id = seafile_api.get_dir_id_by_path(repo_id, parent_dir)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            if not parent_dir_id:
                error_msg = 'Folder %s not found.' % parent_dir
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            # permission check
            if check_folder_permission(request, repo_id, parent_dir) != 'rw':
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # create file
            new_file_name = os.path.basename(path)
            new_file_name = check_filename_with_rename(repo_id, parent_dir, new_file_name)

            try:
                seafile_api.post_empty_file(repo_id, parent_dir, new_file_name, username)
            except SearpcError, e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            new_file_path = posixpath.join(parent_dir, new_file_name)
            file_info = self.get_file_info(username, repo_id, new_file_path)
            return Response(file_info)

        if operation == 'rename':
            # argument check
            new_file_name = request.data.get('newname', None)
            if not new_file_name:
                error_msg = 'newname invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if len(new_file_name) > MAX_UPLOAD_FILE_NAME_LEN:
                error_msg = 'newname is too long.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            oldname = os.path.basename(path)
            if oldname == new_file_name:
                error_msg = 'The new name is the same to the old'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            # resource check
            try:
                file_id = seafile_api.get_file_id_by_path(repo_id, path)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            if not file_id:
                error_msg = 'File %s not found.' % path
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            # permission check
            if check_folder_permission(request, repo_id, parent_dir) != 'rw':
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # rename file
            new_file_name = check_filename_with_rename(repo_id, parent_dir,
                    new_file_name)
            try:
                seafile_api.rename_file(repo_id, parent_dir, oldname,
                        new_file_name, username)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            new_file_path = posixpath.join(parent_dir, new_file_name)
            file_info = self.get_file_info(username, repo_id, new_file_path)
            return Response(file_info)

        if operation == 'move':
            # argument check
            dst_repo_id = request.data.get('dst_repo', None)
            dst_dir = request.data.get('dst_dir', None)
            if not dst_repo_id:
                error_msg = 'dst_repo invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if not dst_dir:
                error_msg = 'dst_dir invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            # resource check for source file
            try:
                file_id = seafile_api.get_file_id_by_path(repo_id, path)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            if not file_id:
                error_msg = 'File %s not found.' % path
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            # resource check for dst repo and dir
            dst_repo = seafile_api.get_repo(dst_repo_id)
            if not dst_repo:
                error_msg = 'Library %s not found.' % dst_repo_id
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            dst_dir_id = seafile_api.get_dir_id_by_path(dst_repo_id, dst_dir)
            if not dst_dir_id:
                error_msg = 'Folder %s not found.' % dst_dir
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            # permission check for source file
            src_repo_id = repo_id
            src_dir = os.path.dirname(path)
            if check_folder_permission(request, src_repo_id, src_dir) != 'rw':
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # permission check for dst dir
            if check_folder_permission(request, dst_repo_id, dst_dir) != 'rw':
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # move file
            if dst_dir[-1] != '/': # Append '/' to the end of directory if necessary
                dst_dir += '/'

            if src_repo_id == dst_repo_id and src_dir == dst_dir:
                file_info = self.get_file_info(username, repo_id, path)
                return Response(file_info)

            filename = os.path.basename(path)
            new_file_name = check_filename_with_rename(dst_repo_id, dst_dir, filename)
            try:
                seafile_api.move_file(src_repo_id, src_dir, filename,
                        dst_repo_id, dst_dir, new_file_name, replace=False,
                        username=username, need_progress=0, synchronous=1)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            dst_file_path = posixpath.join(dst_dir, new_file_name)
            dst_file_info = self.get_file_info(username, dst_repo_id, dst_file_path)
            return Response(dst_file_info)

        if operation == 'copy':
            # argument check
            dst_repo_id = request.data.get('dst_repo', None)
            dst_dir = request.data.get('dst_dir', None)
            if not dst_repo_id:
                error_msg = 'dst_repo_id invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if not dst_dir:
                error_msg = 'dst_dir invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            # resource check for source file
            try:
                file_id = seafile_api.get_file_id_by_path(repo_id, path)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            if not file_id:
                error_msg = 'File %s not found.' % path
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            # resource check for dst repo and dir
            dst_repo = seafile_api.get_repo(dst_repo_id)
            if not dst_repo:
                error_msg = 'Library %s not found.' % dst_repo_id
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            dst_dir_id = seafile_api.get_dir_id_by_path(dst_repo_id, dst_dir)
            if not dst_dir_id:
                error_msg = 'Folder %s not found.' % dst_dir
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            # permission check for source file
            src_repo_id = repo_id
            src_dir = os.path.dirname(path)
            if not check_folder_permission(request, src_repo_id, src_dir):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # permission check for dst dir
            if check_folder_permission(request, dst_repo_id, dst_dir) != 'rw':
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # copy file
            if dst_dir[-1] != '/': # Append '/' to the end of directory if necessary
                dst_dir += '/'

            if src_repo_id == dst_repo_id and src_dir == dst_dir:
                file_info = self.get_file_info(username, repo_id, path)
                return Response(file_info)

            filename = os.path.basename(path)
            new_file_name = check_filename_with_rename(dst_repo_id, dst_dir, filename)
            try:
                seafile_api.copy_file(src_repo_id, src_dir, filename, dst_repo_id,
                          dst_dir, new_file_name, username, 0, synchronous=1)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            dst_file_path = posixpath.join(dst_dir, new_file_name)
            dst_file_info = self.get_file_info(username, dst_repo_id, dst_file_path)
            return Response(dst_file_info)

    def put(self, request, repo_id, format=None):
        """ Currently only for lock and unlock file operation.

        Permission checking:
        1. user with 'rw' permission for current file;
        """

        if not is_pro_version():
            error_msg = 'file lock feature only supported in professional edition.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # argument check
        path = request.GET.get('p', None)
        if not path:
            error_msg = 'p invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        operation = request.data.get('operation', None)
        if not operation:
            error_msg = 'operation invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        operation = operation.lower()
        if operation not in ('lock', 'unlock'):
            error_msg = "operation can only be 'lock', or 'unlock'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        file_id = seafile_api.get_file_id_by_path(repo_id, path)
        if not file_id:
            error_msg = 'File %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        parent_dir = os.path.dirname(path)
        if check_folder_permission(request, repo_id, parent_dir) != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.user.username
        is_locked, locked_by_me = check_file_lock(repo_id, path, username)
        if operation == 'lock':
            if not is_locked:
                # lock file
                expire = request.data.get('expire', FILE_LOCK_EXPIRATION_DAYS)
                try:
                    seafile_api.lock_file(repo_id, path.lstrip('/'), username, expire)
                except SearpcError, e:
                    logger.error(e)
                    error_msg = 'Internal Server Error'
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if operation == 'unlock':
            if is_locked:
                if not locked_by_me:
                    error_msg = 'You can not unlock this file.'
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)

                # unlock file
                try:
                    seafile_api.unlock_file(repo_id, path.lstrip('/'))
                except SearpcError, e:
                    logger.error(e)
                    error_msg = 'Internal Server Error'
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        file_info = self.get_file_info(username, repo_id, path)
        return Response(file_info)

    def delete(self, request, repo_id, format=None):
        """ Delete file.

        Permission checking:
        1. user with 'rw' permission.
        """

        # argument check
        path = request.GET.get('p', None)
        if not path:
            error_msg = 'p invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        file_id = seafile_api.get_file_id_by_path(repo_id, path)
        if not file_id:
            return Response({'success': True})

        # permission check
        parent_dir = os.path.dirname(path)
        if check_folder_permission(request, repo_id, parent_dir) != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # delete file
        file_name = os.path.basename(path)
        try:
            seafile_api.del_file(repo_id, parent_dir,
                                 file_name, request.user.username)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
