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
from seahub.api2.authentication import TokenAuthentication, SeafileAiAuthentication
from seahub.api2.utils import api_error

from seahub.utils.repo import is_valid_repo_id_format, is_repo_admin
from seahub.ai.utils import create_library_sdoc_index, search, update_library_sdoc_index, \
    delete_library_index, query_task_status, query_library_index_state, question_answering_search_in_library,\
    get_file_download_token, get_search_repos, RELATED_REPOS_PREFIX, RELATED_REPOS_CACHE_TIMEOUT, SEARCH_REPOS_LIMIT, \
    format_repos
from seahub.utils import is_org_context, normalize_cache_key

from seaserv import seafile_api

logger = logging.getLogger(__name__)


class LibrarySdocIndexes(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def post(self, request):
        repo_id = request.data.get('repo_id')
        if not repo_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'repo_id invalid')

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not is_repo_admin(request.user.username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        params = {
            'repo_id': repo_id,
        }

        try:
            resp = create_library_sdoc_index(params)
            if resp.status_code == 500:
                logger.error('create library sdoc index error status: %s body: %s', resp.status_code, resp.text)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
            resp_json = resp.json()
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response(resp_json, resp.status_code)


class Search(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def post(self, request):
        query = request.data.get('query')
        search_repo = request.data.get('search_repo', 'all')

        try:
            count = int(request.data.get('count'))
        except:
            count = 10

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

            is_all_repo = True
        else:
            try:
                repo = seafile_api.get_repo(search_repo)
            except Exception as e:
                logger.error(e)
                error_msg = 'Library %s not found.' % search_repo
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            repos = [(repo.id, repo.origin_repo_id, repo.origin_path, repo.name)]
            is_all_repo = False

        searched_repos, repos_map = format_repos(repos)

        params = {
            'query': query,
            'repos': searched_repos,
            'count': count,
            'is_all_repo': is_all_repo,
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
            real_repo_id = repo[0]
            origin_path = repo[1]
            repo_name = repo[2]
            f['repo_name'] = repo_name
            if not repo:
                continue

            if origin_path:
                if not f['fullpath'].startswith(origin_path):
                    # this operation will reduce the result items, but it will not happen now
                    continue
                else:
                    f['repo_id'] = real_repo_id
                    f['fullpath'] = f['fullpath'].split(origin_path)[-1]

        return Response(resp_json, resp.status_code)


class QuestionAnsweringSearchInLibrary(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def post(self, request):
        query = request.data.get('query')
        repo_id = request.data.get('repo_id')

        try:
            count = int(request.data.get('count'))
        except:
            count = 10

        if not query:
            return api_error(status.HTTP_400_BAD_REQUEST, 'query invalid')

        if not repo_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'repo_id invalid')

        try:
            repo = seafile_api.get_repo(repo_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        repo = (repo.id, repo.origin_repo_id, repo.origin_path, repo.name)

        params = {
            'query': query,
            'repo': repo,
            'count': count,
        }

        try:
            resp = question_answering_search_in_library(params)
            if resp.status_code == 500:
                logger.error('ask in library error status: %s body: %s', resp.status_code, resp.text)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
            resp_json = resp.json()
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response(resp_json, resp.status_code)


class LibrarySdocIndex(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def put(self, request):
        repo_id = request.data.get('repo_id')

        if not repo_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'repo_id invalid')

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not is_repo_admin(request.user.username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        params = {
            'repo_id': repo_id
        }

        try:
            resp = update_library_sdoc_index(params)
            if resp.status_code == 500:
                logger.error('update library sdoc index error status: %s body: %s', resp.status_code, resp.text)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
            resp_json = resp.json()
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response(resp_json, resp.status_code)

    def delete(self, request):
        repo_id = request.data.get('repo_id')
        if not repo_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'repo_id invalid')

        if not is_repo_admin(request.user.username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            resp = delete_library_index(repo_id)
            if resp.status_code == 500:
                logger.error('delete library index error status: %s body: %s', resp.status_code, resp.text)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
            resp_json = resp.json()
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response(resp_json, resp.status_code)


class TaskStatus(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        task_id = request.GET.get('task_id')

        if not task_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'task_id invalid')
        try:
            resp = query_task_status(task_id)
            if resp.status_code == 500:
                logger.error('query task status error status: %s body: %s', resp.status_code, resp.text)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
            resp_json = resp.json()
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response(resp_json, resp.status_code)


class LibraryIndexState(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        repo_id = request.GET.get('repo_id')

        if not repo_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'repo_id invalid')
        try:
            resp = query_library_index_state(repo_id)
            if resp.status_code == 500:
                logger.error('query library index state error status: %s body: %s', resp.status_code, resp.text)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
            resp_json = resp.json()
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response(resp_json, resp.status_code)


class FileDownloadToken(APIView):
    authentication_classes = (SeafileAiAuthentication, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        repo_id = request.GET.get('repo_id')
        path = request.GET.get('path')

        if not repo_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'repo_id invalid')

        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'path invalid')

        file_id = seafile_api.get_file_id_by_path(repo_id, path)
        username = request.user.username
        download_token = get_file_download_token(repo_id, file_id, username)

        library_files_info = {
            'download_token': download_token
        }

        return Response(library_files_info, status.HTTP_200_OK)
