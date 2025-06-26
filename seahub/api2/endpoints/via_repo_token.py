import os

import json
import logging
import posixpath
import requests
import time
import stat
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
from seahub.base.models import FileComment
from seahub.repo_api_tokens.utils import get_dir_file_info_list
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, to_python_boolean
from seahub.seadoc.models import SeadocHistoryName, SeadocCommentReply
from seahub.utils.file_op import if_locked_by_online_office
from seahub.seadoc.utils import get_seadoc_file_uuid
from seahub.settings import MAX_PATH
from seahub.api2.endpoints.move_folder_merge import move_folder_with_merge
from seahub.api2.endpoints.multi_share_links import check_permissions_arg, get_share_link_info
from seahub.utils.repo import parse_repo_perm
from seahub.share.models import FileShare
from seahub.share.decorators import check_share_link_count
from seahub.constants import PERMISSION_READ_WRITE, PERMISSION_PREVIEW_EDIT, PERMISSION_PREVIEW



from seaserv import seafile_api, get_repo, check_quota, get_org_id_by_repo_id
from pysearpc import SearpcError

import seahub.settings as settings
from seahub.repo_api_tokens.utils import get_dir_file_recursively
from seahub.constants import PERMISSION_READ
from seahub.tags.models import FileUUIDMap

from seahub.utils import normalize_dir_path, check_filename_with_rename, gen_file_upload_url, is_valid_dirent_name, \
    normalize_file_path, render_error, gen_file_get_url, is_pro_version, gen_inner_file_upload_url, \
    get_file_type_and_ext, SEADOC
from seahub.utils.file_op import check_file_lock

from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.views.file import can_preview_file, can_edit_file

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
    authentication_classes = (RepoAPITokenAuthentication, )
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
        thumbnail_size = request.GET.get('thumbnail_size', settings.THUMBNAIL_DEFAULT_SIZE)
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

        # resource check
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

    def delete(self, request, format=None):

        repo_id = request.repo_api_token_obj.repo_id
        username = request.repo_api_token_obj.app_name

        path = request.GET.get('path', None)
        if not path:
            error_msg = 'path invalid.'
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
        if path[-1] == '/':
            path = path[:-1]

        path = path.rstrip('/')
        parent_dir = os.path.dirname(path)
        dir_name = os.path.basename(path)
        if check_folder_permission_by_repo_api(request, repo_id, parent_dir) != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        try:
            seafile_api.del_file(repo_id, parent_dir,
                                 json.dumps([dir_name]), username)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        result = {}
        result['success'] = True
        result['commit_id'] = repo.head_cmmt_id
        return Response(result)


class ViaRepoUploadLinkView(APIView):
    authentication_classes = (RepoAPITokenAuthentication, )
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
    authentication_classes = (RepoAPITokenAuthentication, )
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
    authentication_classes = (RepoAPITokenAuthentication, )
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
            'size': repo.size,
            'file_count': repo.file_count,
            'last_modified': timestamp_to_isoformat_timestr(repo.last_modify),
        }
        return Response(data)


