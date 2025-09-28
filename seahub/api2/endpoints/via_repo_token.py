import datetime
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
from rest_framework.response import Response

from rest_framework.views import APIView

from seahub.api2.authentication import RepoAPITokenAuthentication
from seahub.base.models import FileComment, FileTrash
from seahub.repo_api_tokens.utils import get_dir_file_info_list
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, to_python_boolean
from seahub.repo_metadata.constants import METADATA_RECORD_UPDATE_LIMIT
from seahub.repo_metadata.metadata_server_api import list_metadata_view_records, MetadataServerAPI
from seahub.repo_metadata.models import RepoMetadata, RepoMetadataViews
from seahub.repo_metadata.utils import get_update_record, get_unmodifiable_columns, can_read_metadata, \
    remove_tags_table, init_tags, get_table_by_name
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

class ViaRepoMetadataRecords(APIView):
    authentication_classes = (RepoAPITokenAuthentication,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):

        username = request.repo_api_token_obj.generated_by
        repo_id = request.repo_api_token_obj.repo_id

        view_id = request.GET.get('view_id', '')
        start = request.GET.get('start', 0)
        limit = request.GET.get('limit', 1000)

        try:
            start = int(start)
            limit = int(limit)
        except:
            start = 0
            limit = 1000

        if start < 0:
            error_msg = 'start invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if limit < 0:
            error_msg = 'limit invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not view_id:
            error_msg = 'view_id is invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # metadata enable check
        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        tags_enabled = False
        if metadata.tags_enabled:
            tags_enabled = True

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            view = RepoMetadataViews.objects.get_view(repo_id, view_id)
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not view:
            error_msg = 'Metadata view %s not found.' % view_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            results = list_metadata_view_records(repo_id, username, view, tags_enabled, start, limit)
        except Exception as err:
            logger.error(err)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(results)

    def put(self, request):

        repo_id = request.repo_api_token_obj.repo_id
        username = request.repo_api_token_obj.generated_by
        records_data = request.data.get('records_data')
        if not records_data:
            error_msg = 'records_data invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)


        if len(records_data) > METADATA_RECORD_UPDATE_LIMIT:
            error_msg = 'Number of records exceeds the limit of 1000.'
            return api_error(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, error_msg)

        permission = check_folder_permission_by_repo_api(request, repo_id, None)
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, username)

        from seafevents.repo_metadata.constants import METADATA_TABLE
        try:
            columns_data = metadata_server_api.list_columns(METADATA_TABLE.id)
            columns = columns_data.get('columns', [])
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        unmodifiable_column_names = [column.get('name') for column in get_unmodifiable_columns()]

        record_id_to_record = {}
        sql = f'SELECT `_id` FROM `{METADATA_TABLE.name}` WHERE '
        parameters = []
        for record_data in records_data:
            record = record_data.get('record', {})
            if not record:
                continue
            record_id = record_data.get('record_id', '')
            if not record_id:
                error_msg = 'record_id invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            sql += f' `{METADATA_TABLE.columns.id.name}` = ? OR '
            parameters.append(record_id)
            record_id_to_record[record_id] = record

        sql = sql.rstrip('OR ')
        sql += ';'

        if not parameters:
            return Response({'success': True})

        try:
            query_result = metadata_server_api.query_rows(sql, parameters)
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        results = query_result.get('results')
        if not results:
            return Response({'success': True})

        rows = []
        for record in results:
            record_id = record.get('_id')
            to_updated_record = record_id_to_record.get(record_id)
            update = get_update_record(to_updated_record, columns, unmodifiable_column_names)
            if update:
                record_id = record.get('_id')
                update[METADATA_TABLE.columns.id.name] = record_id
                rows.append(update)
        if rows:
            try:
                metadata_server_api.update_rows(METADATA_TABLE.id, rows)
            except Exception as e:
                logger.exception(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})

