import logging
import os.path
import json
from pysearpc import SearpcError

from seahub.repo_metadata.metadata_server_api import MetadataServerAPI
from seahub.repo_metadata.models import RepoMetadata
from seaserv import seafile_api

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from seahub.api2.utils import api_error, get_file_size
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication, SdocJWTTokenAuthentication
from seahub.utils import get_file_type_and_ext, IMAGE
from seahub.views import check_folder_permission
from seahub.ai.utils import image_caption, translate, writing_assistant, verify_ai_config, generate_summary, \
    generate_file_tags, ocr, is_ai_usage_over_limit

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
        org_id = request.user.org.org_id if request.user.org else None
        username = request.user.username
        record_id = request.data.get('record_id')
        if not repo_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'repo_id invalid')
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'path invalid')
        if not lang:
            return api_error(status.HTTP_400_BAD_REQUEST, 'lang invalid')
        if not record_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'record_id invalid')

        file_type, _ = get_file_type_and_ext(os.path.basename(path))
        if file_type != IMAGE:
            return api_error(status.HTTP_400_BAD_REQUEST, 'file type not image')

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if is_ai_usage_over_limit(request.user, org_id):
            return api_error(status.HTTP_429_TOO_MANY_REQUESTS, 'Credit not enough')

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
            'lang': lang,
            'org_id': org_id,
            'username': username,
            'capture_time': None,
            'address': None
        }
        metadata_server_api = MetadataServerAPI(repo_id, user=request.user.username)

        from seafevents.repo_metadata.constants import METADATA_TABLE

        sql = f'SELECT * FROM `{METADATA_TABLE.name}` WHERE `{METADATA_TABLE.columns.id.name}`=?;'
        parameters = [record_id]
        try:
            query_result = metadata_server_api.query_rows(sql, parameters)
        except Exception as e:
            query_result = None
            logger.error(e)
        if query_result:
            rows = query_result.get('results')[0]
            file_details = rows.get(METADATA_TABLE.columns.file_details.name, None)
            
            if file_details:
                json_str = file_details.split('```json\n')[1].split('\n```')[0]
                capture_time = json.loads(json_str).get('Capture time')
                params['capture_time'] = capture_time
                

            location_translated = rows.get(METADATA_TABLE.columns.location_translated.name, None)
            if location_translated:
                address = location_translated.get('address')
                params['address'] = address

        try:
            resp = image_caption(params)
            resp_json = resp.json()
        except Exception as e:
            logger.error(e)
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
        org_id = request.user.org.org_id if request.user.org else None
        username = request.user.username

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

        if is_ai_usage_over_limit(request.user, org_id):
            return api_error(status.HTTP_429_TOO_MANY_REQUESTS, 'Credit not enough')

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
            'org_id': org_id,
            'username': username
        }

        try:
            resp = generate_summary(params)
            resp_json = resp.json()
        except Exception as e:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(resp_json, resp.status_code)


class GenerateFileTags(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        if not verify_ai_config():
            return api_error(status.HTTP_400_BAD_REQUEST, 'AI server not configured')

        repo_id = request.data.get('repo_id')
        path = request.data.get('path')
        org_id = request.user.org.org_id if request.user.org else None
        username = request.user.username

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

        if is_ai_usage_over_limit(request.user, org_id):
            return api_error(status.HTTP_429_TOO_MANY_REQUESTS, 'Credit not enough')

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
            'org_id': org_id,
            'username': username
        }

        file_type, _ = get_file_type_and_ext(os.path.basename(path))
        if file_type == IMAGE:
            try:
                record = RepoMetadata.objects.filter(repo_id=repo_id).first()
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            params['file_type'] = 'image'
            params['lang'] = record.tags_lang if record and record.tags_enabled else None
        else:
            from seahub.repo_metadata.metadata_server_api import MetadataServerAPI
            from seafevents.repo_metadata.constants import TAGS_TABLE
            metadata_server_api = MetadataServerAPI(repo_id, request.user.username)

            sql = f'SELECT `{TAGS_TABLE.columns.name.name}` FROM `{TAGS_TABLE.name}`'
            query_result = metadata_server_api.query_rows(sql).get('results', [])

            params['file_type'] = 'doc'
            params['candidate_tags'] = [item[TAGS_TABLE.columns.name.name].strip() for item in query_result]

        try:
            resp = generate_file_tags(params)
            resp_json = resp.json()
        except Exception as e:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(resp_json, resp.status_code)


