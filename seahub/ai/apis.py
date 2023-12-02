# -*- coding: utf-8 -*-
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication, SeafileAiAuthentication
from seahub.api2.utils import api_error

from seahub.views import check_folder_permission
from seahub.utils.repo import parse_repo_perm
from seahub.ai.utils import create_library_sdoc_index, similarity_search_in_library, update_library_sdoc_index, \
    delete_library_index, query_task_status, query_library_index_state, get_latest_commit_id, \
    question_answering_search_in_library, get_file_download_token

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

        parent_dir = '/'

        # permission check
        if parse_repo_perm(check_folder_permission(request, repo_id, parent_dir)).can_download is False:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        commit_id = get_latest_commit_id(repo_id)

        params = {
            'repo_id': repo_id,
            'commit_id': commit_id
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


class SimilaritySearchInLibrary(APIView):
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

        params = {
            'query': query,
            'repo_id': repo_id,
            'count': count,
        }

        try:
            resp = similarity_search_in_library(params)
            if resp.status_code == 500:
                logger.error('search in library error status: %s body: %s', resp.status_code, resp.text)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
            resp_json = resp.json()
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

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

        params = {
            'query': query,
            'repo_id': repo_id,
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

        parent_dir = '/'

        # permission check
        if parse_repo_perm(check_folder_permission(request, repo_id, parent_dir)).can_download is False:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        new_commit_id = get_latest_commit_id(repo_id)

        params = {
            'repo_id': repo_id,
            'commit_id': new_commit_id,
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


class RepoCommit(APIView):
    authentication_classes = (SeafileAiAuthentication, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        repo_id = request.GET.get('repo_id')
        if not repo_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'repo_id invalid')

        commit_id = get_latest_commit_id(repo_id)

        repo_info = {
            'commit_id': commit_id
        }

        return Response(repo_info, status.HTTP_200_OK)