class ViaRepoMetadataViews(APIView):
    authentication_classes = (RepoAPITokenAuthentication,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        repo_id = request.repo_api_token_obj.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission_by_repo_api(request, repo_id, '/')
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            metadata_views = RepoMetadataViews.objects.list_views(repo_id)
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(metadata_views)

    def post(self, request):
        #  Add a metadata view
        repo_id = request.repo_api_token_obj.repo_id
        metadata_views = RepoMetadataViews.objects.filter(repo_id=repo_id).first()
        view_name = request.data.get('name')
        folder_id = request.data.get('folder_id', None)
        view_type = request.data.get('type', 'table')
        view_data = request.data.get('data', {})

        # check view name
        if not view_name:
            error_msg = 'view name is invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # check folder exist
        if folder_id:
            if not metadata_views:
                error_msg = 'The metadata views does not exists.'
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            if folder_id not in metadata_views.folders_ids:
                return api_error(status.HTTP_400_BAD_REQUEST, 'folder %s does not exists' % folder_id)

        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission_by_repo_api(request, repo_id, '/')
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            new_view = RepoMetadataViews.objects.add_view(repo_id, view_name, view_type, view_data, folder_id)
            if not new_view:
                return api_error(status.HTTP_400_BAD_REQUEST, 'add view failed')
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'view': new_view})

    def put(self, request):
        # Update a metadata view, including rename, change filters and so on
        # by a json data
        repo_id = request.repo_api_token_obj.repo_id
        view_id = request.data.get('view_id', None)
        view_data = request.data.get('view_data', None)
        if not view_id:
            error_msg = 'view_id is invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        if not view_data:
            error_msg = 'view_data is invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        views = RepoMetadataViews.objects.filter(
            repo_id=repo_id,
        ).first()
        if not views:
            error_msg = 'The metadata views does not exists.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if view_id not in views.views_ids:
            error_msg = 'view_id %s does not exists.' % view_id
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission_by_repo_api(request, repo_id, '/')
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            result = RepoMetadataViews.objects.update_view(repo_id, view_id, view_data)
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})

    def delete(self, request):
        # Update a metadata view, including rename, change filters and so on
        # by a json data
        repo_id = request.repo_api_token_obj.repo_id
        view_id = request.data.get('view_id', None)
        folder_id = request.data.get('folder_id', None)
        if not view_id:
            error_msg = 'view_id is invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        metadata_views = RepoMetadataViews.objects.filter(
            repo_id=repo_id
        ).first()
        if not metadata_views:
            error_msg = 'The metadata views does not exists.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # check view exist
        if view_id not in metadata_views.views_ids:
            error_msg = 'view_id %s does not exists.' % view_id
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # check folder exist
        if folder_id and folder_id not in metadata_views.folders_ids:
            return api_error(status.HTTP_400_BAD_REQUEST, 'folder %s does not exists' % folder_id)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission_by_repo_api(request, repo_id, '/')
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            result = RepoMetadataViews.objects.delete_view(repo_id, view_id, folder_id)
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})

class ViaRepoMetadataViewsDuplicateView(APIView):
    authentication_classes = (RepoAPITokenAuthentication,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        view_id = request.data.get('view_id')
        folder_id = request.data.get('folder_id', None)
        repo_id = request.repo_api_token_obj.repo_id
        if not view_id:
            error_msg = 'view_id invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        metadata_views = RepoMetadataViews.objects.filter(
            repo_id=repo_id
        ).first()
        if not metadata_views:
            error_msg = 'The metadata views does not exists.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if view_id not in metadata_views.views_ids:
            error_msg = 'view_id %s does not exists.' % view_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # check folder exist
        if folder_id and folder_id not in metadata_views.folders_ids:
            return api_error(status.HTTP_400_BAD_REQUEST, 'folder %s does not exists' % folder_id)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission_by_repo_api(request, repo_id, '/')
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        try:
            new_view = RepoMetadataViews.objects.duplicate_view(repo_id, view_id, folder_id)
            if not new_view:
                return api_error(status.HTTP_400_BAD_REQUEST, 'duplicate view failed')
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'view': new_view})

