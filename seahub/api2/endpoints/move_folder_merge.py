# Copyright (c) 2012-2018 Seafile Ltd.

import json
import stat
import logging
import posixpath

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.utils.translation import gettext as _

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error
from seahub.api2.views import HTTP_443_ABOVE_QUOTA

from seahub.views import check_folder_permission
from seahub.utils.repo import get_repo_owner
from seahub.settings import MAX_PATH

from seaserv import seafile_api

logger = logging.getLogger(__name__)


def get_dirent_name_list(username, repo_id, parent_path):

    file_name_list = []
    folder_name_list = []

    path_id = seafile_api.get_dir_id_by_path(repo_id, parent_path)
    dirs = seafile_api.list_dir_with_perm(repo_id, parent_path,
                                          path_id, username, -1, -1)

    for dirent in dirs:
        if stat.S_ISDIR(dirent.mode):
            folder_name_list.append(dirent.obj_name)
        else:
            file_name_list.append(dirent.obj_name)

    return folder_name_list, file_name_list


def folder_name_duplicate(username, src_folder_name, dst_repo_id, dst_parent_dir):

    dst_folder_name_list, dst_file_name_list = get_dirent_name_list(username,
                                                                    dst_repo_id,
                                                                    dst_parent_dir)

    if src_folder_name in dst_folder_name_list:
        return True
    else:
        return False


def move_folder_with_merge(username,
                           src_repo_id, src_parent_dir, src_dirent_name,
                           dst_repo_id, dst_parent_dir, dst_dirent_name):

    if folder_name_duplicate(username, src_dirent_name,
                             dst_repo_id, dst_parent_dir):

        src_folder_path = posixpath.join(src_parent_dir, src_dirent_name)
        dst_folder_path = posixpath.join(dst_parent_dir, dst_dirent_name)
        src_sub_folder_name_list, src_sub_file_name_list = get_dirent_name_list(username,
                                                                                src_repo_id,
                                                                                src_folder_path)

        # for sub file, copy it directly
        for src_sub_file_name in src_sub_file_name_list:
            seafile_api.move_file(src_repo_id, src_folder_path,
                                  json.dumps([src_sub_file_name]),
                                  dst_repo_id, dst_folder_path,
                                  json.dumps([src_sub_file_name]),
                                  replace=False, username=username, need_progress=0)

        for src_sub_folder_name in src_sub_folder_name_list:
            move_folder_with_merge(username,
                                   src_repo_id, src_folder_path, src_sub_folder_name,
                                   dst_repo_id, dst_folder_path, src_sub_folder_name)
    else:
        seafile_api.move_file(src_repo_id, src_parent_dir,
                              json.dumps([src_dirent_name]),
                              dst_repo_id, dst_parent_dir,
                              json.dumps([dst_dirent_name]),
                              replace=False, username=username, need_progress=0)


class MoveFolderMergeView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        """ Only support move folder.

        Permission checking:

        User with 'rw' permission for src/dst folder.
        """
        src_repo_id = request.data.get('src_repo_id', None)
        src_parent_dir = request.data.get('src_parent_dir', None)
        src_folder_name = request.data.get('src_dirent_name', None)
        dst_repo_id = request.data.get('dst_repo_id', None)
        dst_parent_dir = request.data.get('dst_parent_dir', None)

        # argument check
        if not src_repo_id:
            error_msg = 'src_repo_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not src_parent_dir:
            error_msg = 'src_parent_dir invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not src_folder_name:
            error_msg = 'src_dirent_name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not dst_repo_id:
            error_msg = 'dst_repo_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not dst_parent_dir:
            error_msg = 'dst_parent_dir invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if src_repo_id == dst_repo_id and src_parent_dir == dst_parent_dir:
            error_msg = _('Invalid destination path')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if len(dst_parent_dir + src_folder_name) > MAX_PATH:
            error_msg = _('Destination path is too long.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # src resource check
        src_repo = seafile_api.get_repo(src_repo_id)
        if not src_repo:
            error_msg = 'Library %s not found.' % src_repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        src_folder_path = posixpath.join(src_parent_dir, src_folder_name)
        dir_id = seafile_api.get_dir_id_by_path(src_repo_id, src_folder_path)
        if not dir_id:
            error_msg = 'Folder %s not found.' % src_folder_path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # dst resource check
        dst_repo = seafile_api.get_repo(dst_repo_id)
        if not dst_repo:
            error_msg = 'Library %s not found.' % dst_repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not seafile_api.get_dir_id_by_path(dst_repo_id, dst_parent_dir):
            error_msg = 'Folder %s not found.' % dst_parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check for src folder
        if check_folder_permission(request, src_repo_id, src_folder_path) != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # permission check for dst parent dir
        if check_folder_permission(request, dst_repo_id, dst_parent_dir) != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # check if above quota for dst repo
        if get_repo_owner(request, src_repo_id) != get_repo_owner(request, dst_repo_id):

            if seafile_api.check_quota(dst_repo_id, 0) < 0:
                return api_error(HTTP_443_ABOVE_QUOTA, _("Out of quota."))

        username = request.user.username
        move_folder_with_merge(username,
                               src_repo_id, src_parent_dir, src_folder_name,
                               dst_repo_id, dst_parent_dir, src_folder_name)

        seafile_api.del_file(src_repo_id, src_parent_dir,
                             json.dumps([src_folder_name]),
                             username)

        return Response({'success': True})
