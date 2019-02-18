# Copyright (c) 2012-2018 Seafile Ltd.
import os
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api

from seahub.api2.utils import api_error
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.utils import normalize_file_path, normalize_dir_path, is_org_context
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

        item_info = {}

        repo_id = starred_item.repo_id
        item_info['repo_id'] = repo_id
        item_info['repo_name'] = repo.repo_name if repo else ''
        item_info['repo_encrypted'] = repo.encrypted
        item_info['is_dir'] = starred_item.is_dir

        path = starred_item.path

        item_info['path'] = path
        if path == '/':
            item_info['obj_name'] = repo.repo_name if repo else ''
            item_info['mtime'] = timestamp_to_isoformat_timestr(repo.mtime) if \
                    repo else ''
        else:
            item_info['obj_name'] = os.path.basename(path.rstrip('/'))
            dirent = seafile_api.get_dirent_by_path(repo_id, path)
            item_info['mtime'] = timestamp_to_isoformat_timestr(dirent.mtime) if \
                    dirent else ''

        return item_info

    def get(self, request):
        """ List all starred file/folder.

        Permission checking:
        1. all authenticated user can perform this action.
        """

        result = []
        email = request.user.username
        all_starred_items = UserStarredFiles.objects.filter(email=email)

        repo_dict = {}
        for starred_item in all_starred_items:
            repo_id = starred_item.repo_id
            if repo_id not in repo_dict:
                repo = seafile_api.get_repo(repo_id)
                if repo:
                    repo_dict[repo_id] = repo

        for starred_item in all_starred_items:

            repo_id = starred_item.repo_id
            if repo_id not in repo_dict:
                continue

            path = starred_item.path
            if starred_item.is_dir:
                if not seafile_api.get_dir_id_by_path(repo_id, path):
                    continue
            else:
                if not seafile_api.get_file_id_by_path(repo_id, path):
                    continue

            repo = repo_dict[repo_id]
            item_info = self.get_starred_item_info(repo, starred_item)

            email = starred_item.email
            item_info['user_email'] = email
            item_info['user_name'] = email2nickname(email)
            item_info['user_contact_email'] = email2contact_email(email)

            result.append(item_info)

        result.sort(lambda x, y: cmp(y['mtime'], x['mtime']))
        return Response({'starred_item_list': result})

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

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if seafile_api.get_dir_id_by_path(repo_id, path):
            is_dir = True
            path = normalize_dir_path(path)
        elif seafile_api.get_file_id_by_path(repo_id, path):
            is_dir = False
            path = normalize_file_path(path)
        else:
            error_msg = 'Item %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not check_folder_permission(request, repo_id, '/'):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # star a item
        email = request.user.username
        starred_item = UserStarredFiles.objects.get_starred_item(email, repo_id, path)
        if not starred_item:
            org_id = None
            if is_org_context(request):
                org_id = request.user.org.org_id

            try:
                starred_item = UserStarredFiles.objects.add_starred_item(email,
                        repo_id, path, is_dir, org_id or -1)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # get info of new starred item
        item_info = self.get_starred_item_info(repo, starred_item)
        item_info['user_email'] = email
        item_info['user_name'] = email2nickname(email)
        item_info['user_contact_email'] = email2contact_email(email)

        return Response(item_info)

    def delete(self, request):
        """ Unstar a file/folder.

        Permission checking:
        1. all authenticated user can perform this action.
        2. r/rw permission
        """

        # argument check
        repo_id = request.GET.get('repo_id', None)
        if not repo_id:
            error_msg = 'repo_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        path = request.GET.get('path', None)
        if not path:
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # permission check
        if not check_folder_permission(request, repo_id, '/'):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # unstar a item
        email = request.user.username
        try:
            UserStarredFiles.objects.delete_starred_item(email, repo_id, path)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