class ViaRepoMetadataViewsMoveView(APIView):
    authentication_classes = (RepoAPITokenAuthentication,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        # move view or folder to another position
        source_view_id = request.data.get('source_view_id')
        source_folder_id = request.data.get('source_folder_id')
        target_view_id = request.data.get('target_view_id')
        target_folder_id = request.data.get('target_folder_id')
        is_above_folder = request.data.get('is_above_folder', False)
        repo_id = request.repo_api_token_obj.repo_id

        # must drag view or folder
        if not source_view_id and not source_folder_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'source_view_id and source_folder_id is invalid')

        # must move above to view/folder or move view into folder
        if not target_view_id and not target_folder_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'target_view_id and target_folder_id is invalid')

        # not allowed to drag folder into folder
        if not source_view_id and source_folder_id and target_view_id and target_folder_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'not allowed to drag folder into folder')

        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission_by_repo_api(request, repo_id, '/')
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_views = RepoMetadataViews.objects.filter(
            repo_id=repo_id,
        ).first()
        if not metadata_views:
            error_msg = 'The metadata views does not exists.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # check dragged view exist
        if source_view_id and source_view_id not in metadata_views.views_ids:
            return api_error(status.HTTP_400_BAD_REQUEST, 'source_view_id %s does not exists.' % source_view_id)

        # check dragged view exist
        if source_folder_id and source_folder_id not in metadata_views.folders_ids:
            return api_error(status.HTTP_400_BAD_REQUEST, 'source_view_id %s does not exists.' % source_view_id)

        # check target view exist
        if target_view_id and target_view_id not in metadata_views.views_ids:
            return api_error(status.HTTP_400_BAD_REQUEST, 'target_view_id %s does not exists.' % target_view_id)

        # check target view exist
        if target_folder_id and target_folder_id not in metadata_views.folders_ids:
            return api_error(status.HTTP_400_BAD_REQUEST, 'target_folder_id %s does not exists.' % target_folder_id)

        try:
            results = RepoMetadataViews.objects.move_view(repo_id, source_view_id, source_folder_id, target_view_id, target_folder_id, is_above_folder)
            if not results:
                return api_error(status.HTTP_400_BAD_REQUEST, 'move view or folder failed')
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'navigation': results['navigation']})

class ViaRepoMetadataViewsDetailView(APIView):
    authentication_classes = (RepoAPITokenAuthentication,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, view_id):
        repo_id = request.repo_api_token_obj.repo_id
        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission_by_repo_api(request, repo_id, '/')
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            view = RepoMetadataViews.objects.get_view(repo_id, view_id)
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'view': view})

