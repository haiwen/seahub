import os
import stat
import logging
import time

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.template.defaultfilters import filesizeformat

from seaserv import seafile_api, seafserv_threaded_rpc
from pysearpc import SearpcError

from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.views.sysadmin import can_view_sys_admin_repo
from seahub.views.file import send_file_access_msg
from seahub.utils import is_org_context, gen_file_get_url, \
    check_filename_with_rename
from seahub.views import get_system_default_repo_id

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

logger = logging.getLogger(__name__)

class AdminLibraryDirents(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def get(self, request, repo_id, format=None):
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not can_view_sys_admin_repo(repo):
            error_msg = 'Feature disabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        parent_dir = request.GET.get('parent_dir', '/')
        if not parent_dir:
            error_msg = 'parent_dir invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if parent_dir[-1] != '/':
            parent_dir = parent_dir + '/'

        dir_id = seafile_api.get_dir_id_by_path(repo_id, parent_dir)
        if not dir_id:
            error_msg = 'Folder %s not found.' % parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # TODO org?
        if is_org_context(request):
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)

        try:
            dirs = seafserv_threaded_rpc.list_dir_with_perm(repo_id,
                parent_dir, dir_id, repo_owner, -1, -1)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return_results = {}
        return_results['repo_name'] = repo.repo_name
        return_results['repo_id'] = repo.repo_id
        return_results['is_system_library'] = True if \
            repo.id == get_system_default_repo_id() else False
        return_results['dirent_list'] = []

        for dirent in dirs:
            result = {}
            if stat.S_ISDIR(dirent.mode):
                result['is_file'] = False
                result['obj_name'] = dirent.obj_name
                result['file_size'] = ''
                result['last_update'] = timestamp_to_isoformat_timestr(dirent.mtime)
            else:
                if repo.version == 0:
                    size = seafile_api.get_file_size(repo.store_id,
                        repo.version, dirent.obj_id)
                else:
                    size = dirent.size

                result['is_file'] = True
                result['obj_name'] = dirent.obj_name
                result['file_size'] = filesizeformat(size)
                result['last_update'] = timestamp_to_isoformat_timestr(dirent.mtime)

            return_results['dirent_list'].append(result)

        return Response(return_results)

    def post(self, request, repo_id, format=None):
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not can_view_sys_admin_repo(repo):
            error_msg = 'Feature disabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        parent_dir = request.GET.get('parent_dir', '/')
        if not parent_dir:
            error_msg = 'parent_dir invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if parent_dir[-1] != '/':
            parent_dir = parent_dir + '/'

        dir_id = seafile_api.get_dir_id_by_path(repo_id, parent_dir)
        if not dir_id:
            error_msg = 'Folder %s not found.' % parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        obj_name = request.data.get('obj_name', None)
        if not obj_name or not seafile_api.is_valid_filename(repo_id, obj_name):
            error_msg = 'obj_name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        obj_name = check_filename_with_rename(repo_id, parent_dir, obj_name)

        username = request.user.username
        try:
            seafile_api.post_dir(repo_id, parent_dir, obj_name, username)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        result = {}
        result['is_file'] = False
        result['obj_name'] = obj_name
        result['file_size'] = filesizeformat(0)
        result['last_update'] = timestamp_to_isoformat_timestr(time.time())

        return Response(result)

class AdminLibraryDirent(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def get(self, request, repo_id):
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not can_view_sys_admin_repo(repo):
            error_msg = 'Feature disabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        path = request.GET.get('path', None)
        if not path:
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if path[0] != '/':
            path = '/' + path

        file_id = None
        dir_id = None
        try:
            file_id = seafile_api.get_file_id_by_path(repo_id, path)
            dir_id = seafile_api.get_dir_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if file_id:
            is_file = True
        elif dir_id:
            is_file = False
        else:
            error_msg = 'path %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        username = request.user.username
        obj_name = os.path.basename(path.rstrip('/'))

        if is_file and request.GET.get('dl', '0') == '1':
            token = seafile_api.get_fileserver_access_token(repo_id,
                file_id, 'download', username, use_onetime=True)
            dl_url = gen_file_get_url(token, obj_name)
            send_file_access_msg(request, repo, path, 'web')
            return Response({'download_url': dl_url})

        size = seafile_api.get_file_size(repo.store_id,
            repo.version, file_id or dir_id)

        result = {}
        result['is_file'] = is_file
        result['obj_name'] = obj_name
        result['file_size'] = filesizeformat(size)
# TODO
#        result['last_update'] = timestamp_to_isoformat_timestr(dirent.mtime)

        return Response(result)

    def delete(self, request, repo_id):
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not can_view_sys_admin_repo(repo):
            error_msg = 'Feature disabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        path = request.GET.get('path', None)
        if not path:
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if path[0] != '/':
            path = '/' + path

        file_id = None
        dir_id = None
        try:
            file_id = seafile_api.get_file_id_by_path(repo_id, path)
            dir_id = seafile_api.get_dir_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not file_id and not dir_id:
            return Response({'success': True})

        parent_dir = os.path.dirname(path)
        file_name = os.path.basename(path)
        try:
            seafile_api.del_file(repo_id,
                parent_dir, file_name, request.user.username)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
