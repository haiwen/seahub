# Copyright (c) 2012-2016 Seafile Ltd.
import os
import stat
import json
import logging
import posixpath

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from urllib.parse import quote

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error, to_python_boolean
from seahub.api2.views import get_dir_file_recursively

from seahub.thumbnail.utils import get_thumbnail_src
from seahub.views import check_folder_permission
from seahub.utils import check_filename_with_rename, is_valid_dirent_name, \
        normalize_dir_path, is_pro_version, FILEEXT_TYPE_MAP
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.utils.file_tags import get_files_tags_in_dir
from seahub.utils.file_types import IMAGE, VIDEO, PDF
from seahub.base.models import UserStarredFiles
from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email
from seahub.utils.repo import parse_repo_perm, is_repo_owner
from seahub.share.utils import check_invisible_folder
from seahub.constants import PERMISSION_INVISIBLE
from seahub.repo_metadata.models import RepoMetadata
from seahub.settings import ENABLE_VIDEO_THUMBNAIL, THUMBNAIL_ROOT, THUMBNAIL_DEFAULT_SIZE

from seaserv import seafile_api
from pysearpc import SearpcError

logger = logging.getLogger(__name__)


def get_dir_file_info_list(username, request_type, repo_obj, parent_dir,
        with_thumbnail, thumbnail_size):

    repo_id = repo_obj.id
    dir_info_list = []
    file_info_list = []

    # get dirent(folder and file) list
    parent_dir_id = seafile_api.get_dir_id_by_path(repo_id, parent_dir)
    dir_file_list = seafile_api.list_dir_with_perm(repo_id,
            parent_dir, parent_dir_id, username, -1, -1)

    try:
        starred_items = UserStarredFiles.objects.filter(email=username,
                repo_id=repo_id, path__startswith=parent_dir, org_id=-1)
        starred_item_path_list = [f.path.rstrip('/') for f in starred_items]
    except Exception as e:
        logger.error(e)
        starred_item_path_list = []

    # only get dir info list
    if not request_type or request_type == 'd':

        dir_list = [dirent for dirent in dir_file_list if stat.S_ISDIR(dirent.mode)]

        for dirent in dir_list:

            if dirent.permission == PERMISSION_INVISIBLE:
                continue

            dir_info = {}
            dir_info["type"] = "dir"
            dir_info["id"] = dirent.obj_id
            dir_info["name"] = dirent.obj_name
            dir_info["mtime"] = dirent.mtime
            dir_info["permission"] = dirent.permission
            dir_info["parent_dir"] = parent_dir
            dir_info_list.append(dir_info)

            # get star info
            dir_info['starred'] = False
            dir_path = posixpath.join(parent_dir, dirent.obj_name)
            if dir_path.rstrip('/') in starred_item_path_list:
                dir_info['starred'] = True

    # only get file info list
    if not request_type or request_type == 'f':

        file_list = [dirent for dirent in dir_file_list if not stat.S_ISDIR(dirent.mode)]

        # Use dict to reduce memcache fetch cost in large for-loop.
        nickname_dict = {}
        contact_email_dict = {}
        modifier_set = {x.modifier for x in file_list}
        lock_owner_set = {x.lock_owner for x in file_list}
        for e in modifier_set | lock_owner_set:
            if e not in nickname_dict:
                nickname_dict[e] = email2nickname(e)
            if e not in contact_email_dict:
                contact_email_dict[e] = email2contact_email(e)

        try:
            files_tags_in_dir = get_files_tags_in_dir(repo_id, parent_dir)
        except Exception as e:
            logger.error(e)
            files_tags_in_dir = {}

        for dirent in file_list:

            file_name = dirent.obj_name
            file_path = posixpath.join(parent_dir, file_name)
            file_obj_id = dirent.obj_id

            file_info = {}
            file_info["type"] = "file"
            file_info["id"] = file_obj_id
            file_info["name"] = file_name
            file_info["mtime"] = dirent.mtime
            file_info["permission"] = dirent.permission
            file_info["parent_dir"] = parent_dir
            file_info["size"] = dirent.size

            modifier_email = dirent.modifier
            file_info['modifier_email'] = modifier_email
            file_info['modifier_name'] = nickname_dict.get(modifier_email, '')
            file_info['modifier_contact_email'] = contact_email_dict.get(modifier_email, '')

            # get lock info
            if is_pro_version():
                file_info["is_locked"] = dirent.is_locked
                file_info["lock_time"] = dirent.lock_time
                file_info["is_freezed"] = dirent.expire is not None and dirent.expire < 0

                lock_owner_email = dirent.lock_owner or ''
                file_info["lock_owner"] = lock_owner_email
                file_info['lock_owner_name'] = nickname_dict.get(lock_owner_email, '')
                file_info['lock_owner_contact_email'] = contact_email_dict.get(lock_owner_email, '')

                if username == lock_owner_email:
                    file_info["locked_by_me"] = True
                else:
                    file_info["locked_by_me"] = False

            # get star info
            file_info['starred'] = False
            if file_path.rstrip('/') in starred_item_path_list:
                file_info['starred'] = True

            # get tag info
            file_tags = files_tags_in_dir.get(file_name, [])
            if file_tags:
                file_info['file_tags'] = []
                for file_tag in file_tags:
                    file_info['file_tags'].append(file_tag)

            # get thumbnail info
            if with_thumbnail and not repo_obj.encrypted:

                # used for providing a way to determine
                # if send a request to create thumbnail.

                fileExt = os.path.splitext(file_name)[1][1:].lower()
                file_type = FILEEXT_TYPE_MAP.get(fileExt)

                if file_type in (IMAGE, PDF) or \
                        (file_type == VIDEO and ENABLE_VIDEO_THUMBNAIL):

                    # if thumbnail has already been created, return its src.
                    # Then web browser will use this src to get thumbnail instead of
                    # recreating it.
                    thumbnail_file_path = os.path.join(THUMBNAIL_ROOT,
                            str(thumbnail_size), file_obj_id)
                    if os.path.exists(thumbnail_file_path):
                        src = get_thumbnail_src(repo_id, thumbnail_size, file_path)
                        file_info['encoded_thumbnail_src'] = quote(src)
            file_info_list.append(file_info)

    dir_info_list.sort(key=lambda x: x['name'].lower())
    file_info_list.sort(key=lambda x: x['name'].lower())

    return dir_info_list, file_info_list