class ViaRepoMetadataTags(APIView):
    authentication_classes = (RepoAPITokenAuthentication, )
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        repo_id = request.repo_api_token_obj.repo_id
        start = request.GET.get('start', 0)
        limit = request.GET.get('limit', 1000)
        username = request.repo_api_token_obj.generated_by

        try:
            start = int(start)
            limit = int(limit)
        except:
            start = 0
            limit = 1000

        if start < 0:
            error_msg = 'start invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if limit < 0:
            error_msg = 'limit invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled or not metadata.tags_enabled:
            error_msg = f'The tags is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission_by_repo_api(request, repo_id, '/')
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, username)
        from seafevents.repo_metadata.constants import TAGS_TABLE

        sql = f'SELECT * FROM `{TAGS_TABLE.name}` ORDER BY `_ctime` LIMIT {start}, {limit}'
        try:
            query_result = metadata_server_api.query_rows(sql)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(query_result)

    def post(self, request):
        repo_id = request.repo_api_token_obj.repo_id
        tags_data = request.data.get('tags_data', [])
        username = request.repo_api_token_obj.generated_by


        if not tags_data:
            error_msg = 'Tags data is required.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled or not metadata.tags_enabled:
            error_msg = f'The tags is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = f'Library {repo_id} not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission_by_repo_api(request, repo_id, '/')
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, username)

        from seafevents.repo_metadata.constants import TAGS_TABLE
        try:
            tags_table = get_table_by_name(metadata_server_api, TAGS_TABLE.name)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not tags_table:
            return api_error(status.HTTP_404_NOT_FOUND, 'tags table not found')
        tags_table_id = tags_table['id']

        exist_tags = []
        new_tags = []
        tags_names = [tag_data.get(TAGS_TABLE.columns.name.name, '') for tag_data in tags_data]
        tags_names_str = ', '.join([f'"{tag_name}"' for tag_name in tags_names])
        sql = f'SELECT * FROM {TAGS_TABLE.name} WHERE `{TAGS_TABLE.columns.name.name}` in ({tags_names_str})'

        try:
            exist_rows = metadata_server_api.query_rows(sql)
            exist_tags = exist_rows.get('results', [])
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if exist_tags:
            for tag_data in tags_data:
                tag_name = tag_data.get(TAGS_TABLE.columns.name.name, '')
                if tag_name not in tags_names:
                    new_tags.append(tag_data)
        else:
            new_tags = tags_data

        tags = exist_tags
        if not new_tags:
            return Response({'tags': tags})

        try:
            resp = metadata_server_api.insert_rows(tags_table_id, new_tags)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        row_ids = resp.get('row_ids', [])
        row_ids_str = ', '.join([f'"{id}"' for id in row_ids])
        sql = f'SELECT * FROM {TAGS_TABLE.name} WHERE `{TAGS_TABLE.columns.id.name}` in ({row_ids_str})'
        try:
            query_new_rows = metadata_server_api.query_rows(sql)
            new_tags_data = query_new_rows.get('results', [])
            tags.extend(new_tags_data)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'tags': tags})

    def put(self, request):
        repo_id = request.repo_api_token_obj.repo_id
        tags_data = request.data.get('tags_data')
        username = request.repo_api_token_obj.generated_by

        if not tags_data:
            error_msg = 'tags_data invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled or not metadata.tags_enabled:
            error_msg = f'The tags is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission_by_repo_api(request, repo_id, '/')
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, username)

        from seafevents.repo_metadata.constants import TAGS_TABLE
        try:
            tags_table = get_table_by_name(metadata_server_api, TAGS_TABLE.name)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not tags_table:
            return api_error(status.HTTP_404_NOT_FOUND, 'tags table not found')
        tags_table_id = tags_table['id']

        tag_id_to_tag = {}
        sql = f'SELECT `_id` FROM `{TAGS_TABLE.name}` WHERE '
        parameters = []
        for tag_data in tags_data:
            tag = tag_data.get('tag', {})
            if not tag:
                continue
            tag_id = tag_data.get('tag_id', '')
            if not tag_id:
                error_msg = 'record_id invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            sql += f' `{TAGS_TABLE.columns.id.name}` = ? OR '
            parameters.append(tag_id)
            tag_id_to_tag[tag_id] = tag

        sql = sql.rstrip('OR ')
        sql += ';'

        if not parameters:
            return Response({'success': True})

        try:
            query_result = metadata_server_api.query_rows(sql, parameters)
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        results = query_result.get('results')
        if not results:
            # file or folder has been deleted
            return Response({'success': True})

        rows = []
        for tag in results:
            tag_id = tag.get('_id')
            update = tag_id_to_tag.get(tag_id)
            update[TAGS_TABLE.columns.id.name] = tag_id
            rows.append(update)
        if rows:
            try:
                metadata_server_api.update_rows(tags_table_id, rows)
            except Exception as e:
                logger.exception(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})

    def delete(self, request):
        repo_id = request.repo_api_token_obj.repo_id
        tag_ids = request.data.get('tag_ids', [])
        username = request.repo_api_token_obj.generated_by

        if not tag_ids:
            error_msg = 'Tag ids is required.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled or not metadata.tags_enabled:
            error_msg = f'The tags is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission_by_repo_api(request, repo_id, '/')
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, username)

        from seafevents.repo_metadata.constants import TAGS_TABLE
        try:
            tags_table = get_table_by_name(metadata_server_api, TAGS_TABLE.name)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not tags_table:
            return api_error(status.HTTP_404_NOT_FOUND, 'tags table not found')
        tags_table_id = tags_table['id']

        try:
            metadata_server_api.delete_rows(tags_table_id, tag_ids)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})

class ViaRepoMetadataTagsStatusManage(APIView):
    authentication_classes = (RepoAPITokenAuthentication,)
    throttle_classes = (UserRateThrottle,)

    def put(self, request):
        repo_id = request.repo_api_token_obj.repo_id
        lang = request.data.get('lang')
        username = request.repo_api_token_obj.generated_by
        if not lang:
            error_msg = 'lang invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission_by_repo_api(request, repo_id, '/')
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is not enabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        old_tags_enabled = metadata.tags_enabled

        try:
            metadata.tags_enabled = True
            metadata.tags_lang = lang
            metadata.save()
        except Exception as e:
            logger.exception(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        if not old_tags_enabled:
            metadata_server_api = MetadataServerAPI(repo_id, username)
            init_tags(metadata_server_api)

        return Response({'success': True})

    def delete(self, request):
        # resource check
        repo_id = request.repo_api_token_obj.repo_id
        username = request.repo_api_token_obj.generated_by
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        permission = check_folder_permission_by_repo_api(request, repo_id, '/')
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # check dose the repo have opened metadata manage
        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled or not record.tags_enabled:
            error_msg = f'The repo {repo_id} has disabled the tags manage.'
            return api_error(status.HTTP_409_CONFLICT, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id,username)
        try:
            remove_tags_table(metadata_server_api)
        except Exception as err:
            logger.error(err)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        try:
            record.tags_enabled = False
            record.tags_lang = None
            record.save()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})

