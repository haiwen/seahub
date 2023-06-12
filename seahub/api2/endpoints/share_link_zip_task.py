# Copyright (c) 2012-2016 Seafile Ltd.
import logging
import stat
import os
import json
import posixpath

from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from django.conf import settings
from django.utils.translation import gettext as _

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

from seahub.views.file import send_file_access_msg
from seahub.share.models import FileShare, check_share_link_access
from seahub.utils import is_windows_operating_system, is_pro_version, \
        normalize_dir_path
from seahub.utils.repo import parse_repo_perm
from seahub.settings import ENABLE_SHARE_LINK_AUDIT, SHARE_LINK_LOGIN_REQUIRED

import seaserv
from seaserv import seafile_api

logger = logging.getLogger(__name__)

class ShareLinkZipTaskView(APIView):

    throttle_classes = (UserRateThrottle,)

    def get(self, request, format=None):
        """ Only used for download dir when view dir share link from web.


        Permission checking:
        1. authenticated user OR anonymous user has passed email code check(if necessary);
        """

        # permission check
        if is_pro_version() and settings.ENABLE_SHARE_LINK_AUDIT:
            if not request.user.is_authenticated and \
                    not request.session.get('anonymous_email'):
                # if anonymous user has passed email code check,
                # then his/her email info will be in session.

                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # argument check
        share_link_token = request.GET.get('share_link_token', None)
        if not share_link_token:
            error_msg = 'share_link_token invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        req_path = request.GET.get('path', None)
        if not req_path:
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # recourse check
        fileshare = FileShare.objects.get_valid_dir_link_by_token(share_link_token)
        if not fileshare:
            error_msg = 'share_link_token %s not found.' % share_link_token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if req_path[-1] != '/':
            req_path += '/'

        if req_path == '/':
            real_path = fileshare.path
        else:
            real_path = posixpath.join(fileshare.path, req_path.lstrip('/'))

        if real_path[-1] != '/':
            real_path += '/'

        repo_id = fileshare.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        dir_id = seafile_api.get_dir_id_by_path(repo_id, real_path)
        if not dir_id:
            error_msg = 'Folder %s not found.' % real_path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if parse_repo_perm(seafile_api.check_permission_by_path(
                    repo_id, '/', fileshare.username)).can_download is False:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # get file server access token
        dir_name = repo.name if real_path == '/' else \
                os.path.basename(real_path.rstrip('/'))

        is_windows = 0
        if is_windows_operating_system(request):
            is_windows = 1

        fake_obj_id = {
            'obj_id': dir_id,
            'dir_name': dir_name,
            'is_windows': is_windows
        }

        try:
            zip_token = seafile_api.get_fileserver_access_token(
                repo_id, json.dumps(fake_obj_id), 'download-dir-link',
                fileshare.username, use_onetime=settings.FILESERVER_TOKEN_ONCE_ONLY
            )
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not zip_token:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if request.session.get('anonymous_email'):
            request.user.username = request.session.get('anonymous_email')

        send_file_access_msg(request, repo, real_path, 'share-link')

        return Response({'zip_token': zip_token})

    def post(self, request, format=None):
        """ Only used for download dirents in a folder share link.

        Permission checking:
        1, If enable SHARE_LINK_LOGIN_REQUIRED, user must have been authenticated.
        2, If enable ENABLE_SHARE_LINK_AUDIT, user must have been authenticated, or have been audited.
        3, If share link is encrypted, share link password must have been checked.
        """

        # argument check
        share_link_token = request.data.get('token', None)
        if not share_link_token:
            error_msg = 'share_link_token invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        parent_dir = request.data.get('parent_dir', '/')
        if not parent_dir:
            error_msg = 'parent_dir invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        dirent_name_list = request.data.get('dirents', None)
        if not dirent_name_list:
            error_msg = 'dirent_name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        try:
            share_link= FileShare.objects.get(token=share_link_token)
        except FileShare.DoesNotExist:
            error_msg = 'Share link %s not found.' % share_link_token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if share_link.s_type != 'd':
            error_msg = 'Share link %s is not a folder share link.' % share_link_token
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        repo_id = share_link.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        full_parent_dir = posixpath.join(normalize_dir_path(share_link.path),
                parent_dir.strip('/'))
        full_parent_dir = normalize_dir_path(full_parent_dir)
        dir_id = seafile_api.get_dir_id_by_path(repo_id, full_parent_dir)
        if not dir_id:
            error_msg = 'Folder %s not found.' % parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        # check if login required
        if SHARE_LINK_LOGIN_REQUIRED and \
                not request.user.is_authenticated:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # check share link audit
        if is_pro_version() and ENABLE_SHARE_LINK_AUDIT and \
                not request.user.is_authenticated and \
                not request.session.get('anonymous_email'):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # check share link password
        if share_link.is_encrypted() and not check_share_link_access(request,
                share_link_token):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # check if has download permission for share link creator
        if not parse_repo_perm(seafile_api.check_permission_by_path(
                    repo_id, full_parent_dir, share_link.username)).can_download:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # check if share link has download permission
        if not share_link.get_permissions()['can_download']:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # get file server access token
        is_windows = 0
        if is_windows_operating_system(request):
            is_windows = 1

        dirent_list = []
        for dirent_name in dirent_name_list:

            dirent_name = dirent_name.strip('/')
            full_dirent_path = posixpath.join(full_parent_dir, dirent_name)

            current_dirent = seafile_api.get_dirent_by_path(repo_id, full_dirent_path)
            if not current_dirent:
                continue

            dirent_list.append(dirent_name)

        if not dirent_list:
            error_msg = 'No valid dirent.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        fake_obj_id = {
            'parent_dir': full_parent_dir,
            'file_list': dirent_list,
            'is_windows': is_windows
        }

        try:
            zip_token = seafile_api.get_fileserver_access_token(
                repo_id, json.dumps(fake_obj_id), 'download-multi', '',
                use_onetime=settings.FILESERVER_TOKEN_ONCE_ONLY)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not zip_token:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'zip_token': zip_token})