class DirView(APIView):
    """
    Support uniform interface for directory operations, including
    create/delete/rename/list, etc.
    """
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get_dir_info(self, repo_id, dir_path):

        dir_obj = seafile_api.get_dirent_by_path(repo_id, dir_path)
        dir_info = {
            'type': 'dir',
            'repo_id': repo_id,
            'parent_dir': os.path.dirname(dir_path.rstrip('/')),
            'obj_name': dir_obj.obj_name if dir_obj else '',
            'obj_id': dir_obj.obj_id if dir_obj else '',
            'mtime': timestamp_to_isoformat_timestr(dir_obj.mtime) if dir_obj else '',
        }

        return dir_info

    def get(self, request, repo_id, format=None):
        """ Get sub dirent list info.

        Permission checking:
        1. user with either 'r' or 'rw' permission.
        """

        # argument check
        recursive = request.GET.get('recursive', '0')
        if recursive not in ('1', '0'):
            error_msg = "If you want to get recursive dir entries, you should set 'recursive' argument as '1'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        request_type = request.GET.get('t', '')
        if request_type and request_type not in ('f', 'd'):
            error_msg = "'t'(type) should be 'f' or 'd'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        with_thumbnail = request.GET.get('with_thumbnail', 'false')
        if with_thumbnail not in ('true', 'false'):
            error_msg = 'with_thumbnail invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        with_thumbnail = to_python_boolean(with_thumbnail)
        thumbnail_size = request.GET.get('thumbnail_size', THUMBNAIL_DEFAULT_SIZE)
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

        parent_dir = request.GET.get('p', '/')
        parent_dir = normalize_dir_path(parent_dir)

        dir_id = seafile_api.get_dir_id_by_path(repo_id, parent_dir)
        if not dir_id:
            error_msg = 'Folder %s not found.' % parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        permission = check_folder_permission(request, repo_id, parent_dir)
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # get dir/file list recursively
        username = request.user.username
        if recursive == '1':

            try:
                dir_file_info_list = get_dir_file_recursively(username, repo_id,
                        parent_dir, [])
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
            # if value of 'p' parameter is '/a/b/c' add with_parents's is 'true'
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
                        request_type, repo, parent_dir, with_thumbnail, thumbnail_size)
                all_dir_info_list.extend(dir_info_list)
                all_file_info_list.extend(file_info_list)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        exist_invisible_folder = False
        if not is_repo_owner(request, repo_id, username):
            try:
                org_id = request.user.org.org_id if request.user.org else None
                exist_invisible_folder = check_invisible_folder(repo_id, username, org_id)
            except Exception as e:
                logger.error(e)

        response_dict = {}
        response_dict["user_perm"] = permission
        response_dict["exist_invisible_folder"] = exist_invisible_folder
        response_dict["dir_id"] = dir_id

        if request_type == 'f':
            response_dict['dirent_list'] = all_file_info_list
        elif request_type == 'd':
            response_dict['dirent_list'] = all_dir_info_list
        else:
            response_dict['dirent_list'] = all_dir_info_list + all_file_info_list

        return Response(response_dict)

    def post(self, request, repo_id, format=None):
        """ Create, rename, revert dir.

        Permission checking:
        1. create: user with 'rw' permission for current dir's parent dir;
        2. rename: user with 'rw' permission for current dir;
        3. revert: user with 'rw' permission for current dir's parent dir;
        """

        # argument check
        path = request.GET.get('p', None)
        if not path or path[0] != '/':
            error_msg = 'p invalid.'
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
            if check_folder_permission(request, repo_id, parent_dir) != 'rw':
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
            if parse_repo_perm(check_folder_permission(request, repo_id, path)).can_edit_on_web is False:
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
                if check_folder_permission(request, repo_id, path) != 'rw':
                    error_msg = 'Permission denied.'
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)
            else:
                # dir NOT exists in repo
                if check_folder_permission(request, repo_id, '/') != 'rw':
                    error_msg = 'Permission denied.'
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            try:
                seafile_api.revert_dir(repo_id, commit_id, path, username)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            return Response({'success': True})

    def delete(self, request, repo_id, format=None):
        """ Delete dir.

        Permission checking:
        1. user with 'rw' permission.
        """

        # argument check
        path = request.GET.get('p', None)
        if not path:
            error_msg = 'p invalid.'
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
        if parse_repo_perm(check_folder_permission(request, repo_id, path)).can_delete is False:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if path[-1] == '/':
            path = path[:-1]

        path = path.rstrip('/')
        username = request.user.username
        parent_dir = os.path.dirname(path)
        dir_name = os.path.basename(path)
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