class ViaRepoBatchMove(APIView):
    authentication_classes = (RepoAPITokenAuthentication, )
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        """ Asynchronous multi move files/folders.
        Permission checking:
        1. User must has `r/rw` permission for src folder.
        2. User must has `rw` permission for dst folder.

        Parameter:
        {
            "src_parent_dir":"/a/b/c/",
            "src_dirents":["1.md", "2.md"],

            "dst_parent_dir":"/x/y/",
        }
        """
        repo_id = request.repo_api_token_obj.repo_id
        permission = check_folder_permission_by_repo_api(request, repo_id, None)
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # argument check
        src_parent_dir = request.data.get('src_parent_dir', None)
        if not src_parent_dir:
            error_msg = 'src_parent_dir invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        src_dirents = request.data.get('src_dirents', None)
        if not src_dirents:
            error_msg = 'src_dirents invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        dst_parent_dir = request.data.get('dst_parent_dir', None)
        if not dst_parent_dir:
            error_msg = 'dst_parent_dir invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        if not seafile_api.get_repo(repo_id):
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not seafile_api.get_dir_id_by_path(repo_id, src_parent_dir):
            error_msg = 'Folder %s not found.' % src_parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not seafile_api.get_dir_id_by_path(repo_id, dst_parent_dir):
            error_msg = 'Folder %s not found.' % dst_parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        username = request.user.username

        try:
            seafile_api.move_file(repo_id, src_parent_dir,
                                  json.dumps(src_dirents),
                                  repo_id, dst_parent_dir,
                                  json.dumps(src_dirents),
                                  replace=False, username=username,
                                  need_progress=0, synchronous=1)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class ViaRepoBatchCopy(APIView):
    authentication_classes = (RepoAPITokenAuthentication, )
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        """ Asynchronous multi copy files/folders.
        Permission checking:
        1. User must has `r/rw` permission for src folder.
        2. User must has `rw` permission for dst folder.

        Parameter:
        {
            "src_parent_dir":"/a/b/c/",
            "src_dirents":["1.md", "2.md"],

            "dst_parent_dir":"/x/y/",
        }
        """
        repo_id = request.repo_api_token_obj.repo_id
        permission = check_folder_permission_by_repo_api(request, repo_id, None)
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        # argument check
        src_parent_dir = request.data.get('src_parent_dir', None)
        if not src_parent_dir:
            error_msg = 'src_parent_dir invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        src_dirents = request.data.get('src_dirents', None)
        if not src_dirents:
            error_msg = 'src_dirents invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        dst_parent_dir = request.data.get('dst_parent_dir', None)
        if not dst_parent_dir:
            error_msg = 'dst_parent_dir invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        if not seafile_api.get_repo(repo_id):
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not seafile_api.get_dir_id_by_path(repo_id, src_parent_dir):
            error_msg = 'Folder %s not found.' % src_parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not seafile_api.get_dir_id_by_path(repo_id, dst_parent_dir):
            error_msg = 'Folder %s not found.' % dst_parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        username = ''

        try:
            seafile_api.copy_file(repo_id, src_parent_dir,
                                  json.dumps(src_dirents),
                                  repo_id, dst_parent_dir,
                                  json.dumps(src_dirents),
                                  username=username, need_progress=0,
                                  synchronous=1)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class ViaRepoBatchDelete(APIView):
    authentication_classes = (RepoAPITokenAuthentication, )
    throttle_classes = (UserRateThrottle,)

    def delete(self, request):
        """ Multi delete files/folders.
        Permission checking:
        1. User must has `rw` permission for parent folder.
        Parameter:
        {
            "repo_id":"7460f7ac-a0ff-4585-8906-bb5a57d2e118",
            "parent_dir":"/a/b/c/",
            "dirents":["1.md", "2.md"],
        }
        """
        repo_id = request.repo_api_token_obj.repo_id
        permission = check_folder_permission_by_repo_api(request, repo_id, None)
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        parent_dir = request.data.get('parent_dir', None)
        if not parent_dir:
            error_msg = 'parent_dir invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        dirents = request.data.get('dirents', None)
        if not dirents:
            error_msg = 'dirents invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not seafile_api.get_dir_id_by_path(repo_id, parent_dir):
            error_msg = 'Folder %s not found.' % parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        username = ''

        try:
            seafile_api.del_file(repo_id, parent_dir,
                                 json.dumps(dirents),
                                 username)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class ViaRepoTokenFile(APIView):
    authentication_classes = (RepoAPITokenAuthentication, )
    throttle_classes = (UserRateThrottle,)

    def get_file_info(self, username, repo_id, file_path):

        repo = seafile_api.get_repo(repo_id)
        file_obj = seafile_api.get_dirent_by_path(repo_id, file_path)
        if file_obj:
            file_name = file_obj.obj_name
            file_size = file_obj.size
            can_preview, _ = can_preview_file(file_name, file_size, repo)
            can_edit, _ = can_edit_file(file_name, file_size, repo)
        else:
            file_name = os.path.basename(file_path.rstrip('/'))
            file_size = ''
            can_preview = False
            can_edit = False

        try:
            is_locked, _ = check_file_lock(repo_id, file_path, '')
        except Exception as e:
            logger.error(e)
            is_locked = False

        file_info = {
            'type': 'file',
            'repo_id': repo_id,
            'parent_dir': os.path.dirname(file_path),
            'obj_name': file_name,
            'obj_id': file_obj.obj_id if file_obj else '',
            'size': file_size,
            'mtime': timestamp_to_isoformat_timestr(file_obj.mtime) if file_obj else '',
            'can_preview': can_preview,
            'can_edit': can_edit,
            'is_locked': is_locked,
        }

        return file_info

    def get(self, request, format=None):
        repo_id = request.repo_api_token_obj.repo_id
        username = request.repo_api_token_obj.app_name
        path = request.GET.get('path', None)
        if not path:
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        permission = check_folder_permission_by_repo_api(request, repo_id, None)
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            file_id = seafile_api.get_file_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not file_id:
            error_msg = 'File %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        file_info = self.get_file_info(username, repo_id, path)
        return Response(file_info)

    def post(self, request, format=None):
        """ Create, rename, move, copy, revert file

        Permission checking:
        2. rename: user with 'rw' permission for current file;
        4. revert: user with 'rw' permission for current file's parent dir;
        """
        repo_id = request.repo_api_token_obj.repo_id
        permission = check_folder_permission_by_repo_api(request, repo_id, None)
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # argument check
        path = request.GET.get('path', None)
        if not path:
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        path = normalize_file_path(path)

        operation = request.data.get('operation', None)
        if not operation:
            error_msg = 'operation invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        operation = operation.lower()
        if operation not in ('rename', 'revert', 'create', 'move', 'copy'):
            error_msg = "operation can only be 'rename', 'revert', 'create', 'move', 'copy'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        username = ''
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
            if check_folder_permission_by_repo_api(request, repo_id, parent_dir) != 'rw':
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # create new empty file
            new_file_name = os.path.basename(path)

            if not is_valid_dirent_name(new_file_name):
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'name invalid.')

            new_file_name = check_filename_with_rename(repo_id, parent_dir, new_file_name)

            try:
                seafile_api.post_empty_file(repo_id, parent_dir, new_file_name, username)
            except Exception as e:
                if str(e) == 'Too many files in library.':
                    error_msg = _("The number of files in library exceeds the limit")
                    from seahub.api2.views import HTTP_447_TOO_MANY_FILES_IN_LIBRARY
                    return api_error(HTTP_447_TOO_MANY_FILES_IN_LIBRARY, error_msg)
                else:
                    logger.error(e)
                    error_msg = 'Internal Server Error'
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            LANGUAGE_DICT = {
                'cs': 'cs-CZ',
                'de': 'de-DE',
                'en': 'en-US',
                'es': 'es-ES',
                'fr': 'fr-FR',
                'it': 'it-IT',
                'lv': 'lv-LV',
                'nl': 'nl-NL',
                'pl': 'pl-PL',
                'pt-br': 'pt-BR',
                'ru': 'ru-RU',
                'sv': 'sv-SE',
                'vi': 'vi-VN',
                'uk': 'uk-UA',
                'el': 'el-GR',
                'ko': 'ko-KR',
                'ja': 'ja-JP',
                'zh-cn': 'zh-CN',
                'zh-tw': 'zh-TW'
            }

            empty_file_path = ''
            not_used, file_extension = os.path.splitext(new_file_name)
            if file_extension in ('.xlsx', '.pptx', '.docx', '.docxf'):
                # update office file by template
                empty_file_path = os.path.join(settings.OFFICE_TEMPLATE_ROOT, f'empty{file_extension}')
                language_code_path = LANGUAGE_DICT.get(request.LANGUAGE_CODE)
                if language_code_path:
                    empty_file_path = os.path.join(settings.OFFICE_TEMPLATE_ROOT, 'new',
                                                   language_code_path, f'new{file_extension}')

            if empty_file_path:
                # get file server update url
                update_token = seafile_api.get_fileserver_access_token(
                        repo_id, 'dummy', 'update', username)

                if not update_token:
                    error_msg = 'Internal Server Error'
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

                update_url = gen_inner_file_upload_url('update-api', update_token)
                # update file
                new_file_path = posixpath.join(parent_dir, new_file_name)
                try:
                    requests.post(
                        update_url,
                        data={'filename': new_file_name, 'target_file': new_file_path},
                        files={'file': open(empty_file_path, 'rb')}
                    )
                except Exception as e:
                    logger.error(e)

            new_file_path = posixpath.join(parent_dir, new_file_name)
            file_info = self.get_file_info(username, repo_id, new_file_path)
            # gen doc_uuid
            if new_file_name.endswith('.sdoc'):
                doc_uuid = get_seadoc_file_uuid(repo, new_file_path)
                file_info['doc_uuid'] = doc_uuid
            return Response(file_info)

        if operation == 'rename':
            # argument check
            new_file_name = request.data.get('newname', None)
            if not new_file_name:
                error_msg = 'newname invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if not is_valid_dirent_name(new_file_name):
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'name invalid.')

            if len(new_file_name) > settings.MAX_UPLOAD_FILE_NAME_LEN:
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

            # rename file
            new_file_name = check_filename_with_rename(repo_id, parent_dir, new_file_name)
            try:
                seafile_api.rename_file(repo_id, parent_dir, oldname, new_file_name, username)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            new_file_path = posixpath.join(parent_dir, new_file_name)

            file_info = self.get_file_info(username, repo_id, new_file_path)
            return Response(file_info)

        if operation == 'revert':
            commit_id = request.data.get('commit_id', None)
            if not commit_id:
                error_msg = 'commit_id invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            try:
                seafile_api.revert_file(repo_id, commit_id, path, username)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            return Response({'success': True})

        if operation == 'move':
            """ Only supports moving file within the current repo """
            # argument check
            dst_dir = request.data.get('dst_dir', None)
            if not dst_dir:
                error_msg = 'dst_dir invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            dst_dir = normalize_dir_path(dst_dir)

            file_id = seafile_api.get_file_id_by_path(repo_id, path)
            if not file_id:
                error_msg = 'File %s not found.' % path
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            # resource check for dst dir
            dst_dir_id = seafile_api.get_dir_id_by_path(repo_id, dst_dir)
            if not dst_dir_id:
                error_msg = 'Folder %s not found.' % dst_dir
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            # check file lock
            try:
                is_locked, locked_by_me = check_file_lock(repo_id, path, username)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            if is_locked:
                error_msg = _("File is locked")
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # move file
            src_dir = os.path.dirname(path)
            if src_dir == dst_dir:
                file_info = self.get_file_info(username, repo_id, path)
                return Response(file_info)

            filename = os.path.basename(path)
            new_file_name = check_filename_with_rename(repo_id, dst_dir, filename)
            try:
                seafile_api.move_file(repo_id, src_dir,
                                      json.dumps([filename]),
                                      repo_id, dst_dir,
                                      json.dumps([new_file_name]),
                                      replace=False,
                                      username=username, need_progress=0, synchronous=1)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            dst_file_path = posixpath.join(dst_dir, new_file_name)
            dst_file_info = self.get_file_info(username, repo_id, dst_file_path)
            return Response(dst_file_info)

        if operation == 'copy':
            # argument check
            dst_dir = request.data.get('dst_dir', None)
            if not dst_dir:
                error_msg = 'dst_dir invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            dst_dir = normalize_dir_path(dst_dir)

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
            dst_dir_id = seafile_api.get_dir_id_by_path(repo_id, dst_dir)
            if not dst_dir_id:
                error_msg = 'Folder %s not found.' % dst_dir
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            src_dir = os.path.dirname(path)
            filename = os.path.basename(path)
            new_file_name = check_filename_with_rename(repo_id, dst_dir, filename)
            try:
                seafile_api.copy_file(repo_id, src_dir,
                                      json.dumps([filename]),
                                      repo_id, dst_dir,
                                      json.dumps([new_file_name]),
                                      username, 0, synchronous=1)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            dst_file_path = posixpath.join(dst_dir, new_file_name)
            dst_file_info = self.get_file_info(username, repo_id, dst_file_path)
            return Response(dst_file_info)

    def put(self, request, format=None):
        """ Currently only support lock, unlock file. """

        repo_id = request.repo_api_token_obj.repo_id
        permission = check_folder_permission_by_repo_api(request, repo_id, None)
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not is_pro_version():
            error_msg = 'file lock feature only supported in professional edition.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # argument check
        path = request.GET.get('path', None)
        if not path:
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        path = normalize_file_path(path)

        operation = request.data.get('operation', None)
        if not operation:
            error_msg = 'operation invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        operation = operation.lower()
        if operation not in ('lock', 'unlock'):
            error_msg = "operation can only be 'lock', 'unlock'."
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

        username = request.repo_api_token_obj.generated_by
        try:
            is_locked, locked_by_me = check_file_lock(repo_id, path, username)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # check if is locked by online office
        locked_by_online_office = if_locked_by_online_office(repo_id, path)

        if operation == 'lock':
            # expire < 0, freeze document
            # expire = 0, use default lock duration
            # expire > 0, specify lock duration
            expire = request.data.get('expire', 0)
            try:
                expire = int(expire)
            except ValueError:
                error_msg = 'expire invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if expire < 0 and locked_by_online_office:
                # freeze document
                seafile_api.unlock_file(repo_id, path)
                seafile_api.lock_file(repo_id, path, username, expire)
            else:
                if is_locked:
                    error_msg = _("File is locked")
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

                # lock file
                try:
                    if expire > 0:
                        seafile_api.lock_file(repo_id, path, username,
                                              int(time.time()) + expire)
                    else:
                        seafile_api.lock_file(repo_id, path, username, expire)
                except SearpcError as e:
                    logger.error(e)
                    error_msg = 'Internal Server Error'
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if operation == 'unlock':
            if not is_locked:
                error_msg = _("File is not locked.")
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if locked_by_me or locked_by_online_office:
                # unlock file
                try:
                    seafile_api.unlock_file(repo_id, path)
                except SearpcError as e:
                    logger.error(e)
                    error_msg = 'Internal Server Error'
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
            else:
                error_msg = 'You can not unlock this file.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        file_info = self.get_file_info(username, repo_id, path)
        return Response(file_info)

    def delete(self, request, format=None):
        repo_id = request.repo_api_token_obj.repo_id
        path = request.GET.get('path', None)
        if not path:
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        path = normalize_file_path(path)

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
        # permission check
        if check_folder_permission_by_repo_api(request, repo_id, parent_dir) != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # delete file
        file_name = os.path.basename(path)
        try:
            seafile_api.del_file(repo_id, parent_dir,
                                 json.dumps([file_name]),
                                 request.user.username)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        try:  # rm sdoc fileuuid
            filetype, fileext = get_file_type_and_ext(file_name)
            if filetype == SEADOC:
                from seahub.seadoc.utils import get_seadoc_file_uuid
                file_uuid = get_seadoc_file_uuid(repo, path)
                FileComment.objects.filter(uuid=file_uuid).delete()
                FileUUIDMap.objects.delete_fileuuidmap_by_path(
                    repo_id, parent_dir, file_name, is_dir=False)
                SeadocHistoryName.objects.filter(doc_uuid=file_uuid).delete()
                SeadocCommentReply.objects.filter(doc_uuid=file_uuid).delete()
        except Exception as e:
            logger.error(e)

        result = {}
        result['success'] = True
        result['commit_id'] = repo.head_cmmt_id
        return Response(result)

