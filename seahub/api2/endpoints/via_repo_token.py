import os

import json
import logging
import posixpath
from django.http import HttpResponse
from django.utils.translation import gettext as _
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.reverse import reverse

from rest_framework.views import APIView
from urllib.parse import quote

from seahub.api2.authentication import RepoAPITokenAuthentication
from seahub.repo_api_tokens.utils import get_dir_file_info_list
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, to_python_boolean

from seaserv import seafile_api, get_repo, check_quota
from pysearpc import SearpcError

import seahub.settings as settings
from seahub.repo_api_tokens.utils import get_dir_file_recursively
from seahub.constants import PERMISSION_READ
from seahub.utils import normalize_dir_path, check_filename_with_rename, gen_file_upload_url, is_valid_dirent_name, \
    normalize_file_path, render_error, gen_file_get_url, is_pro_version
from seahub.utils.timeutils import timestamp_to_isoformat_timestr

logger = logging.getLogger(__name__)
json_content_type = 'application/json; charset=utf-8'
HTTP_443_ABOVE_QUOTA = 443
HTTP_520_OPERATION_FAILED = 520


def check_folder_permission_by_repo_api(request, repo_id, path):
    """
    Check repo/folder/file access permission of a repo_api_token.
    :param request: request obj
    :param repo_id: repo's id
    :param path: repo path
    :return:
    """
    repo_status = seafile_api.get_repo_status(repo_id)
    if repo_status == 1:
        return PERMISSION_READ

    return request.repo_api_token_obj.permission  # and return repo_api_token's permission


class ViaRepoDirView(APIView):
    authentication_classes = (RepoAPITokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)

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

    def get(self, request, format=None):
        repo_id = request.repo_api_token_obj.repo_id
        # argument check
        recursive = request.GET.get('recursive', '0')
        if recursive not in ('1', '0'):
            error_msg = "If you want to get recursive dir entries, you should set 'recursive' argument as '1'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        request_type = request.GET.get('type', '')
        if request_type and request_type not in ('f', 'd'):
            error_msg = "'type should be 'f' or 'd'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        with_thumbnail = request.GET.get('with_thumbnail', 'false')
        if with_thumbnail not in ('true', 'false'):
            error_msg = 'with_thumbnail invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        with_thumbnail = to_python_boolean(with_thumbnail)
        thumbnail_size = request.GET.get('thumbnail_size', 48)
        try:
            thumbnail_size = int(thumbnail_size)
        except ValueError:
            error_msg = 'thumbnail_size invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        with_parents = request.GET.get('with_parents', 'false')
        if with_parents not in ('true', 'false'):
            error_msg = 'with_parents invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        with_parents = to_python_boolean(with_parents)

        # recource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        parent_dir = request.GET.get('path', '/')
        parent_dir = normalize_dir_path(parent_dir)

        dir_id = seafile_api.get_dir_id_by_path(repo_id, parent_dir)
        if not dir_id:
            error_msg = 'Folder %s not found.' % parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        permission = check_folder_permission_by_repo_api(request, repo_id, parent_dir)
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # get dir/file list recursively
        # username = request.user.username
        # Get username by repo_id. Can not use is_org_context, because 'AnonymousUser' object has no attribute 'org'.
        username = seafile_api.get_repo_owner(repo_id) or seafile_api.get_org_repo_owner(repo_id)
        if recursive == '1':

            try:
                dir_file_info_list = get_dir_file_recursively(repo_id, parent_dir, [])
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            response_dict = {}
            response_dict['dirent_list'] = []

            if request_type == 'f':
                for item in dir_file_info_list:
                    if item['type'] == 'file':
                        response_dict['dirent_list'].append(item)
            elif request_type == 'd':
                for item in dir_file_info_list:
                    if item['type'] == 'dir':
                        response_dict['dirent_list'].append(item)
            else:
                response_dict['dirent_list'] = dir_file_info_list

            return Response(response_dict)

        parent_dir_list = []
        if not with_parents:
            # only return dirent list in current parent folder
            parent_dir_list.append(parent_dir)
        else:
            # if value of 'path' parameter is '/a/b/c' add with_parents's is 'true'
            # then return dirent list in '/', '/a', '/a/b' and '/a/b/c'.
            if parent_dir == '/':
                parent_dir_list.append(parent_dir)
            else:
                tmp_parent_dir = '/'
                parent_dir_list.append(tmp_parent_dir)
                for folder_name in parent_dir.strip('/').split('/'):
                    tmp_parent_dir = posixpath.join(tmp_parent_dir, folder_name)
                    tmp_parent_dir = normalize_dir_path(tmp_parent_dir)
                    parent_dir_list.append(tmp_parent_dir)

        all_dir_info_list = []
        all_file_info_list = []

        try:
            for parent_dir in parent_dir_list:
                # get dir file info list
                dir_info_list, file_info_list = get_dir_file_info_list(username,
                                                                       request_type, repo, parent_dir, with_thumbnail,
                                                                       thumbnail_size)
                all_dir_info_list.extend(dir_info_list)
                all_file_info_list.extend(file_info_list)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        response_dict = {}
        response_dict["user_perm"] = permission
        response_dict["dir_id"] = dir_id
        response_dict["repo_name"] = repo.repo_name

        if request_type == 'f':
            response_dict['dirent_list'] = all_file_info_list
        elif request_type == 'd':
            response_dict['dirent_list'] = all_dir_info_list
        else:
            response_dict['dirent_list'] = all_dir_info_list + all_file_info_list

        return Response(response_dict)

    def post(self, request, format=None):
        repo_id = request.repo_api_token_obj.repo_id
        # argument check
        path = request.GET.get('path', None)
        if not path or path[0] != '/':
            error_msg = 'path invalid.'
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
            if check_folder_permission_by_repo_api(request, repo_id, parent_dir) != 'rw':
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
            if check_folder_permission_by_repo_api(request, repo_id, path) != 'rw':
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
            except SearpcError as e:
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
                if check_folder_permission_by_repo_api(request, repo_id, path) != 'rw':
                    error_msg = 'Permission denied.'
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)
            else:
                # dir NOT exists in repo
                if check_folder_permission_by_repo_api(request, repo_id, '/') != 'rw':
                    error_msg = 'Permission denied.'
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            try:
                seafile_api.revert_dir(repo_id, commit_id, path, username)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            return Response({'success': True})


