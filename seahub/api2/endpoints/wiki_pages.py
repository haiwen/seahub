# Copyright (c) 2012-2016 Seafile Ltd.

import os
import logging
import urllib.request, urllib.error, urllib.parse
import posixpath

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import (
    IsAuthenticated, IsAuthenticatedOrReadOnly)
from rest_framework.response import Response
from rest_framework.views import APIView
from seaserv import seafile_api, get_file_id_by_path
from pysearpc import SearpcError
from django.utils.translation import gettext as _

from seahub.views import check_folder_permission
from seahub.views.file import send_file_access_msg
from seahub.api2.views import get_dir_file_recursively
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, to_python_boolean
from seahub.wiki.models import Wiki, WikiPageMissing
from seahub.wiki.utils import get_wiki_dirs_by_path
from seahub.utils import gen_inner_file_get_url, normalize_dir_path
from seahub.base.templatetags.seahub_tags import email2contact_email, email2nickname

logger = logging.getLogger(__name__)

HTTP_520_OPERATION_FAILED = 520


class WikiPagesDirView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticatedOrReadOnly, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, wiki_id):
        """List all dir files in a wiki.
        """
        try:
            wiki = Wiki.objects.get(id=wiki_id)
        except Wiki.DoesNotExist:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # perm check
        if not wiki.has_read_perm(request):
            error_msg = "Permission denied"
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            repo = seafile_api.get_repo(wiki.repo_id)
            if not repo:
                error_msg = "Wiki library not found."
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        except SearpcError:
            error_msg = "Internal Server Error"
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        with_parents = request.GET.get('with_parents', 'false')
        if with_parents not in ('true', 'false'):
            error_msg = 'with_parents invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        with_parents = to_python_boolean(with_parents)

        parent_dir = request.GET.get("p", '/')
        parent_dir = normalize_dir_path(parent_dir)

        dir_id = seafile_api.get_dir_id_by_path(repo.repo_id, parent_dir)
        if not dir_id:
            error_msg = 'Folder %s not found.' % parent_dir
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

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
                    parent_dir_list.append(tmp_parent_dir)

        all_dirs_info = []
        for parent_dir in parent_dir_list:
            all_dirs = get_wiki_dirs_by_path(repo.repo_id, parent_dir, [])
            all_dirs_info += all_dirs

        return Response({
            "dirent_list": all_dirs_info
        })


class WikiPageContentView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticatedOrReadOnly, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, wiki_id):
        """Get content of a wiki
        """
        path = request.GET.get('p', '/')
        try:
            wiki = Wiki.objects.get(id=wiki_id)
        except Wiki.DoesNotExist:
            error_msg = "Wiki not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # perm check
        if not wiki.has_read_perm(request):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        if request.user.username:
            parent_dir = os.path.dirname(path)
            permission = check_folder_permission(request, wiki.repo_id, parent_dir)
        else:
            permission = 'r'

        try:
            repo = seafile_api.get_repo(wiki.repo_id)
            if not repo:
                error_msg = "Wiki library not found."
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        except SearpcError:
            error_msg = _("Internal Server Error")
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        file_id = None
        try:
            file_id = seafile_api.get_file_id_by_path(repo.repo_id, path)
        except SearpcError as e:
            logger.error(e)
            return api_error(HTTP_520_OPERATION_FAILED,
                             "Failed to get file id by path.")
        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, "File not found")

        # send stats message
        send_file_access_msg(request, repo, path, 'api')

        file_name = os.path.basename(path)
        token = seafile_api.get_fileserver_access_token(repo.repo_id,
                file_id, 'download', '', 'False')

        if not token:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        url = gen_inner_file_get_url(token, file_name)
        file_response = urllib.request.urlopen(url)
        content = file_response.read()

        try:
            dirent = seafile_api.get_dirent_by_path(repo.repo_id, path)
            if dirent:
                latest_contributor, last_modified = dirent.modifier, dirent.mtime
            else:
                latest_contributor, last_modified = None, 0
        except SearpcError as e:
            logger.error(e)
            latest_contributor, last_modified = None, 0

        return Response({
            "content": content,
            "latest_contributor": email2nickname(latest_contributor),
            "last_modified": last_modified,
            "permission": permission,
            })