class ViaRepoMetadataTagsLinks(APIView):
    authentication_classes = (RepoAPITokenAuthentication,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        repo_id = request.repo_api_token_obj.repo_id
        link_column_key = request.data.get('link_column_key')
        row_id_map = request.data.get('row_id_map')

        if not link_column_key:
            return api_error(status.HTTP_400_BAD_REQUEST, 'link_column_key invalid')

        if not row_id_map:
            return api_error(status.HTTP_400_BAD_REQUEST, 'row_id_map invalid')

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission_by_repo_api(request, repo_id, '/')
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)

        try:
            metadata = metadata_server_api.get_metadata()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        from seafevents.repo_metadata.constants import TAGS_TABLE
        tables = metadata.get('tables', [])
        tags_table_id = [table['id'] for table in tables if table['name'] == TAGS_TABLE.name]
        tags_table_id = tags_table_id[0] if tags_table_id else None
        if not tags_table_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'tags not be used')

        try:
            columns_data = metadata_server_api.list_columns(tags_table_id)
            columns = columns_data.get('columns', [])

        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        link_column = [column for column in columns if column['key'] == link_column_key and column['type'] == 'link']
        link_column = link_column[0] if link_column else None
        if not link_column:
            # init self link columns
            if link_column_key == TAGS_TABLE.columns.parent_links.key or link_column_key == TAGS_TABLE.columns.sub_links.key:
                try:
                    init_tag_self_link_columns(metadata_server_api, tags_table_id)
                    link_id = TAGS_TABLE.self_link_id
                    is_linked_back = link_column_key == TAGS_TABLE.columns.sub_links.key if True else False
                except Exception as e:
                    logger.error(e)
                    error_msg = 'Internal Server Error'
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
            else:
                return api_error(status.HTTP_400_BAD_REQUEST, 'link column %s not found' % link_column_key)
        else:
            link_column_data = link_column.get('data', {})
            link_id = link_column_data.get('link_id', '')
            is_linked_back = link_column_data.get('is_linked_back', False)

        if not link_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'invalid link column')

        try:
            metadata_server_api.insert_link(link_id, tags_table_id, row_id_map, is_linked_back)
        except Exception as e:
            logger.exception(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'success': True})

    def put(self, request):
        repo_id = request.repo_api_token_obj.repo_id
        link_column_key = request.data.get('link_column_key')
        row_id_map = request.data.get('row_id_map')

        if not row_id_map:
            return api_error(status.HTTP_400_BAD_REQUEST, 'row_id_map invalid')

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission_by_repo_api(request, repo_id, '/')
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)

        try:
            metadata = metadata_server_api.get_metadata()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        from seafevents.repo_metadata.constants import TAGS_TABLE
        tables = metadata.get('tables', [])
        tags_table_id = [table['id'] for table in tables if table['name'] == TAGS_TABLE.name]
        tags_table_id = tags_table_id[0] if tags_table_id else None
        if not tags_table_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'tags not be used')

        try:
            columns_data = metadata_server_api.list_columns(tags_table_id)
            columns = columns_data.get('columns', [])
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        link_column = [column for column in columns if column['key'] == link_column_key and column['type'] == 'link']
        link_column = link_column[0] if link_column else None
        if not link_column:
            return api_error(status.HTTP_400_BAD_REQUEST, 'link column %s not found' % link_column_key)

        link_column_data = link_column.get('data', {})
        link_id = link_column_data.get('link_id', '')
        is_linked_back = link_column_data.get('is_linked_back', False)

        if not link_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'invalid link column')

        try:
            metadata_server_api.update_link(link_id, tags_table_id, row_id_map, is_linked_back)
        except Exception as e:
            logger.exception(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'success': True})

    def delete(self, request):
        repo_id = request.repo_api_token_obj.repo_id
        link_column_key = request.data.get('link_column_key')
        row_id_map = request.data.get('row_id_map')

        if not link_column_key:
            return api_error(status.HTTP_400_BAD_REQUEST, 'link_id invalid')

        if not row_id_map:
            return api_error(status.HTTP_400_BAD_REQUEST, 'row_id_map invalid')

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission_by_repo_api(request, repo_id, '/')
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)

        try:
            metadata = metadata_server_api.get_metadata()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        from seafevents.repo_metadata.constants import TAGS_TABLE
        tables = metadata.get('tables', [])
        tags_table_id = [table['id'] for table in tables if table['name'] == TAGS_TABLE.name]
        tags_table_id = tags_table_id[0] if tags_table_id else None
        if not tags_table_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'tags not be used')

        try:
            columns_data = metadata_server_api.list_columns(tags_table_id)
            columns = columns_data.get('columns', [])
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        link_column = [column for column in columns if column['key'] == link_column_key and column['type'] == 'link']
        link_column = link_column[0] if link_column else None
        if not link_column:
            return api_error(status.HTTP_400_BAD_REQUEST, 'link column %s not found' % link_column_key)

        link_column_data = link_column.get('data', {})
        link_id = link_column_data.get('link_id', '')
        is_linked_back = link_column_data.get('is_linked_back', False)

        if not link_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'invalid link column')

        try:
            metadata_server_api.delete_link(link_id, tags_table_id, row_id_map, is_linked_back)
        except Exception as e:
            logger.exception(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'success': True})

