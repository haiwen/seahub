import os

import json
import logging
from django.http import HttpResponse
from django.utils.translation import ugettext as _
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.reverse import reverse

from rest_framework.views import APIView
from urllib.parse import quote

from seahub.api2.authentication import RepoAPITokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, is_web_request, to_python_boolean

from seaserv import seafile_api, get_repo, check_quota
from pysearpc import SearpcError

from seahub.api2.views import get_dir_file_recursively
from seahub.constants import PERMISSION_READ
from seahub.repo_api_tokens.utils import permission_check_admin_owner, get_dir_entrys_by_id_and_api_token
from seahub.utils import normalize_dir_path, check_filename_with_rename, gen_file_upload_url
from seahub.utils.repo import parse_repo_perm

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

    username = request.boss_behind.username  # check boss_behind's permission

    if not permission_check_admin_owner(username, repo_id):
        return None

    return request.repo_api_token_obj.permission  # and return repo_api_token's permission


def reloaddir(request, repo, parent_dir):
    try:
        dir_id = seafile_api.get_dir_id_by_path(repo.id, parent_dir)
    except SearpcError as e:
        logger.error(e)
        return api_error(HTTP_520_OPERATION_FAILED,
                         "Failed to get dir id by path")

    if not dir_id:
        return api_error(status.HTTP_404_NOT_FOUND, "Path does not exist")

    return get_dir_entrys_by_id_and_api_token(request, repo, parent_dir, dir_id)


class ViaRepoDirView(APIView):
    authentication_classes = (RepoAPITokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id, format=None):

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
        permission = check_folder_permission_by_repo_api(request, repo_id, path)
        if parse_repo_perm(permission).can_download is False and \
                not is_web_request(request):
            # preview only repo and this request does not came from web brower
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        old_oid = request.GET.get('oid', None)
        if old_oid and old_oid == dir_id:
            response = HttpResponse(json.dumps("uptodate"), status=200,
                                    content_type=json_content_type)
            response["oid"] = dir_id
            return response

        if recursive == '1':
            result = []
            # username = request.repo_api_token_obj.app_name
            username = request.boss_behind.username
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

            response = HttpResponse(json.dumps(result), status=200,
                                    content_type=json_content_type)
            response["oid"] = dir_id
            response["dir_perm"] = permission
            return response

        return get_dir_entrys_by_id_and_api_token(request, repo, path, dir_id, request_type)

    def post(self, request, repo_id, format=None):
        # new dir
        repo = get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')

        path = request.data.get('p', '')

        if not path or path[0] != '/':
            return api_error(status.HTTP_400_BAD_REQUEST, "Path is missing.")
        if path == '/':         # Can not make or rename root dir.
            return api_error(status.HTTP_400_BAD_REQUEST, "Path is invalid.")
        if path[-1] == '/':     # Cut out last '/' if possible.
            path = path[:-1]

        username = request.repo_api_token_obj.app_name
        operation = request.POST.get('operation', '')
        parent_dir = os.path.dirname(path)

        if operation.lower() == 'mkdir':
            new_dir_name = os.path.basename(path)

            if not seafile_api.is_valid_filename('fake_repo_id', new_dir_name):
                error_msg = 'Folder name invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            create_parents = request.POST.get('create_parents', '').lower() in ('true', '1')
            if not create_parents:
                # check whether parent dir exists
                if not seafile_api.get_dir_id_by_path(repo_id, parent_dir):
                    error_msg = 'Folder %s not found.' % parent_dir
                    return api_error(status.HTTP_404_NOT_FOUND, error_msg)

                if check_folder_permission_by_repo_api(request, repo_id, parent_dir) != 'rw':
                    error_msg = 'Permission denied.'
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)

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
                            return api_error(HTTP_520_OPERATION_FAILED,
                                             'Failed to make directory.')
            else:
                if check_folder_permission_by_repo_api(request, repo_id, '/') != 'rw':
                    error_msg = 'Permission denied.'
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)

                try:
                    seafile_api.mkdir_with_parents(repo_id, '/',
                                                   path[1:], username)
                except SearpcError as e:
                    logger.error(e)
                    return api_error(HTTP_520_OPERATION_FAILED,
                                     'Failed to make directory.')

            if request.GET.get('reloaddir', '').lower() == 'true':
                resp = reloaddir(request, repo, parent_dir)
            else:
                resp = Response('success', status=status.HTTP_201_CREATED)
                uri = reverse('via-repo-dir', args=[repo_id], request=request)
                resp['Location'] = uri + '?p=' + quote(
                    parent_dir.encode('utf-8') + '/'.encode('utf-8') + new_dir_name.encode('utf-8'))
            return resp

        elif operation.lower() == 'rename':
            if not seafile_api.get_dir_id_by_path(repo_id, path):
                error_msg = 'Folder %s not found.' % path
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            if check_folder_permission_by_repo_api(request, repo.id, path) != 'rw':
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            old_dir_name = os.path.basename(path)

            newname = request.POST.get('newname', '')
            if not newname:
                return api_error(status.HTTP_400_BAD_REQUEST, "New name is mandatory.")

            if newname == old_dir_name:
                return Response('success', status=status.HTTP_200_OK)

            try:
                # rename duplicate name
                checked_newname = check_filename_with_rename(
                    repo_id, parent_dir, newname)
                # rename dir
                seafile_api.rename_file(repo_id, parent_dir, old_dir_name,
                                        checked_newname, username)
                return Response('success', status=status.HTTP_200_OK)
            except SearpcError as e:
                logger.error(e)
                return api_error(HTTP_520_OPERATION_FAILED,
                                 'Failed to rename folder.')
        # elif operation.lower() == 'move':
        #     pass
        else:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             "Operation not supported.")


class ViaRepoUploadLinkView(APIView):
    authentication_classes = (RepoAPITokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id, format=None):
        # recourse check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        parent_dir = request.GET.get('p', '/')
        dir_id = seafile_api.get_dir_id_by_path(repo_id, parent_dir)
        if not dir_id:
            error_msg = 'Folder %s not found.' % parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if check_folder_permission_by_repo_api(request, repo_id, parent_dir) != 'rw':
            return api_error(status.HTTP_403_FORBIDDEN,
                             'You do not have permission to access this folder.')

        if check_quota(repo_id) < 0:
            return api_error(HTTP_443_ABOVE_QUOTA, _("Out of quota."))

        token = seafile_api.get_fileserver_access_token(repo_id,
                                                        'dummy', 'upload', request.repo_api_token_obj.app_name,
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
