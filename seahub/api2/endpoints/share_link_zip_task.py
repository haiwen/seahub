import logging
import os
import json
import posixpath

from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from django.conf import settings

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

from seahub.views.file import send_file_access_msg
from seahub.share.models import FileShare
from seahub.utils import is_windows_operating_system, \
    is_pro_version

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
            if not request.user.is_authenticated() and \
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

        # get file server access token
        dir_name = repo.name if real_path == '/' else \
                os.path.basename(real_path.rstrip('/'))

        dir_size = seafile_api.get_dir_size(
                repo.store_id, repo.version, dir_id)
        if dir_size > seaserv.MAX_DOWNLOAD_DIR_SIZE:
            error_msg = 'Unable to download directory "%s": size is too large.' % dir_name
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        is_windows = 0
        if is_windows_operating_system(request):
            is_windows = 1

        fake_obj_id = {
            'obj_id': dir_id,
            'dir_name': dir_name,
            'is_windows': is_windows
        }

        username = request.user.username
        try:
            zip_token = seafile_api.get_fileserver_access_token(
                    repo_id, json.dumps(fake_obj_id), 'download-dir', username)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if request.session.get('anonymous_email'):
            request.user.username = request.session.get('anonymous_email')

        send_file_access_msg(request, repo, real_path, 'share-link')

        return Response({'zip_token': zip_token})
