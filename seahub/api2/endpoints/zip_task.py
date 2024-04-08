# Copyright (c) 2012-2016 Seafile Ltd.
import logging
import json
import stat
import posixpath

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.conf import settings
from django.utils.translation import gettext as _

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error

from seahub.views import check_folder_permission
from seahub.views.file import send_file_access_msg
from seahub.utils import is_windows_operating_system
from seahub.utils.repo import parse_repo_perm

import seaserv
from seaserv import seafile_api

logger = logging.getLogger(__name__)

class ZipTaskView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id, format=None):
        """ Deprecated.

        Sometimes when user download too many files in one request,
        Nginx will return 414-Request-URI Too Large error.

        So, use the following POST request instead.
        Put all parameters in request body.
        """

        # argument check
        parent_dir = request.GET.get('parent_dir', None)
        if not parent_dir:
            error_msg = 'parent_dir invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        dirent_name_list = request.GET.getlist('dirents', None)
        if not dirent_name_list:
            error_msg = 'dirents invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if len(dirent_name_list) == 1:
            download_type = 'download-dir'
        elif len(dirent_name_list) > 1:
            download_type = 'download-multi'
        else:
            error_msg = 'dirents invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # recourse check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not seafile_api.get_dir_id_by_path(repo_id, parent_dir):
            error_msg = 'Folder %s not found.' % parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        repo_folder_permission = check_folder_permission(request, repo_id, parent_dir)
        if not repo_folder_permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # get file server access token
        is_windows = 0
        if is_windows_operating_system(request):
            is_windows = 1

        if download_type == 'download-dir':
            dir_name = dirent_name_list[0].strip('/')
            full_dir_path = posixpath.join(parent_dir, dir_name)

            dir_id = seafile_api.get_dir_id_by_path(repo_id, full_dir_path)
            if not dir_id:
                error_msg = 'Folder %s not found.' % full_dir_path
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            if not json.loads(seafile_api.is_dir_downloadable(repo_id, json.dumps([full_dir_path]), \
                    request.user.username, repo_folder_permission))['is_downloadable']:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            fake_obj_id = {
                'obj_id': dir_id,
                'dir_name': dir_name,
                'is_windows': is_windows
            }

        if download_type == 'download-multi':
            dirent_list = []
            full_dirent_path_list = []
            for dirent_name in dirent_name_list:
                dirent_name = dirent_name.strip('/')
                dirent_list.append(dirent_name)

                full_dirent_path = posixpath.join(parent_dir, dirent_name)
                current_dirent = seafile_api.get_dirent_by_path(repo_id, full_dirent_path)
                if not current_dirent:
                    continue

                full_dirent_path_list.append(full_dirent_path)

            if not json.loads(seafile_api.is_dir_downloadable(repo_id, json.dumps(full_dirent_path_list), \
                    request.user.username, repo_folder_permission))['is_downloadable']:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            fake_obj_id = {
                'parent_dir': parent_dir,
                'file_list': dirent_list,
                'is_windows': is_windows
            }

        username = request.user.username
        try:
            zip_token = seafile_api.get_fileserver_access_token(
                repo_id, json.dumps(fake_obj_id), download_type, username,
                use_onetime=settings.FILESERVER_TOKEN_ONCE_ONLY
            )
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not zip_token:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if len(dirent_name_list) > 10:
            send_file_access_msg(request, repo, parent_dir, 'web')
        else:
            for dirent_name in dirent_name_list:
                full_dirent_path = posixpath.join(parent_dir, dirent_name)
                send_file_access_msg(request, repo, full_dirent_path, 'web')

        return Response({'zip_token': zip_token})

    def post(self, request, repo_id, format=None):
        """ Get file server token for download-dir and download-multi.

        Permission checking:
        1. user with 'r' or 'rw' permission;
        """

        # argument check
        parent_dir = request.data.get('parent_dir', None)
        if not parent_dir:
            error_msg = 'parent_dir invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        dirent_name_list = request.data.getlist('dirents', None)
        if not dirent_name_list:
            error_msg = 'dirents invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if len(dirent_name_list) == 1:
            download_type = 'download-dir'
        elif len(dirent_name_list) > 1:
            download_type = 'download-multi'
        else:
            error_msg = 'dirents invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # recourse check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not seafile_api.get_dir_id_by_path(repo_id, parent_dir):
            error_msg = 'Folder %s not found.' % parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        repo_folder_permission = check_folder_permission(request, repo_id, parent_dir)
        if parse_repo_perm(repo_folder_permission).can_download is False:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # get file server access token
        is_windows = 0
        if is_windows_operating_system(request):
            is_windows = 1

        if download_type == 'download-dir':
            dir_name = dirent_name_list[0].strip('/')
            full_dir_path = posixpath.join(parent_dir, dir_name)

            dir_id = seafile_api.get_dir_id_by_path(repo_id, full_dir_path)
            if not dir_id:
                error_msg = 'Folder %s not found.' % full_dir_path
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            if not json.loads(seafile_api.is_dir_downloadable(repo_id, json.dumps([full_dir_path]), \
                    request.user.username, repo_folder_permission))['is_downloadable']:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            fake_obj_id = {
                'obj_id': dir_id,
                'dir_name': dir_name,
                'is_windows': is_windows
            }

        if download_type == 'download-multi':
            dirent_list = []
            full_dirent_path_list = []
            for dirent_name in dirent_name_list:
                dirent_name = dirent_name.strip('/')
                dirent_list.append(dirent_name)

                full_dirent_path = posixpath.join(parent_dir, dirent_name)
                current_dirent = seafile_api.get_dirent_by_path(repo_id, full_dirent_path)
                if not current_dirent:
                    continue

                full_dirent_path_list.append(full_dirent_path)

            if not json.loads(seafile_api.is_dir_downloadable(repo_id, json.dumps(full_dirent_path_list), \
                    request.user.username, repo_folder_permission))['is_downloadable']:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            fake_obj_id = {
                'parent_dir': parent_dir,
                'file_list': dirent_list,
                'is_windows': is_windows
            }

        username = request.user.username
        try:
            zip_token = seafile_api.get_fileserver_access_token(
                repo_id, json.dumps(fake_obj_id), download_type, username,
                use_onetime=settings.FILESERVER_TOKEN_ONCE_ONLY
            )
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not zip_token:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if len(dirent_name_list) > 10:
            send_file_access_msg(request, repo, parent_dir, 'web')
        else:
            for dirent_name in dirent_name_list:
                full_dirent_path = posixpath.join(parent_dir, dirent_name)
                send_file_access_msg(request, repo, full_dirent_path, 'web')

        return Response({'zip_token': zip_token})
