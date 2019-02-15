# Copyright (c) 2012-2018 Seafile Ltd.
import os
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api

from seahub.api2.utils import api_error, to_python_boolean
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.utils import normalize_dir_path, normalize_file_path, \
        is_org_context
from seahub.views import check_folder_permission

from seahub.base.models import UserStarredFiles
from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email

logger = logging.getLogger(__name__)


class StarredItems(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get_starred_item_info(self, repo, starred_item):

        result = {}

        email = starred_item.email
        result['id'] = starred_item.id
        result['user_email'] = starred_item.email
        result['user_name'] = email2nickname(email)
        result['user_contact_email'] = email2contact_email(email)

        repo_id = starred_item.repo_id
        result['repo_id'] = repo_id
        result['repo_name'] = repo.repo_name if repo else ''
        result['repo_encrypted'] = repo.encrypted

        path = starred_item.path
        if starred_item.is_dir:
            path = normalize_dir_path(path)
            result['is_dir'] = True
        else:
            path = normalize_file_path(path)
            result['is_dir'] = False

        result['path'] = path
        if path == '/':
            result['obj_name'] = repo.repo_name if repo else ''
            result['mtime'] = timestamp_to_isoformat_timestr(repo.mtime) if \
                    repo else ''
        else:
            result['obj_name'] = os.path.basename(path.rstrip('/'))
            dirent = seafile_api.get_dirent_by_path(repo_id, path)
            result['mtime'] = timestamp_to_isoformat_timestr(dirent.mtime) if \
                    dirent else ''

        return result

    def get(self, request):
        """ List all starred file/folder.

        Permission checking:
        1. all authenticated user can perform this action.
        """

        result = []
        email = request.user.username
        all_starred_items = UserStarredFiles.objects.filter(email=email)

        for starred_item in all_starred_items:

            repo_id = starred_item.repo_id
            path = starred_item.path

            repo = seafile_api.get_repo(repo_id)
            if not repo:
                continue

            if starred_item.is_dir:
                if not seafile_api.get_dir_id_by_path(repo_id, path):
                    continue
            else:
                if not seafile_api.get_file_id_by_path(repo_id, path):
                    continue

            item_info = self.get_starred_item_info(repo, starred_item)
            result.append(item_info)

        result.sort(lambda x, y: cmp(y['mtime'], x['mtime']))
        return Response({'star_item_list': result})

    def post(self, request):
        """ Star a file/folder.

        Permission checking:
        1. all authenticated user can perform this action.
        2. r/rw permission
        """

        # argument check
        repo_id = request.data.get('repo_id', None)
        if not repo_id:
            error_msg = 'repo_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        path = request.data.get('path', None)
        if not path:
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        is_dir = request.data.get('is_dir', None)
        if not is_dir:
            error_msg = 'is_dir invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        is_dir = is_dir.lower()
        if is_dir not in ('true', 'false'):
            error_msg = "is_dir should be 'true' or 'false'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        is_dir = to_python_boolean(is_dir)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if is_dir:
            path = normalize_dir_path(path)
            if not seafile_api.get_dir_id_by_path(repo_id, path):
                error_msg = 'Folder %s not found.' % path
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        else:
            path = normalize_file_path(path)
            if not seafile_api.get_file_id_by_path(repo_id, path):
                error_msg = 'File %s not found.' % path
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not check_folder_permission(request, repo_id, '/'):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # star a item
        email = request.user.username

        org_id = None
        if is_org_context(request):
            org_id = request.user.org.org_id

        try:
            starred_item = UserStarredFiles.objects.add(email,
                    repo_id, path, is_dir, org_id or -1)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # get info of new starred item
        item_info = self.get_starred_item_info(repo, starred_item)
        return Response(item_info)

class StarredItem(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def delete(self, request, pk):
        """ Unstar a file/folder.

        Permission checking:
        1. all authenticated user can perform this action.
        2. r/rw permission
        """

        # resource check
        try:
            star_item = UserStarredFiles.objects.get(id=pk)
        except UserStarredFiles.DoesNotExist:
            error_msg = 'Starred item %s not found.' % pk
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_id = star_item.repo_id

        # permission check
        if not check_folder_permission(request, repo_id, '/'):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # unstar a item
        try:
            star_item.delete()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
