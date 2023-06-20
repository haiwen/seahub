# Copyright (c) 2012-2016 Seafile Ltd.
import os
import time
import json
import logging
import posixpath
import requests

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from django.utils.translation import gettext as _

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error

from seahub.utils import check_filename_with_rename, is_pro_version, \
    gen_inner_file_upload_url, is_valid_dirent_name, normalize_file_path, \
    normalize_dir_path, get_file_type_and_ext
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.views import check_folder_permission
from seahub.utils.file_op import check_file_lock, if_locked_by_online_office
from seahub.views.file import can_preview_file, can_edit_file
from seahub.constants import PERMISSION_READ_WRITE
from seahub.utils.repo import parse_repo_perm, is_repo_admin, is_repo_owner
from seahub.utils.file_types import MARKDOWN, TEXT, SEADOC
from seahub.tags.models import FileUUIDMap
from seahub.seadoc.models import SeadocHistoryName, SeadocDraft

from seahub.settings import MAX_UPLOAD_FILE_NAME_LEN, OFFICE_TEMPLATE_ROOT

from seahub.drafts.models import Draft
from seahub.drafts.utils import is_draft_file, get_file_draft

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

        try:
            is_locked, locked_by_me = check_file_lock(repo_id, file_path, username)
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
            'is_locked': is_locked,
            'can_preview': can_preview,
            'can_edit': can_edit,
        }

        return file_info

    def get(self, request, repo_id, format=None):
        """ Get file info.

        Permission checking:
        1. user with either 'r' or 'rw' permission.
        """

        # argument check
        path = request.GET.get('p', None)
        if not path:
            error_msg = 'p invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            file_id = seafile_api.get_file_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not file_id:
            error_msg = 'File %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        parent_dir = os.path.dirname(path)
        if check_folder_permission(request, repo_id, parent_dir) is None:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        file_info = self.get_file_info(request.user.username, repo_id, path)
        return Response(file_info)

    def post(self, request, repo_id, format=None):
        """ Create, rename, move, copy, revert file

        Permission checking:
        1. create: user with 'rw' permission for current parent dir;
        2. rename: user with 'rw' permission for current file;
        3. move  : user with 'rw' permission for current file, 'rw' permission for dst parent dir;
        4. copy  : user with 'r' permission for current file, 'rw' permission for dst parent dir;
        4. revert: user with 'rw' permission for current file's parent dir;
        """

        # argument check
        path = request.GET.get('p', None)
        if not path:
            error_msg = 'p invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        path = normalize_file_path(path)

        operation = request.data.get('operation', None)
        if not operation:
            error_msg = 'operation invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        operation = operation.lower()
        if operation not in ('create', 'rename', 'move', 'copy', 'revert'):
            error_msg = "operation can only be 'create', 'rename', 'move', 'copy' or 'revert'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        username = request.user.username
        parent_dir = os.path.dirname(path)

        is_draft = request.POST.get('is_draft', '')

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
            if parse_repo_perm(check_folder_permission(request, repo_id, parent_dir)).can_edit_on_web is False:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            if is_draft.lower() == 'true':
                file_name = os.path.basename(path)
                file_dir = os.path.dirname(path)

                draft_type = os.path.splitext(file_name)[0][-7:]
                file_type = os.path.splitext(file_name)[-1]

                if draft_type != '(draft)':
                    f = os.path.splitext(file_name)[0]
                    path = file_dir + '/' + f + '(draft)' + file_type

            # create new empty file
            new_file_name = os.path.basename(path)

            if not is_valid_dirent_name(new_file_name):
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 'name invalid.')

            new_file_name = check_filename_with_rename(repo_id, parent_dir, new_file_name)

            try:
                seafile_api.post_empty_file(repo_id, parent_dir, new_file_name, username)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            if is_draft.lower() == 'true':
                Draft.objects.add(username, repo, path, file_exist=False)

            # update office file by template
            if new_file_name.endswith('.xlsx'):
                empty_file_path = os.path.join(OFFICE_TEMPLATE_ROOT, 'empty.xlsx')
            elif new_file_name.endswith('.pptx'):
                empty_file_path = os.path.join(OFFICE_TEMPLATE_ROOT, 'empty.pptx')
            elif new_file_name.endswith('.docx'):
                empty_file_path = os.path.join(OFFICE_TEMPLATE_ROOT, 'empty.docx')
            else:
                empty_file_path = ''

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

            if len(new_file_name) > MAX_UPLOAD_FILE_NAME_LEN:
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

            # permission check
            if parse_repo_perm(check_folder_permission(request, repo_id, parent_dir)).can_edit_on_web is False:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # check file lock
            try:
                is_locked, locked_by_me = check_file_lock(repo_id, path, username)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            if is_locked and not locked_by_me:
                error_msg = _("File is locked")
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

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

        if operation == 'move':
            # argument check
            dst_repo_id = request.data.get('dst_repo', None)
            dst_dir = request.data.get('dst_dir', None)
            if not dst_repo_id:
                error_msg = 'dst_repo invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

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
            dst_repo = seafile_api.get_repo(dst_repo_id)
            if not dst_repo:
                error_msg = 'Library %s not found.' % dst_repo_id
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            dst_dir_id = seafile_api.get_dir_id_by_path(dst_repo_id, dst_dir)
            if not dst_dir_id:
                error_msg = 'Folder %s not found.' % dst_dir
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            # permission check for source file
            src_repo_id = repo_id
            src_dir = os.path.dirname(path)
            if check_folder_permission(request, src_repo_id, src_dir) != PERMISSION_READ_WRITE:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # permission check for dst dir
            if check_folder_permission(request, dst_repo_id, dst_dir) != PERMISSION_READ_WRITE:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # check file lock
            try:
                is_locked, locked_by_me = check_file_lock(repo_id, path, username)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            if is_locked and not locked_by_me:
                error_msg = _("File is locked")
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # move file
            if src_repo_id == dst_repo_id and src_dir == dst_dir:
                file_info = self.get_file_info(username, repo_id, path)
                return Response(file_info)

            filename = os.path.basename(path)
            new_file_name = check_filename_with_rename(dst_repo_id, dst_dir, filename)
            try:
                seafile_api.move_file(src_repo_id, src_dir,
                                      json.dumps([filename]),
                                      dst_repo_id, dst_dir,
                                      json.dumps([new_file_name]),
                                      replace=False,
                                      username=username, need_progress=0, synchronous=1)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            dst_file_path = posixpath.join(dst_dir, new_file_name)
            dst_file_info = self.get_file_info(username, dst_repo_id, dst_file_path)
            return Response(dst_file_info)

        if operation == 'copy':
            # argument check
            dst_repo_id = request.data.get('dst_repo', None)
            dst_dir = request.data.get('dst_dir', None)
            if not dst_repo_id:
                error_msg = 'dst_repo_id invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

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
            dst_repo = seafile_api.get_repo(dst_repo_id)
            if not dst_repo:
                error_msg = 'Library %s not found.' % dst_repo_id
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            dst_dir_id = seafile_api.get_dir_id_by_path(dst_repo_id, dst_dir)
            if not dst_dir_id:
                error_msg = 'Folder %s not found.' % dst_dir
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            # permission check for source file
            src_repo_id = repo_id
            src_dir = os.path.dirname(path)

            if parse_repo_perm(check_folder_permission(
                            request, src_repo_id, src_dir)).can_copy is False:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # permission check for dst dir
            if check_folder_permission(request, dst_repo_id, dst_dir) != PERMISSION_READ_WRITE:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            filename = os.path.basename(path)
            new_file_name = check_filename_with_rename(dst_repo_id, dst_dir, filename)
            try:
                seafile_api.copy_file(src_repo_id, src_dir,
                                      json.dumps([filename]),
                                      dst_repo_id, dst_dir,
                                      json.dumps([new_file_name]),
                                      username, 0, synchronous=1)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            dst_file_path = posixpath.join(dst_dir, new_file_name)
            dst_file_info = self.get_file_info(username, dst_repo_id, dst_file_path)
            return Response(dst_file_info)

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

                # check file lock
                try:
                    is_locked, locked_by_me = check_file_lock(repo_id, path, username)
                except Exception as e:
                    logger.error(e)
                    error_msg = 'Internal Server Error'
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

                if is_locked and not locked_by_me:
                    error_msg = _("File is locked")
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            else:
                # file NOT exists in repo
                if check_folder_permission(request, repo_id, '/') != PERMISSION_READ_WRITE:
                    error_msg = 'Permission denied.'
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            try:
                seafile_api.revert_file(repo_id, commit_id, path, username)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            return Response({'success': True})

    def put(self, request, repo_id, format=None):
        """ Currently only support lock, unlock, refresh-lock file.

        Permission checking:
        1. user with 'rw' permission for current file;
        """

        if not is_pro_version():
            error_msg = 'file lock feature only supported in professional edition.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # argument check
        path = request.GET.get('p', None)
        if not path:
            error_msg = 'p invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        path = normalize_file_path(path)

        operation = request.data.get('operation', None)
        if not operation:
            error_msg = 'operation invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        operation = operation.lower()
        if operation not in ('lock', 'unlock', 'refresh-lock'):
            error_msg = "operation can only be 'lock', 'unlock' or 'refresh-lock'."
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

        # permission check
        parent_dir = os.path.dirname(path)
        if check_folder_permission(request, repo_id, parent_dir) != PERMISSION_READ_WRITE:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.user.username
        try:
            is_locked, locked_by_me = check_file_lock(repo_id, path, username)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # check if is locked by online office
        locked_by_online_office = if_locked_by_online_office(repo_id, path)

        if operation == 'lock':

            if is_locked:
                error_msg = _("File is locked")
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            expire = request.data.get('expire', 0)
            try:
                expire = int(expire)
            except ValueError:
                error_msg = 'expire invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if expire < 0:
                error_msg = 'expire invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            # lock file
            try:
                if expire > 0:
                    seafile_api.lock_file(repo_id, path, username,
                                          int(time.time()) + expire)
                else:
                    seafile_api.lock_file(repo_id, path, username, 0)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if operation == 'unlock':

            if not is_locked:
                error_msg = _("File is not locked.")
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if locked_by_me or locked_by_online_office or \
                    is_repo_owner(request, repo_id, username) or \
                    is_repo_admin(username, repo_id):
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

        if operation == 'refresh-lock':

            if not is_locked:
                error_msg = _("File is not locked.")
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            expire = request.data.get('expire', 0)
            try:
                expire = int(expire)
            except ValueError:
                error_msg = 'expire invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if expire < 0:
                error_msg = 'expire invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if locked_by_me or locked_by_online_office:
                # refresh lock file
                try:
                    if expire > 0:
                        seafile_api.refresh_file_lock(repo_id, path,
                                                      int(time.time()) + expire)
                    else:
                        seafile_api.refresh_file_lock(repo_id, path)
                except SearpcError as e:
                    logger.error(e)
                    error_msg = 'Internal Server Error'
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
            else:
                error_msg = _("You can not refresh this file's lock.")
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        file_info = self.get_file_info(username, repo_id, path)
        return Response(file_info)

    def delete(self, request, repo_id, format=None):
        """ Delete file.

        Permission checking:
        1. user with 'rw' permission.
        """

        # argument check
        path = request.GET.get('p', None)
        if not path:
            error_msg = 'p invalid.'
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

        username = request.user.username
        if parse_repo_perm(check_folder_permission(request, repo_id, parent_dir)).can_delete is False:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # check file lock
        try:
            is_locked, locked_by_me = check_file_lock(repo_id, path, username)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if is_locked and not locked_by_me:
            error_msg = _("File is locked")
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
                FileUUIDMap.objects.delete_fileuuidmap_by_path(
                    repo_id, parent_dir, file_name, is_dir=False)
                SeadocHistoryName.objects.filter(doc_uuid=file_uuid).delete()
                SeadocDraft.objects.filter(doc_uuid=file_uuid).delete()
        except Exception as e:
            logger.error(e)

        result = {}
        result['success'] = True
        result['commit_id'] = repo.head_cmmt_id
        return Response(result)