class OCR(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        if not verify_ai_config():
            return api_error(status.HTTP_400_BAD_REQUEST, 'AI server not configured')

        repo_id = request.data.get('repo_id')
        path = request.data.get('path')
        org_id = request.user.org.org_id if request.user.org else None
        username = request.user.username
        if not repo_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'repo_id invalid')
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'path invalid')

        file_type, _ = get_file_type_and_ext(os.path.basename(path))
        if file_type != IMAGE and not path.lower().endswith('.pdf'):
            return api_error(status.HTTP_400_BAD_REQUEST, 'file type not image or pdf')

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission(request, repo_id, os.path.dirname(path))
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if is_ai_usage_over_limit(request.user, org_id):
            return api_error(status.HTTP_429_TOO_MANY_REQUESTS, 'Credit not enough')

        try:
            file_id = seafile_api.get_file_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, f"File {path} not found")

        file_size = get_file_size(repo.store_id, repo.version, file_id)
        if file_size >> 20 > 5:
            error_msg = 'File size exceed the limit.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        token = seafile_api.get_fileserver_access_token(repo_id, file_id, 'download', request.user.username, use_onetime=True)
        if not token:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        params = {
            'file_name': os.path.basename(path),
            'download_token': token,
            'org_id': org_id,
            'username': username
        }

        try:
            resp = ocr(params)
            resp_json = resp.json()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(resp_json, resp.status_code)


class Translate(APIView):
    authentication_classes = (SdocJWTTokenAuthentication, TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        if not verify_ai_config():
            return api_error(status.HTTP_400_BAD_REQUEST, 'AI server not configured')

        text = request.data.get('text')
        lang = request.data.get('lang')
        org_id = request.user.org.org_id if request.user.org else None
        username = request.user.username

        if not text:
            return api_error(status.HTTP_400_BAD_REQUEST, 'text invalid')
        if not lang:
            return api_error(status.HTTP_400_BAD_REQUEST, 'lang invalid')
        
        if is_ai_usage_over_limit(request.user, org_id):
            return api_error(status.HTTP_429_TOO_MANY_REQUESTS, 'Credit not enough')

        params = {
            'text': text,
            'lang': lang,
            'org_id': org_id,
            'username': username
        }

        try:
            resp = translate(params)
            resp_json = resp.json()
        except Exception as e:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(resp_json, resp.status_code)


class WritingAssistant(APIView):
    authentication_classes = (SdocJWTTokenAuthentication, TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        if not verify_ai_config():
            return api_error(status.HTTP_400_BAD_REQUEST, 'AI server not configured')

        text = request.data.get('text')
        writing_type = request.data.get('writing_type')
        custom_prompt = request.data.get('custom_prompt')
        org_id =  request.user.org.org_id if request.user.org else None
        username = request.user.username

        if not text:
            return api_error(status.HTTP_400_BAD_REQUEST, 'text invalid')
        if not custom_prompt and not writing_type:
            return api_error(status.HTTP_400_BAD_REQUEST, 'writing_type invalid')

        if is_ai_usage_over_limit(request.user, org_id):
            return api_error(status.HTTP_429_TOO_MANY_REQUESTS, 'Credit not enough')

        params = {
            'text': text,
            'writing_type': writing_type,
            'custom_prompt': custom_prompt,
            'org_id': org_id,
            'username': username
        }

        try:
            resp = writing_assistant(params)
            resp_json = resp.json()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(resp_json, resp.status_code)

