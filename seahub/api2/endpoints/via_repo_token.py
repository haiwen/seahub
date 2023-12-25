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
from seahub.drafts.models import Draft
from seahub.drafts.utils import is_draft_file, get_file_draft
from seahub.repo_api_tokens.utils import get_dir_file_info_list
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, to_python_boolean

from seaserv import seafile_api, get_repo, check_quota
from pysearpc import SearpcError

import seahub.settings as settings
from seahub.repo_api_tokens.utils import get_dir_file_recursively
from seahub.constants import PERMISSION_READ, PERMISSION_READ_WRITE
from seahub.seadoc.utils import move_sdoc_images_to_different_repo
from seahub.utils.file_op import check_file_lock
from seahub.utils.file_types import SEADOC, MARKDOWN, TEXT
from seahub.utils import normalize_dir_path, check_filename_with_rename, gen_file_upload_url, is_valid_dirent_name, \
    normalize_file_path, render_error, gen_file_get_url, is_pro_version, get_file_type_and_ext
from seahub.utils.repo import get_sub_folder_permission_by_dir, parse_repo_perm, get_locked_files_by_dir
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.views import check_folder_permission
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


class ViaRepoBatchMove(APIView):
    authentication_classes = (RepoAPITokenAuthentication, SessionAuthentication)
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
    authentication_classes = (RepoAPITokenAuthentication, SessionAuthentication)
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
    authentication_classes = (RepoAPITokenAuthentication, SessionAuthentication)
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
        # argument check
        if not repo_id:
            error_msg = 'repo_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

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
    authentication_classes = (RepoAPITokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)

    def get_file_info(self, username, repo_id, file_path):

        repo = seafile_api.get_repo(repo_id)
        file_obj = seafile_api.get_dirent_by_path(repo_id, file_path)
        if file_obj:
            file_name = file_obj.obj_name
            file_size = file_obj.size
            can_preview, error_msg = can_preview_file(file_name, file_size, repo)
            can_edit, error_msg = can_edit_file(file_name, file_size, repo)
        else:
            file_name = os.path.basename(file_path.rstrip('/'))
            file_size = ''
            can_preview = False
            can_edit = False

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
        }

        return file_info

    def post(self, request, format=None):
        """ Create, rename, move, copy, revert file

        Permission checking:
        2. rename: user with 'rw' permission for current file;
        4. revert: user with 'rw' permission for current file's parent dir;
        """
        repo_id = request.repo_api_token_obj.repo_id
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
        if operation not in ('rename', 'revert'):
            error_msg = "operation can only be 'rename', 'revert'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        username = ''
        parent_dir = os.path.dirname(path)

        is_draft = request.POST.get('is_draft', '')

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

            # rename draft file
            filetype, fileext = get_file_type_and_ext(new_file_name)
            if filetype == MARKDOWN or filetype == TEXT:
                is_draft = is_draft_file(repo.id, path)
                review = get_file_draft(repo.id, path, is_draft)
                draft_id = review['draft_id']
                if is_draft:
                    try:
                        draft = Draft.objects.get(pk=draft_id)
                        draft.draft_file_path = new_file_path
                        draft.save()
                    except Draft.DoesNotExist:
                        pass

            file_info = self.get_file_info(username, repo_id, new_file_path)
            return Response(file_info)

        if operation == 'revert':
            commit_id = request.data.get('commit_id', None)
            if not commit_id:
                error_msg = 'commit_id invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if seafile_api.get_file_id_by_path(repo_id, path):
                # file exists in repo
                if check_folder_permission(request, repo_id, parent_dir) != PERMISSION_READ_WRITE:
                    error_msg = 'Permission denied.'
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            try:
                seafile_api.revert_file(repo_id, commit_id, path, username)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            return Response({'success': True})
