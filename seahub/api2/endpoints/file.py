import os
import logging
from urllib2 import unquote

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error
from seahub.api2.views import reloaddir, \
    check_filename_with_rename_utf8, get_shared_link

from seahub.utils import gen_file_get_url, EMPTY_SHA1
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

        if check_folder_permission(request, repo_id, path) is None:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        file_id = None
        try:
            file_id = seafile_api.get_file_id_by_path(repo_id,
                                                      path.encode('utf-8'))
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not file_id:
            error_msg = 'File %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # send stats message
        send_file_access_msg(request, repo, path, 'api')

        file_name = os.path.basename(path)
        op = request.GET.get('op', 'download')

        reuse = request.GET.get('reuse', '0')
        if reuse not in ('1', '0'):
            error_msg = "If you want to reuse file server access token for download file, you should set 'reuse' argument as '1'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        use_onetime = False if reuse == '1' else True
        if op == 'download':
            token = seafile_api.get_fileserver_access_token(repo_id,
                file_id, op, request.user.username, use_onetime)

            redirect_url = gen_file_get_url(token, file_name)
            return Response({"url": redirect_url})

        if op == 'downloadblks':
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

        if op == 'sharelink':
            path = request.GET.get('p', None)
            if path is None:
                error_msg = 'p invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            link = get_shared_link(request, repo_id, path)
            return Response({"link": link})

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
            if check_folder_permission(request, repo_id, path) != 'rw':
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            newname = request.POST.get('newname', '')
            if not newname:
                error_msg = 'newname invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            newname = unquote(newname.encode('utf-8'))
            if len(newname) > MAX_UPLOAD_FILE_NAME_LEN:
                error_msg = 'newname is too long.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            parent_dir_utf8 = parent_dir.encode('utf-8')
            oldname = os.path.basename(path)
            if oldname == newname:
                error_msg = 'The new name is the same to the old'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            newname = check_filename_with_rename_utf8(repo_id, parent_dir,
                                                      newname)
            try:
                seafile_api.rename_file(repo_id, parent_dir, oldname, newname,
                                        username)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            if request.GET.get('reloaddir', '').lower() == 'true':
                return reloaddir(request, repo, parent_dir_utf8)
            else:
                return Response({'success': True})

        elif operation.lower() == 'move':
            if check_folder_permission(request, repo_id, path) != 'rw':
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            src_dir = os.path.dirname(path)
            src_dir_utf8 = src_dir.encode('utf-8')
            src_repo_id = repo_id
            dst_repo_id = request.POST.get('dst_repo', '')
            dst_dir = request.POST.get('dst_dir', '')
            dst_dir_utf8 = dst_dir.encode('utf-8')
            if dst_dir[-1] != '/': # Append '/' to the end of directory if necessary
                dst_dir += '/'

            if dst_repo_id:
                error_msg = 'dst_repo_id invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if dst_dir:
                error_msg = 'dst_dir invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if src_repo_id == dst_repo_id and src_dir == dst_dir:
                return Response({'success': True})

            if check_folder_permission(request, dst_repo_id, dst_dir) != 'rw':
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            filename = os.path.basename(path)
            filename_utf8 = filename.encode('utf-8')
            new_filename_utf8 = check_filename_with_rename_utf8(dst_repo_id,
                                                                dst_dir,
                                                                filename)
            try:
                seafile_api.move_file(src_repo_id, src_dir_utf8,
                                      filename_utf8, dst_repo_id,
                                      dst_dir_utf8, new_filename_utf8,
                                      username, 0, synchronous=1)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            dst_repo = seafile_api.get_repo(dst_repo_id)
            if not dst_repo:
                error_msg = 'Library %s not found.' % dst_repo_id
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            if request.GET.get('reloaddir', '').lower() == 'true':
                return reloaddir(request, dst_repo, dst_dir)
            else:
                return Response({'success': True})

        elif operation.lower() == 'copy':
            src_repo_id = repo_id
            src_dir = os.path.dirname(path)
            src_dir_utf8 = src_dir.encode('utf-8')
            dst_repo_id = request.POST.get('dst_repo', '')
            dst_dir = request.POST.get('dst_dir', '')
            dst_dir_utf8 = dst_dir.encode('utf-8')

            if dst_dir[-1] != '/': # Append '/' to the end of directory if necessary
                dst_dir += '/'

            if dst_repo_id:
                error_msg = 'dst_repo_id invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if dst_dir:
                error_msg = 'dst_dir invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if src_repo_id == dst_repo_id and src_dir == dst_dir:
                return Response({'success': True})

            # check src folder permission
            if check_folder_permission(request, repo_id, path) is None:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # check dst folder permission
            if check_folder_permission(request, dst_repo_id, dst_dir) != 'rw':
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            filename = os.path.basename(path)
            filename_utf8 = filename.encode('utf-8')
            new_filename_utf8 = check_filename_with_rename_utf8(dst_repo_id,
                                                                dst_dir,
                                                                filename)
            try:
                seafile_api.copy_file(src_repo_id, src_dir_utf8,
                                      filename_utf8, dst_repo_id,
                                      dst_dir_utf8, new_filename_utf8,
                                      username, 0, synchronous=1)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            if request.GET.get('reloaddir', '').lower() == 'true':
                return reloaddir(request, dst_repo, dst_dir)
            else:
                return Response({'success': True})

        elif operation.lower() == 'create':
            if check_folder_permission(request, repo_id, parent_dir) != 'rw':
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            parent_dir_utf8 = parent_dir.encode('utf-8')
            new_file_name = os.path.basename(path)
            new_file_name_utf8 = check_filename_with_rename_utf8(repo_id,
                                                                 parent_dir,
                                                                 new_file_name)

            try:
                seafile_api.post_empty_file(repo_id, parent_dir,
                                            new_file_name_utf8, username)
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

        path = request.data.get('p', '')
        if not path:
            error_msg = 'p invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        file_id = seafile_api.get_file_id_by_path(repo_id, path)
        if not file_id:
            error_msg = 'File %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        username = request.user.username
        # check file access permission
        if check_folder_permission(request, repo_id, path) != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

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

        parent_dir = os.path.dirname(path)
        if check_folder_permission(request, repo_id, parent_dir) != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        parent_dir_utf8 = os.path.dirname(path).encode('utf-8')
        file_name_utf8 = os.path.basename(path).encode('utf-8')

        try:
            seafile_api.del_file(repo_id, parent_dir_utf8,
                                 file_name_utf8,
                                 request.user.username)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if request.GET.get('reloaddir', '').lower() == 'true':
            return reloaddir(request, repo, parent_dir_utf8)
        else:
            return Response({'success': True})
