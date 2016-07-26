# Copyright (c) 2012-2016 Seafile Ltd.
import stat
import logging
import json
import posixpath

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from django.utils.translation import ugettext as _

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error

from seahub.utils import string2list, get_fileserver_root
from seahub.views import check_folder_permission
from seahub.views.file import send_file_access_msg

import seaserv
from seaserv import seafile_api
from pysearpc import SearpcError

logger = logging.getLogger(__name__)

class DirentsDownloadLinkView(APIView):
    """
    Download multi files/dirs.
    """

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # argument checking
        parent_dir = request.GET.get('parent_dir', None)
        dirent_name_string = request.GET.get('dirents', None)

        if not parent_dir:
            error_msg = 'parent_dir invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not dirent_name_string:
            error_msg = 'dirents invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # folder exist checking
        if not seafile_api.get_dir_id_by_path(repo_id, parent_dir):
            error_msg = 'Folder %s not found.' % parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission checking
        if check_folder_permission(request, repo_id, parent_dir) is None:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        dirent_name_list = string2list(dirent_name_string)
        dirent_list = []
        total_size = 0
        for dirent_name in dirent_name_list:
            dirent_name = dirent_name.strip('/')
            dirent_list.append(dirent_name)

            full_dirent_path = posixpath.join(parent_dir, dirent_name)
            current_dirent = seafile_api.get_dirent_by_path(repo_id, full_dirent_path)
            if stat.S_ISDIR(current_dirent.mode):
                total_size += seafile_api.get_dir_size(repo.store_id,
                    repo.version, current_dirent.obj_id)
            else:
                total_size += current_dirent.size

        if total_size > seaserv.MAX_DOWNLOAD_DIR_SIZE:
            error_msg = _('Total size exceeds limit.')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        fake_obj_id = {}
        fake_obj_id['file_list'] = dirent_list
        fake_obj_id['parent_dir'] = parent_dir

        username = request.user.username
        try:
            token = seafile_api.get_fileserver_access_token(repo_id,
                json.dumps(fake_obj_id), 'download-multi', username, False)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if len(dirent_list) > 10:
            send_file_access_msg(request, repo, parent_dir, 'web')
        else:
            for dirent_name in dirent_list:
                full_dirent_path = posixpath.join(parent_dir, dirent_name)
                send_file_access_msg(request, repo, full_dirent_path, 'web')

        download_url = '%s/files/%s' % (get_fileserver_root(), token)
        return Response({'url': download_url})