class ViaRepoMoveDir(APIView):
    authentication_classes = (RepoAPITokenAuthentication, )
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        """
        Only supports moving folder within the same repo.
        """
        repo_id = request.repo_api_token_obj.repo_id
        src_parent_dir = request.data.get('src_parent_dir', None)
        src_folder_name = request.data.get('src_dirent_name', None)
        dst_parent_dir = request.data.get('dst_parent_dir', None)

        # argument check
        if not src_parent_dir:
            error_msg = 'src_parent_dir invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not src_folder_name:
            error_msg = 'src_dirent_name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not dst_parent_dir:
            error_msg = 'dst_parent_dir invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if src_parent_dir == dst_parent_dir:
            error_msg = _('Invalid destination path')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if len(dst_parent_dir + src_folder_name) > MAX_PATH:
            error_msg = _('Destination path is too long.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        src_folder_path = posixpath.join(src_parent_dir, src_folder_name)
        if not seafile_api.get_dir_id_by_path(repo_id, src_folder_path):
            error_msg = 'Folder %s not found.' % src_folder_path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not seafile_api.get_dir_id_by_path(repo_id, dst_parent_dir):
            error_msg = 'Folder %s not found.' % dst_parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if check_folder_permission_by_repo_api(request, repo_id, src_parent_dir) != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.repo_api_token_obj.generated_by
        move_folder_with_merge(username,
                               repo_id, src_parent_dir, src_folder_name,
                               repo_id, dst_parent_dir, src_folder_name)

        seafile_api.del_file(repo_id, src_parent_dir,
                             json.dumps([src_folder_name]),
                             username)

        return Response({'success': True})

class ViaRepoShareLink(APIView):
    authentication_classes = (RepoAPITokenAuthentication, )
    throttle_classes = (UserRateThrottle,)

    @check_share_link_count
    def post(self, request):
        # argument check
        repo_id = request.repo_api_token_obj.repo_id

        path = request.data.get('path', None)
        if not path:
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        permission = check_folder_permission_by_repo_api(request, repo_id, None)
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            perm = check_permissions_arg(request)
        except Exception as e:
            logger.error(e)
            error_msg = 'permissions invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        dirent = None
        if path != '/':
            dirent = seafile_api.get_dirent_by_path(repo_id, path)
            if not dirent:
                error_msg = 'Dirent %s not found.' % path
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if repo.encrypted:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.repo_api_token_obj.generated_by
        repo_folder_permission = seafile_api.check_permission_by_path(repo_id, path, username)
        if parse_repo_perm(repo_folder_permission).can_generate_share_link is False:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if repo_folder_permission in (PERMISSION_PREVIEW_EDIT, PERMISSION_PREVIEW) \
                and perm != FileShare.PERM_VIEW_ONLY:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if repo_folder_permission in (PERMISSION_READ,) \
                and perm not in (FileShare.PERM_VIEW_DL, FileShare.PERM_VIEW_ONLY):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # can_upload requires rw repo permission
        if perm == FileShare.PERM_VIEW_DL_UPLOAD and \
                repo_folder_permission != PERMISSION_READ_WRITE:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if path != '/':
            s_type = 'd' if stat.S_ISDIR(dirent.mode) else 'f'
            if s_type == 'f':
                file_name = os.path.basename(path.rstrip('/'))
                can_edit, error_msg = can_edit_file(file_name, dirent.size, repo)
                if not can_edit and perm in (FileShare.PERM_EDIT_DL, FileShare.PERM_EDIT_ONLY):
                    error_msg = 'Permission denied.'
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        else:
            s_type = 'd'

        # create share link
        org_id = get_org_id_by_repo_id(repo_id)
        if s_type == 'f':
            fs = FileShare.objects.create_file_link(username, repo_id, path,
                                                    None, None,
                                                    permission=perm, org_id=org_id)

        else:
            fs = FileShare.objects.create_dir_link(username, repo_id, path,
                                                   None, None,
                                                   permission=perm, org_id=org_id)

        fs.save()
        link_info = get_share_link_info(fs)
        return Response(link_info)
