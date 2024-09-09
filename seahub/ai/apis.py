import logging
import os.path

from pysearpc import SearpcError
from seaserv import seafile_api

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from seahub.api2.utils import api_error
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.utils import get_file_type_and_ext, IMAGE
from seahub.views import check_folder_permission
from seahub.ai.utils import image_caption, verify_ai_config, generate_summary, image_search

logger = logging.getLogger(__name__)


class ImageCaption(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        if not verify_ai_config():
            return api_error(status.HTTP_400_BAD_REQUEST, 'AI server not configured')

        repo_id = request.data.get('repo_id')
        path = request.data.get('path')
        lang = request.data.get('lang')

        if not repo_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'repo_id invalid')
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'path invalid')
        if not lang:
            return api_error(status.HTTP_400_BAD_REQUEST, 'lang invalid')

        file_type, _ = get_file_type_and_ext(os.path.basename(path))
        if file_type != IMAGE:
            return api_error(status.HTTP_400_BAD_REQUEST, 'file type not image')

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission(request, repo_id, os.path.dirname(path))
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            file_id = seafile_api.get_file_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, f"File {path} not found")

        token = seafile_api.get_fileserver_access_token(repo_id, file_id, 'download', request.user.username, use_onetime=True)
        if not token:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        params = {
            'path': path,
            'download_token': token,
            'lang': lang
        }

        try:
            resp = image_caption(params)
            resp_json = resp.json()
        except Exception as e:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(resp_json, resp.status_code)


class GenerateSummary(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        if not verify_ai_config():
            return api_error(status.HTTP_400_BAD_REQUEST, 'AI server not configured')

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

        permission = check_folder_permission(request, repo_id, os.path.dirname(path))
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            file_id = seafile_api.get_file_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, f"File {path} not found")

        token = seafile_api.get_fileserver_access_token(repo_id, file_id, 'download', request.user.username, use_onetime=True)
        if not token:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        params = {
            'path': path,
            'download_token': token
        }

        try:
            resp = generate_summary(params)
            resp_json = resp.json()
        except Exception as e:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(resp_json, resp.status_code)


class ImageSearch(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

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

        permission = check_folder_permission(request, repo_id, '/')
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            file_id = seafile_api.get_file_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, f"File {path} not found")

        params = {
            'repo_id': repo_id,
            'obj_id': file_id,
            'path': path
        }

        try:
            resp = image_search(params)
            resp_json = resp.json()
        except Exception as e:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(resp_json, resp.status_code)