class ViaRepoMetadataFileTags(APIView):
    authentication_classes = (RepoAPITokenAuthentication,)
    throttle_classes = (UserRateThrottle,)

    def put(self, request):
        repo_id = request.repo_api_token_obj.repo_id
        file_tags_data = request.data.get('file_tags_data')
        if not file_tags_data:
            error_msg = 'file_tags_data invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled or not metadata.tags_enabled:
            error_msg = f'The tags is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission_by_repo_api(request, repo_id, '/')
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        from seafevents.repo_metadata.constants import TAGS_TABLE, METADATA_TABLE
        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)

        success_records = []
        failed_records = []
        for file_tags in file_tags_data:
            record_id = file_tags.get('record_id', '')
            tags = file_tags.get('tags', [])
            if not record_id:
                continue
            try:

                metadata_server_api.update_link(TAGS_TABLE.file_link_id, METADATA_TABLE.id, { record_id: tags })
                success_records.append(record_id)
            except Exception as e:
                failed_records.append(record_id)

        return Response({'success': success_records, 'fail': failed_records})

class ViaRepoMetadataTagFiles(APIView):
    authentication_classes = (RepoAPITokenAuthentication,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, tag_id):
        repo_id = request.repo_api_token_obj.repo_id
        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled or not metadata.tags_enabled:
            error_msg = f'The tags is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission_by_repo_api(request, repo_id, '/')
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)

        from seafevents.repo_metadata.constants import TAGS_TABLE, METADATA_TABLE

        tag_files_record_sql = f'SELECT * FROM {TAGS_TABLE.name} WHERE `{TAGS_TABLE.columns.id.name}` = "{tag_id}"'
        try:
            tag_query = metadata_server_api.query_rows(tag_files_record_sql)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        tag_files_records = tag_query.get('results', [])
        if not tag_files_records:
            return Response({'metadata': [], 'results': []})

        tag_files_record_ids = tag_files_records[0].get(TAGS_TABLE.columns.file_links.name, [])
        if not tag_files_record_ids:
            return Response({'metadata': [], 'results': []})

        tag_files_sql = 'SELECT `%s`, `%s`, `%s`, `%s`, `%s`, `%s` FROM %s WHERE `%s` IN (%s)' % (METADATA_TABLE.columns.id.name, METADATA_TABLE.columns.file_name.name, \
                                                                                    METADATA_TABLE.columns.parent_dir.name, METADATA_TABLE.columns.size.name, \
                                                                                    METADATA_TABLE.columns.file_mtime.name, METADATA_TABLE.columns.tags.name, \
                                                                                    METADATA_TABLE.name, METADATA_TABLE.columns.id.name, \
                                                                                    ', '.join(["'%s'" % id.get('row_id') for id in tag_files_record_ids]))
        try:
            tag_files_query = metadata_server_api.query_rows(tag_files_sql)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(tag_files_query)

