# Copyright (c) 2012-2018 Seafile Ltd.
import os
import logging
import posixpath

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api

from seahub.api2.utils import api_error
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle

from seahub.tags.models import FileUUIDMap
from seahub.utils import get_service_url, normalize_dir_path, \
        normalize_file_path
from seahub.utils.repo import is_valid_repo_id_format
from seahub.views import check_folder_permission

from seahub.api2.utils import to_python_boolean

logger = logging.getLogger(__name__)


def gen_smart_link(dirent_uuid):

    service_url = get_service_url()
    service_url = service_url.rstrip('/')
    return '%s/smart-link/%s/' % (service_url, dirent_uuid)


class SmartLink(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """ Get smart link of a file/dir.
        """

        # argument check
        repo_id = request.GET.get('repo_id', None)
        if not repo_id or not is_valid_repo_id_format(repo_id):
            error_msg = 'repo_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        path = request.GET.get('path', None)
        if not path:
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        is_dir = request.GET.get('is_dir', None)
        if not is_dir:
            error_msg = 'is_dir invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        is_dir = is_dir.lower()
        if is_dir not in ('true', 'false'):
            error_msg = "is_dir can only be 'true' or 'false'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        is_dir = to_python_boolean(is_dir)
        if is_dir:
            if not seafile_api.get_dir_id_by_path(repo_id, normalize_dir_path(path)):
                error_msg = 'Folder %s not found.' % path
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        else:
            if not seafile_api.get_file_id_by_path(repo_id, normalize_file_path(path)):
                error_msg = 'File %s not found.' % path
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not check_folder_permission(request, repo_id, '/'):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # make sure path:
        # 1. starts with '/'
        # 2. NOT ends with '/'
        path = normalize_file_path(path)
        parent_dir = os.path.dirname(path)
        dirent_name = os.path.basename(path)

        # get file/dir uuid
        if repo.is_virtual:
            repo_id = repo.origin_repo_id
            path = posixpath.join(repo.origin_path, path.strip('/'))

            path = normalize_file_path(path)
            parent_dir = os.path.dirname(path)
            dirent_name = os.path.basename(path)

        try:
            uuid_map = FileUUIDMap.objects.get_or_create_fileuuidmap(repo_id,
                    parent_dir, dirent_name, is_dir)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        dirent_uuid = uuid_map.uuid
        smart_link = gen_smart_link(dirent_uuid)

        result = {}
        result['smart_link'] = smart_link
        result['smart_link_token'] = dirent_uuid
        result['name'] = dirent_name

        return Response(result)


class SmartLinkToken(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, token):
        """ Get library/file/folder info via smart link token.
        """

        uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(token)
        if not uuid_map:
            error_msg = 'token invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        repo_id = uuid_map.repo_id
        parent_path = uuid_map.parent_path
        filename = uuid_map.filename
        is_dir = uuid_map.is_dir

        # permission check
        if not check_folder_permission(request, repo_id, parent_path):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        full_path = posixpath.join(parent_path, filename)

        result = {}
        result['repo_id'] = repo_id
        result['path'] = full_path
        result['is_dir'] = is_dir

        return Response(result)
