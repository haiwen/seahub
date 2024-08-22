# -*- coding: utf-8 -*-
import os
import logging

from django.core.cache import cache

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error

from seahub.utils.repo import is_valid_repo_id_format, is_repo_admin
from seahub.ai.utils import search, get_file_download_token, get_search_repos, \
    RELATED_REPOS_PREFIX, RELATED_REPOS_CACHE_TIMEOUT, SEARCH_REPOS_LIMIT, \
    format_repos, ocr
from seahub.utils import is_org_context, normalize_cache_key, HAS_FILE_SEASEARCH
from seahub.views import check_folder_permission

from seaserv import seafile_api

logger = logging.getLogger(__name__)


class Search(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def post(self, request):
        if not HAS_FILE_SEASEARCH:
            error_msg = 'Seasearch not supported.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        query = request.data.get('query')
        search_repo = request.data.get('search_repo', 'all')
        suffixes = request.data.get('suffixes', '')

        try:
            count = int(request.data.get('count'))
        except:
            count = 20

        if not query:
            return api_error(status.HTTP_400_BAD_REQUEST, 'query invalid')

        if not is_valid_repo_id_format(search_repo) and search_repo != 'all':
            error_msg = 'search_repo invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if search_repo == 'all':
            org_id = request.user.org.org_id if is_org_context(request) else None

            username = request.user.username
            key = normalize_cache_key(username, RELATED_REPOS_PREFIX)

            repos = cache.get(key, [])
            if not repos:
                repos = get_search_repos(username, org_id)[:SEARCH_REPOS_LIMIT]
                cache.set(key, repos, RELATED_REPOS_CACHE_TIMEOUT)

            search_filename_only = True
        else:
            try:
                repo = seafile_api.get_repo(search_repo)
            except Exception as e:
                logger.error(e)
                error_msg = 'Library %s not found.' % search_repo
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            # permission check
            if not check_folder_permission(request, search_repo, '/'):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            repos = [(repo.id, repo.origin_repo_id, repo.origin_path, repo.name)]
            search_filename_only = False

        searched_repos, repos_map = format_repos(repos)

        suffixes = [suffix.strip() for suffix in suffixes.split(',') if suffix.strip()]
        params = {
            'query': query,
            'repos': searched_repos,
            'count': count,
            'suffixes': suffixes,
            'search_filename_only': search_filename_only,
        }

        try:
            resp = search(params)
            if resp.status_code == 500:
                logger.error('search in library error status: %s body: %s', resp.status_code, resp.text)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
            resp_json = resp.json()
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        for f in resp_json.get('results'):
            repo_id = f['repo_id']
            repo = repos_map.get(repo_id, None)
            if not repo:
                continue
            real_repo_id = repo[0]
            origin_path = repo[1]
            repo_name = repo[2]
            f['repo_name'] = repo_name
            f.pop('_id', None)

            if origin_path:
                if not f['fullpath'].startswith(origin_path):
                    # this operation will reduce the result items, but it will not happen now
                    continue
                else:
                    f['repo_id'] = real_repo_id
                    f['fullpath'] = f['fullpath'].split(origin_path)[-1]

        return Response(resp_json, resp.status_code)


class OCR(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def post(self, request):
        repo_id = request.data.get('repo_id')
        path = request.data.get('path')

        if not repo_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'repo_id invalid')
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'path invalid')

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        file_obj = seafile_api.get_dirent_by_path(repo_id, path)
        if not file_obj:
            error_msg = 'File %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not check_folder_permission(request, repo_id, path):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        params = {
            'repo_id': repo_id,
            'path': path,
            'obj_id': file_obj.obj_id,
        }

        try:
            resp = ocr(params)
            resp_json = resp.json()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(resp_json, resp.status_code)