class ViaRepoMetadataTagsFiles(APIView):
    authentication_classes = (RepoAPITokenAuthentication,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        repo_id = request.repo_api_token_obj.repo_id
        tags_ids = request.data.get('tags_ids', None)

        if not tags_ids:
            return api_error(status.HTTP_400_BAD_REQUEST, 'tags_ids is invalid.')

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled or not metadata.tags_enabled:
            error_msg = f'The tags is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission_by_repo_api(request, repo_id, '/')
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)

        from seafevents.repo_metadata.constants import TAGS_TABLE, METADATA_TABLE

        tags_ids_str = ', '.join([f'"{id}"' for id in tags_ids])
        sql = f'SELECT * FROM {TAGS_TABLE.name} WHERE `{TAGS_TABLE.columns.id.name}` in ({tags_ids_str})'
        try:
            query_new_rows = metadata_server_api.query_rows(sql)
            found_tags = query_new_rows.get('results', [])
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        if not found_tags:
            return Response([])

        tags_files_ids = []
        for tag in found_tags:
            tags_files_ids.extend(tag.get(TAGS_TABLE.columns.file_links.name, []))

        if not tags_files_ids:
            return Response([])

        tags_files_sql = 'SELECT `%s`, `%s`, `%s`, `%s`, `%s`, `%s` FROM %s WHERE `%s` IN (%s)' % (METADATA_TABLE.columns.id.name, METADATA_TABLE.columns.file_name.name, \
                                                                                    METADATA_TABLE.columns.parent_dir.name, METADATA_TABLE.columns.size.name, \
                                                                                    METADATA_TABLE.columns.file_mtime.name, METADATA_TABLE.columns.tags.name, \
                                                                                    METADATA_TABLE.name, METADATA_TABLE.columns.id.name, \
                                                                                    ', '.join(["'%s'" % id.get('row_id') for id in tags_files_ids]))
        try:
            tags_files_query = metadata_server_api.query_rows(tags_files_sql)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(tags_files_query)

class ViaRepoMetadataMergeTags(APIView):
    authentication_classes = (RepoAPITokenAuthentication,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        repo_id = request.repo_api_token_obj.repo_id
        target_tag_id = request.data.get('target_tag_id')
        merged_tags_ids = request.data.get('merged_tags_ids')

        if not target_tag_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'target_tag_id invalid')

        if not merged_tags_ids:
            return api_error(status.HTTP_400_BAD_REQUEST, 'merged_tags_ids invalid')

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission_by_repo_api(request, repo_id, '/')
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)

        try:
            metadata = metadata_server_api.get_metadata()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        from seafevents.repo_metadata.constants import TAGS_TABLE
        tables = metadata.get('tables', [])
        tags_table_id = [table['id'] for table in tables if table['name'] == TAGS_TABLE.name]
        tags_table_id = tags_table_id[0] if tags_table_id else None
        if not tags_table_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'tags not be used')

        try:
            columns_data = metadata_server_api.list_columns(tags_table_id)
            columns = columns_data.get('columns', [])

        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        op_tags_ids = [target_tag_id] + merged_tags_ids
        op_tags_ids_str = ', '.join([f'"{id}"' for id in op_tags_ids])
        sql = f'SELECT * FROM {TAGS_TABLE.name} WHERE `{TAGS_TABLE.columns.id.name}` in ({op_tags_ids_str})'
        try:
            query_new_rows = metadata_server_api.query_rows(sql)
            op_tags = query_new_rows.get('results', [])
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        if not op_tags:
            return api_error(status.HTTP_400_BAD_REQUEST, 'tags not found')

        target_tag = next((tag for tag in op_tags if tag.get(TAGS_TABLE.columns.id.name) == target_tag_id), None)
        if not target_tag:
            return api_error(status.HTTP_400_BAD_REQUEST, 'target_tag_id invalid')

        merged_tags = [tag for tag in op_tags if  tag[TAGS_TABLE.columns.id.name] in merged_tags_ids]
        if not merged_tags:
            return api_error(status.HTTP_400_BAD_REQUEST, 'merged_tags_ids invalid')

        # get unique parent/child/file links from merged tags which not exist in target tag
        exist_parent_tags_ids = [link['row_id'] for link in target_tag.get(TAGS_TABLE.columns.parent_links.key, [])]
        exist_child_tags_ids = [link['row_id'] for link in target_tag.get(TAGS_TABLE.columns.sub_links.key, [])]
        exist_files_ids = [link['row_id'] for link in target_tag.get(TAGS_TABLE.columns.file_links.key, [])]
        new_parent_tags_ids = []
        new_child_tags_ids = []
        new_files_ids = []
        for merged_tag in merged_tags:
            merged_parent_tags_ids = [link['row_id'] for link in merged_tag.get(TAGS_TABLE.columns.parent_links.key, [])]
            merged_child_tags_ids = [link['row_id'] for link in merged_tag.get(TAGS_TABLE.columns.sub_links.key, [])]
            merged_files_ids = [link['row_id'] for link in merged_tag.get(TAGS_TABLE.columns.file_links.key, [])]
            for merged_parent_tag_id in merged_parent_tags_ids:
                if merged_parent_tag_id not in op_tags_ids and merged_parent_tag_id not in exist_parent_tags_ids:
                    new_parent_tags_ids.append(merged_parent_tag_id)
                    exist_parent_tags_ids.append(merged_parent_tag_id)

            for merged_child_tag_id in merged_child_tags_ids:
                if merged_child_tag_id not in op_tags_ids and merged_child_tag_id not in exist_child_tags_ids:
                    new_child_tags_ids.append(merged_child_tag_id)
                    exist_child_tags_ids.append(merged_child_tag_id)

            for merged_file_id in merged_files_ids:
                if merged_file_id not in exist_files_ids:
                    new_files_ids.append(merged_file_id)
                    exist_files_ids.append(merged_file_id)

        parent_link_column = [column for column in columns if column['key'] == TAGS_TABLE.columns.parent_links.key and column['type'] == 'link']
        parent_link_column = parent_link_column[0] if parent_link_column else None

        # add new parent tags
        if new_parent_tags_ids:
            try:
                metadata_server_api.insert_link(TAGS_TABLE.self_link_id, tags_table_id, { target_tag_id: new_parent_tags_ids })
            except Exception as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        # add new child tags
        if new_child_tags_ids:
            try:
                metadata_server_api.insert_link(TAGS_TABLE.self_link_id, tags_table_id, { target_tag_id: new_child_tags_ids }, True)
            except Exception as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        # add new tag files
        if new_files_ids:
            try:
                metadata_server_api.insert_link(TAGS_TABLE.file_link_id, tags_table_id, { target_tag_id: new_files_ids })
            except Exception as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')


        # remove merge tags
        try:
            metadata_server_api.delete_rows(tags_table_id, merged_tags_ids)
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'success': True})


