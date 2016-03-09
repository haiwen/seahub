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
from seahub.api2.views import reloaddir, get_dir_recursively, \
    get_dir_entrys_by_id

from seahub.views import check_folder_permission
from seahub.utils import check_filename_with_rename, is_pro_version

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

    def get(self, request, repo_id, format=None):
        # list dir
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = request.GET.get('p', '/')
        if path[-1] != '/':
            path = path + '/'

        try:
            dir_id = seafile_api.get_dir_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not dir_id:
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if check_folder_permission(request, repo_id, path) is None:
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
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')

        path = request.GET.get('p', '')
        if not path or path[0] != '/':
            error_msg = 'p invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if path == '/':
            error_msg = 'Can not make or rename root dir.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if path[-1] == '/':
            path = path[:-1]

        username = request.user.username
        parent_dir = os.path.dirname(path)
        operation = request.POST.get('operation', '')
        if operation.lower() == 'mkdir':
            parent_dir = os.path.dirname(path)
            if check_folder_permission(request, repo_id, parent_dir) != 'rw':
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            create_parents = request.POST.get('create_parents', '').lower() in ('true', '1')
            if not create_parents:
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
            else:
                if not is_pro_version():
                    error_msg = 'Feature not supported.'
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)

                try:
                    seafile_api.mkdir_with_parents(repo_id, '/', path[1:], username)
                except SearpcError as e:
                    logger.error(e)
                    error_msg = 'Internal Server Error'
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            if request.GET.get('reloaddir', '').lower() == 'true':
                resp = reloaddir(request, repo, parent_dir)
            else:
                resp = Response({'success': True})

            return resp

        elif operation.lower() == 'rename':
            dir_id = seafile_api.get_dir_id_by_path(repo_id, path)
            if not dir_id:
                error_msg = 'Folder %s not found.' % path
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            if check_folder_permission(request, repo.id, path) != 'rw':
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            parent_dir = os.path.dirname(path)
            old_dir_name = os.path.basename(path)
            newname = request.POST.get('newname', '')
            if not newname:
                error_msg = 'newname invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if newname == old_dir_name:
                return Response({'success': True})

            try:
                # rename duplicate name
                checked_newname = check_filename_with_rename(repo_id, parent_dir, newname)
                # rename dir
                seafile_api.rename_file(repo_id, parent_dir, old_dir_name,
                                        checked_newname, username)
                return Response({'success': True})
            except SearpcError, e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        else:
            error_msg = "Operation not supported."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

    def delete(self, request, repo_id, format=None):
        # delete dir or file
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = request.GET.get('p', None)
        if not path:
            error_msg = 'p invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        dir_id = seafile_api.get_dir_id_by_path(repo_id, path)
        if not dir_id:
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if check_folder_permission(request, repo_id, path) != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if path == '/':
            error_msg = 'Can not delete root path.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if path[-1] == '/':
            path = path[:-1]

        username = request.user.username
        parent_dir = os.path.dirname(path)
        file_name = os.path.basename(path)
        try:
            seafile_api.del_file(repo_id, parent_dir, file_name, username)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if request.GET.get('reloaddir', '').lower() == 'true':
            return reloaddir(request, repo, parent_dir)
        else:
            return Response({'success': True})