class DirDetailView(APIView):
    """ Get detailed info of a folder.
    """
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id):
        """ Get dir info.

        Permission checking:
        1. user with either 'r' or 'rw' permission.
        """

        # parameter check
        path = request.GET.get('path', None)
        if not path:
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        path = normalize_dir_path(path)
        if path == '/':
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        dir_id = seafile_api.get_dir_id_by_path(repo_id, path)
        if not dir_id:
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        permission = check_folder_permission(request, repo_id, path)
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        dir_obj = seafile_api.get_dirent_by_path(repo_id, path)  
        
        dir_info = {
            'repo_id': repo_id,
            'path': path,
            'name': dir_obj.obj_name if dir_obj else '',
            'mtime': timestamp_to_isoformat_timestr(dir_obj.mtime) if dir_obj else '',
            'permission': permission,
        }  

        # metadata enable check
        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if metadata and metadata.enabled:
            from seafevents.repo_metadata.constants import METADATA_TABLE
            from seahub.repo_metadata.metadata_server_api import MetadataServerAPI
            metadata_server_api = MetadataServerAPI(repo_id, request.user.username)
            try:
                sql = f"""
                    SELECT 
                        COUNT(*) AS file_count,
                        SUM(`{METADATA_TABLE.columns.size.name}`) AS total_size
                    FROM `{METADATA_TABLE.name}`
                    WHERE 
                        (`{METADATA_TABLE.columns.is_dir.name}` = False) AND 
                        (
                          `{METADATA_TABLE.columns.parent_dir.name}` ILIKE '{path}%' OR
                          `{METADATA_TABLE.columns.parent_dir.name}` = '{path[:-1]}'
                        )
                    """
                results = metadata_server_api.query_rows(sql, [])
                result_row = results.get('results')[0]
                dir_info['file_count'] = result_row.get('file_count', 0)
                dir_info['size'] = result_row.get('total_size', 0)
            except Exception as e:
                logger.exception(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)


        return Response(dir_info)