class ViaRepoUploadLinkView(APIView):
    authentication_classes = (RepoAPITokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, format=None):
        repo_id = request.repo_api_token_obj.repo_id
        # recourse check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        parent_dir = request.GET.get('path', '/')
        dir_id = seafile_api.get_dir_id_by_path(repo_id, parent_dir)
        if not dir_id:
            error_msg = 'Folder %s not found.' % parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if check_folder_permission_by_repo_api(request, repo_id, parent_dir) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN,
                             'You do not have permission to access this folder.')

        if check_quota(repo_id) < 0:
            return api_error(HTTP_443_ABOVE_QUOTA, "Out of quota.")

        obj_data = {'parent_dir': parent_dir}
        if is_pro_version():
            obj_data['anonymous_user'] = request.repo_api_token_obj.app_name
        obj_id = json.dumps(obj_data)
        token = seafile_api.get_fileserver_access_token(repo_id,
                                                        obj_id, 'upload', '',
                                                        use_onetime=False)

        if not token:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        req_from = request.GET.get('from', 'api')
        if req_from == 'api':
            try:
                replace = to_python_boolean(request.GET.get('replace', '0'))
            except ValueError:
                replace = False
            url = gen_file_upload_url(token, 'upload-api', replace)
        elif req_from == 'web':
            url = gen_file_upload_url(token, 'upload-aj')
        else:
            error_msg = 'from invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        return Response(url)


class ViaRepoDownloadLinkView(APIView):
    authentication_classes = (RepoAPITokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        path = request.GET.get('path')
        if not path:
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        repo_id = request.repo_api_token_obj.repo_id
        path = normalize_file_path(path)
        filename = os.path.basename(path)
        file_id = seafile_api.get_file_id_by_path(repo_id, path)
        if not file_id:
            error_msg = 'File not found'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        token = seafile_api.get_fileserver_access_token(
            repo_id, file_id, 'download', request.repo_api_token_obj.app_name,
            use_onetime=settings.FILESERVER_TOKEN_ONCE_ONLY)
        download_url = gen_file_get_url(token, filename)
        return Response(download_url)


class RepoInfoView(APIView):
    authentication_classes = (RepoAPITokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        repo_id = request.repo_api_token_obj.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %(repo_id)s not found.' % {'repo_id': repo_id}
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        data = {
            'repo_id': repo.id,
            'repo_name': repo.name,
        }
        return Response(data)
