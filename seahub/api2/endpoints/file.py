import os
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error
from seahub.api2.views import reloaddir, get_shared_link

from seahub.utils import gen_file_get_url, EMPTY_SHA1, \
    check_filename_with_rename
from seahub.views import check_folder_permission, check_file_lock
from seahub.views.file import send_file_access_msg

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

    def get(self, request, repo_id, format=None):

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = request.GET.get('p', None)
        if not path:
            error_msg = 'p invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            file_id = seafile_api.get_file_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not file_id:
            error_msg = 'File %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if check_folder_permission(request, repo_id, path) is None:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # send stats message
        send_file_access_msg(request, repo, path, 'api')
        op = request.GET.get('op', 'download')
        if op == 'download':
            reuse = request.GET.get('reuse', '0')
            if reuse not in ('1', '0'):
                error_msg = "If you want to reuse file server access token for download file, you should set 'reuse' argument as '1'."
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            use_onetime = False if reuse == '1' else True

            file_name = os.path.basename(path)
            token = seafile_api.get_fileserver_access_token(repo_id,
                file_id, op, request.user.username, use_onetime)
            redirect_url = gen_file_get_url(token, file_name)

            return Response({"url": redirect_url})

        elif op == 'downloadblks':
            blklist = []
            encrypted = False
            enc_version = 0
            if file_id != EMPTY_SHA1:
                try:
                    blks = seafile_api.list_blocks_by_file_id(repo_id, file_id)
                    blklist = blks.split('\n')
                except SearpcError as e:
                    logger.error(e)
                    error_msg = 'Internal Server Error'
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            blklist = [i for i in blklist if len(i) == 40]
            if len(blklist) > 0:
                repo = seafile_api.get_repo(repo_id)
                encrypted = repo.encrypted
                enc_version = repo.enc_version

            res = {
                'file_id': file_id,
                'blklist': blklist,
                'encrypted': encrypted,
                'enc_version': enc_version,
                }

            return Response(res)

        elif op == 'sharelink':
            link = get_shared_link(request, repo_id, path)
            return Response({"link": link})

        else:
            error_msg = 'op invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

    def post(self, request, repo_id, format=None):
        # rename, move, copy or create file
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = request.GET.get('p', '')
        if not path or path[0] != '/':
            error_msg = 'p invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        username = request.user.username
        parent_dir = os.path.dirname(path)
        operation = request.POST.get('operation', '')
        if operation.lower() == 'rename':
            try:
                file_id = seafile_api.get_file_id_by_path(repo_id, path)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            if not file_id:
                error_msg = 'File %s not found.' % path
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            if check_folder_permission(request, repo_id, path) != 'rw':
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            newname = request.POST.get('newname', '')
            if not newname:
                error_msg = 'newname invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if len(newname) > MAX_UPLOAD_FILE_NAME_LEN:
                error_msg = 'newname is too long.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            oldname = os.path.basename(path)
            if oldname == newname:
                error_msg = 'The new name is the same to the old'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            newname = check_filename_with_rename(repo_id, parent_dir, newname)
            try:
                seafile_api.rename_file(repo_id, parent_dir, oldname, newname, username)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            if request.GET.get('reloaddir', '').lower() == 'true':
                return reloaddir(request, repo, parent_dir)
            else:
                return Response({'success': True})

        elif operation.lower() == 'move':
            try:
                file_id = seafile_api.get_file_id_by_path(repo_id, path)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            if not file_id:
                error_msg = 'File %s not found.' % path
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            # check src validation
            src_repo_id = repo_id
            src_dir = os.path.dirname(path)
            if check_folder_permission(request, src_repo_id, src_dir) != 'rw':
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # check dst validation
            dst_repo_id = request.POST.get('dst_repo', '')
            dst_dir = request.POST.get('dst_dir', '')
            if not dst_repo_id:
                error_msg = 'dst_repo_id invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            dst_repo = seafile_api.get_repo(dst_repo_id)
            if not dst_repo:
                error_msg = 'Library %s not found.' % dst_repo_id
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            if not dst_dir:
                error_msg = 'dst_dir invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            dst_dir_id = seafile_api.get_dir_id_by_path(dst_repo_id, dst_dir)
            if not dst_dir_id:
                error_msg = 'Folder %s not found.' % dst_dir
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            if check_folder_permission(request, dst_repo_id, dst_dir) != 'rw':
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # move file
            if dst_dir[-1] != '/': # Append '/' to the end of directory if necessary
                dst_dir += '/'

            if src_repo_id == dst_repo_id and src_dir == dst_dir:
                return Response({'success': True})

            filename = os.path.basename(path)
            new_filename = check_filename_with_rename(dst_repo_id, dst_dir, filename)
            try:
                seafile_api.move_file(src_repo_id, src_dir, filename, dst_repo_id,
                      dst_dir, new_filename, username, 0, synchronous=1)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            if request.GET.get('reloaddir', '').lower() == 'true':
                return reloaddir(request, dst_repo, dst_dir)
            else:
                return Response({'success': True})

        elif operation.lower() == 'copy':
            try:
                file_id = seafile_api.get_file_id_by_path(repo_id, path)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            if not file_id:
                error_msg = 'File %s not found.' % path
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            # check src validation
            src_repo_id = repo_id
            src_dir = os.path.dirname(path)
            if check_folder_permission(request, src_repo_id, src_dir) is None:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # check dst validation
            dst_repo_id = request.POST.get('dst_repo', '')
            dst_dir = request.POST.get('dst_dir', '')
            if not dst_repo_id:
                error_msg = 'dst_repo_id invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            dst_repo = seafile_api.get_repo(dst_repo_id)
            if not dst_repo:
                error_msg = 'Library %s not found.' % dst_repo_id
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            if not dst_dir:
                error_msg = 'dst_dir invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            dst_dir_id = seafile_api.get_dir_id_by_path(dst_repo_id, dst_dir)
            if not dst_dir_id:
                error_msg = 'Folder %s not found.' % dst_dir
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            if check_folder_permission(request, dst_repo_id, dst_dir) != 'rw':
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # copy file
            if dst_dir[-1] != '/': # Append '/' to the end of directory if necessary
                dst_dir += '/'

            if src_repo_id == dst_repo_id and src_dir == dst_dir:
                return Response({'success': True})

            filename = os.path.basename(path)
            new_filename = check_filename_with_rename(dst_repo_id, dst_dir, filename)
            try:
                seafile_api.copy_file(src_repo_id, src_dir, filename, dst_repo_id,
                          dst_dir, new_filename, username, 0, synchronous=1)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            if request.GET.get('reloaddir', '').lower() == 'true':
                return reloaddir(request, dst_repo, dst_dir)
            else:
                return Response({'success': True})

        elif operation.lower() == 'create':
            try:
                parent_dir_id = seafile_api.get_dir_id_by_path(repo_id, parent_dir)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            if not parent_dir_id:
                error_msg = 'Folder %s not found.' % parent_dir
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            if check_folder_permission(request, repo_id, parent_dir) != 'rw':
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            new_file_name = os.path.basename(path)
            new_file_name = check_filename_with_rename(repo_id, parent_dir, new_file_name)

            try:
                seafile_api.post_empty_file(repo_id, parent_dir, new_file_name, username)
            except SearpcError, e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            if request.GET.get('reloaddir', '').lower() == 'true':
                return reloaddir(request, repo, parent_dir)
            else:
                return Response({'success': True})
        else:
            error_msg = "Operation can only be rename, create or move."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

    def put(self, request, repo_id, format=None):
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = request.GET.get('p', '')
        if not path:
            error_msg = 'p invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        file_id = seafile_api.get_file_id_by_path(repo_id, path)
        if not file_id:
            error_msg = 'File %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if check_folder_permission(request, repo_id, path) != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.user.username
        operation = request.data.get('operation', '')
        if operation.lower() == 'lock':
            is_locked, locked_by_me = check_file_lock(repo_id, path, username)
            if is_locked:
                error_msg = 'File is already locked.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # lock file
            expire = request.data.get('expire', FILE_LOCK_EXPIRATION_DAYS)
            try:
                seafile_api.lock_file(repo_id, path.lstrip('/'), username, expire)
                return Response({'success': True})
            except SearpcError, e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if operation.lower() == 'unlock':
            is_locked, locked_by_me = check_file_lock(repo_id, path, username)
            if not is_locked:
                error_msg = 'File is not locked.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)
            if not locked_by_me:
                error_msg = 'You can not unlock this file.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # unlock file
            try:
                seafile_api.unlock_file(repo_id, path.lstrip('/'))
                return Response({'success': True})
            except SearpcError, e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        else:
            error_msg = "Operation can only be lock or unlock"
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

    def delete(self, request, repo_id, format=None):
        # delete file
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = request.GET.get('p', None)
        if not path:
            error_msg = 'p invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        file_id = seafile_api.get_file_id_by_path(repo_id, path)
        if not file_id:
            return Response({'success': True})

        parent_dir = os.path.dirname(path)
        if check_folder_permission(request, repo_id, parent_dir) != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        parent_dir = os.path.dirname(path)
        file_name = os.path.basename(path)
        try:
            seafile_api.del_file(repo_id, parent_dir,
                                 file_name, request.user.username)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if request.GET.get('reloaddir', '').lower() == 'true':
            return reloaddir(request, repo, parent_dir)
        else:
            return Response({'success': True})