class ViaRepoRecentlyChangedFiles(APIView):
    authentication_classes = (RepoAPITokenAuthentication,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        repo_id = request.repo_api_token_obj.repo_id
        username = request.repo_api_token_obj.generated_by

        try:
            page = int(request.GET.get('page', 1))
            per_page = int(request.GET.get('per_page', 1000))
        except:
            page = 1
            per_page = 1000

        if page < 1:
            error_msg = 'page invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if per_page < 0:
            error_msg = 'per_page invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        start = (page - 1) * per_page
        limit = per_page

        since = request.GET.get('since')
        if not since:
            error_msg = 'since invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if 'T' not in since or '+' not in since:
            error_msg = 'since invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            datetime.datetime.fromisoformat(since)
        except:
            error_msg = 'since invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission_by_repo_api(request, repo_id, '/')
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, username)
        from seafevents.repo_metadata.constants import METADATA_TABLE

        sql = f'SELECT * FROM `{METADATA_TABLE.name}` WHERE `_file_mtime`>"{since}" AND `_is_dir`=false ORDER BY `_file_mtime` LIMIT {start}, {limit}'

        try:
            query_result = metadata_server_api.query_rows(sql)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'files': query_result.get('results', [])})


class ViaRepoRecentlyDeletedFiles(APIView):
    authentication_classes = (RepoAPITokenAuthentication,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        repo_id = request.repo_api_token_obj.repo_id

        try:
            page = int(request.GET.get('page', 1))
            per_page = int(request.GET.get('per_page', 1000))
        except:
            page = 1
            per_page = 1000

        if page < 1:
            error_msg = 'page invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if per_page < 1:
            error_msg = 'per_page invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        start = (page - 1) * per_page
        limit = per_page

        since = request.GET.get('since')
        if not since:
            error_msg = 'since invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if 'T' not in since or '+' not in since:
            error_msg = 'since invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            dt = datetime.datetime.fromisoformat(since)
            dt = dt.astimezone(datetime.timezone.utc)
            since = dt.strftime('%Y-%m-%d %H:%M:%S')
        except:
            error_msg = 'since invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission_by_repo_api(request, repo_id, '/')
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            deleted_files = FileTrash.objects.filter(repo_id=repo_id, obj_type='file', delete_time__gt=since).order_by('delete_time')[start:limit]
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        files = []
        for file in deleted_files:
            data = {}
            data['obj_name'] = file.obj_name
            data['path'] = file.path
            files.append(data)

        return Response({'files': files})
