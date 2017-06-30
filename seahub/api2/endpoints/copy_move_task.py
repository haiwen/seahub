# Copyright (c) 2012-2016 Seafile Ltd.
import posixpath
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.utils.translation import ugettext as _
from django.utils.html import escape

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error
from seahub.signals import rename_dirent_successful

from seahub.views import check_folder_permission
from seahub.utils import check_filename_with_rename
from seahub.settings import MAX_PATH

from seaserv import seafile_api

logger = logging.getLogger(__name__)

class CopyMoveTaskView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        """ Copy/move file/dir, and return task id.

        Permission checking:
        1. move: user with 'rw' permission for current file, 'rw' permission for dst parent dir;
        2. copy: user with 'r' permission for current file, 'rw' permission for dst parent dir;
        """
        src_repo_id = request.data.get('src_repo_id', None)
        src_parent_dir = request.data.get('src_parent_dir', None)
        src_dirent_name = request.data.get('src_dirent_name', None)
        dst_repo_id = request.data.get('dst_repo_id', None)
        dst_parent_dir = request.data.get('dst_parent_dir', None)
        operation = request.data.get('operation', None)
        dirent_type = request.data.get('dirent_type', None)

        # argument check
        if not src_repo_id:
            error_msg = 'src_repo_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not src_parent_dir:
            error_msg = 'src_parent_dir invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not src_dirent_name:
            error_msg = 'src_dirent_name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not dst_repo_id:
            error_msg = 'dst_repo_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not dst_parent_dir:
            error_msg = 'dst_parent_dir invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not operation:
            error_msg = 'operation invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not dirent_type:
            error_msg = 'dirent_type invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if src_repo_id == dst_repo_id and  src_parent_dir == dst_parent_dir:
            error_msg = _('Invalid destination path')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if len(dst_parent_dir + src_dirent_name) > MAX_PATH:
            error_msg = _('Destination path is too long.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        operation = operation.lower()
        if operation not in ('move', 'copy'):
            error_msg = "operation can only be 'move' or 'copy'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        dirent_type = dirent_type.lower()
        if dirent_type not in ('file', 'dir'):
            error_msg = "operation can only be 'file' or 'dir'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # src resource check
        src_dirent_path = posixpath.join(src_parent_dir, src_dirent_name)
        if dirent_type == 'file':
            if not seafile_api.get_file_id_by_path(src_repo_id,
                    src_dirent_path):
                error_msg = 'File %s not found.' % src_dirent_path
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if dirent_type == 'dir':
            if not seafile_api.get_dir_id_by_path(src_repo_id,
                    src_dirent_path):
                error_msg = 'Folder %s not found.' % src_dirent_path
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # dst resource check
        if not seafile_api.get_dir_id_by_path(dst_repo_id,
                dst_parent_dir):
            error_msg = 'Folder %s not found.' % dst_parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check for dst parent dir
        if check_folder_permission(request, dst_repo_id, dst_parent_dir) != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        new_dirent_name = check_filename_with_rename(dst_repo_id,
                dst_parent_dir, src_dirent_name)

        username = request.user.username
        if operation == 'move':
            if dirent_type == 'dir' and src_repo_id == dst_repo_id and \
                    dst_parent_dir.startswith(src_dirent_path + '/'):

                error_msg = _(u'Can not move directory %(src)s to its subdirectory %(des)s') \
                    % {'src': escape(src_dirent_path), 'des': escape(dst_parent_dir)}
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            # permission check for src parent dir
            if check_folder_permission(request, src_repo_id, src_parent_dir) != 'rw':
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            try:
                res = seafile_api.move_file(src_repo_id, src_parent_dir,
                        src_dirent_name, dst_repo_id, dst_parent_dir,
                        new_dirent_name, replace=False, username=username,
                        need_progress=1)
                is_dir = True if dirent_type == 'dir' else False
                rename_dirent_successful.send(sender=None, src_repo_id=src_repo_id,
                        src_parent_dir=src_parent_dir, src_filename=src_dirent_name,
                        dst_repo_id=dst_repo_id, dst_parent_dir=dst_parent_dir,
                        dst_filename=dst_dirent_name, is_dir=is_dir)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if operation == 'copy':
            # permission check for src parent dir
            if not check_folder_permission(request, src_repo_id, src_parent_dir):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            try:
                res = seafile_api.copy_file(src_repo_id, src_parent_dir,
                        src_dirent_name, dst_repo_id, dst_parent_dir,
                        new_dirent_name, username=username,
                        need_progress=1)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not res:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        result = {}
        if res.background:
            result['task_id'] = res.task_id

        return Response(result)

    def delete(self, request):
        """ Cancel file/dir mv/cp.

        Permission checking:
        1. user login;
        """

        # argument check
        task_id = request.data.get('task_id')
        if not task_id:
            error_msg = 'task_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            res = seafile_api.cancel_copy_task(task_id) # returns 0 or -1
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if res == 0:
            return Response({'success': True})
        else:
            error_msg = _('Cancel failed')
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
