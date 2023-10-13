# -*- coding: utf-8 -*-
import os
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
from seahub.ai.utils import create_library_sdoc_index, get_dir_file_recursively, similarity_search_in_library, \
    update_library_sdoc_index, delete_library_index, query_task_status, get_dir_sdoc_info_list

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
        username = request.user.username

        # permission check
        if parse_repo_perm(check_folder_permission(request, repo_id, parent_dir)).can_download is False:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            dir_file_info_list = get_dir_file_recursively(username, repo_id, parent_dir, [])
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        sdoc_info_list = get_dir_sdoc_info_list(dir_file_info_list, repo_id, username)

        params = {
            'repo_id': repo_id,
            'last_modify': repo.last_modify,
            'sdoc_info_list': sdoc_info_list
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

        parent_dir = '/'
        username = request.user.username

        try:
            dir_file_info_list = get_dir_file_recursively(username, repo_id, parent_dir, [])
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        sdoc_info_list = get_dir_sdoc_info_list(dir_file_info_list, repo_id, username)
        sdoc_files_info = {file.get('path'): file for file in sdoc_info_list}
        params = {
            'query': query,
            'associate_id': repo_id,
            'sdoc_files_info': sdoc_files_info,
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
        username = request.user.username

        # permission check
        if parse_repo_perm(check_folder_permission(request, repo_id, parent_dir)).can_download is False:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            dir_file_info_list = get_dir_file_recursively(username, repo_id, parent_dir, [])
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        sdoc_info_list = get_dir_sdoc_info_list(dir_file_info_list, repo_id, username)

        params = {
            'associate_id': repo_id,
            'last_modify': repo.last_modify,
            'sdoc_info_list': sdoc_info_list,
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


class RepoFiles(APIView):
    authentication_classes = (SeafileAiAuthentication, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        repo_id = request.GET.get('repo_id')
        if not repo_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'repo_id invalid')

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        parent_dir = '/'
        username = request.user.username

        try:
            dir_file_info_list = get_dir_file_recursively(username, repo_id, parent_dir, [])
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        sdoc_info_list = get_dir_sdoc_info_list(dir_file_info_list, repo_id, username)

        library_files_info = {
            'associate_id': repo_id,
            'last_modify': repo.last_modify,
            'sdoc_info_list': sdoc_info_list,
        }

        return Response(library_files_info, status.HTTP_200_OK)
