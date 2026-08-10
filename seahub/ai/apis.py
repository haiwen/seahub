import time
import logging
import os.path
import json
from django.core.cache import cache
from django.http import StreamingHttpResponse
from django.utils.translation import gettext as _
from pysearpc import SearpcError

from seahub.ai.models import ChatMessageThoughtProcess, ChatMessages, ChatSessions
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
from seahub.utils.repo import parse_repo_perm
from seahub.ai.utils import AI_SCENARIO_SEARCH_ICONS, image_caption, translate, writing_assistant, verify_ai_config, generate_summary, \
    generate_file_tags, ocr, search_icons, is_ai_usage_over_limit, gen_chat_task_id, gen_message_id, \
    get_ai_reply, process_stream_ai_reply, resolve_repo_ai_usage_context, strip_content_details_from_attachments, \
    verify_chat_ai_config, AI_REPLY_TIMEOUT, AI_SCENARIO_CHAT, AI_SCENARIO_FILE_TAGS, AI_SCENARIO_IMAGE_CAPTION, \
    AI_SCENARIO_OCR, AI_SCENARIO_SUMMARY, AI_SCENARIO_TRANSLATE, AI_SCENARIO_WRITING_ASSISTANT, user_passes_ai_chat_folder_permissions
from seahub.tags.models import FileUUIDMap
from seahub.views.file import get_file_view_path_and_perm, get_file_content

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

        permission = check_folder_permission(request, repo_id, os.path.dirname(path))
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        usage_context = resolve_repo_ai_usage_context(repo_id, org_id, AI_SCENARIO_IMAGE_CAPTION)
        if is_ai_usage_over_limit(request.user, usage_context['repo_owner'], usage_context['org_id']):
            return api_error(status.HTTP_429_TOO_MANY_REQUESTS, 'Credit not enough')

        try:
            file_id = seafile_api.get_file_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, f"File {path} not found")

        params = {
            'path': path,
            'lang': lang,
            'obj_id': file_id,
            'repo_id': repo_id,
            'scenario': AI_SCENARIO_IMAGE_CAPTION,
            'capture_time': None,
            'address': None
        }
        metadata_server_api = MetadataServerAPI(repo_id, user=username)

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

        usage_context = resolve_repo_ai_usage_context(repo_id, org_id, AI_SCENARIO_SUMMARY)
        if is_ai_usage_over_limit(request.user, usage_context['repo_owner'], usage_context['org_id']):
            return api_error(status.HTTP_429_TOO_MANY_REQUESTS, 'Credit not enough')

        try:
            file_id = seafile_api.get_file_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, f"File {path} not found")

        

        params = {
            'path': path,
            'obj_id': file_id,
            'repo_id': repo_id,
            'scenario': AI_SCENARIO_SUMMARY,
        }

        try:
            resp = generate_summary(params)
            resp_json = resp.json()
            
        except Exception as e:
            logger.exception(e)
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

        usage_context = resolve_repo_ai_usage_context(repo_id, org_id, AI_SCENARIO_FILE_TAGS)
        if is_ai_usage_over_limit(request.user, usage_context['repo_owner'], usage_context['org_id']):
            return api_error(status.HTTP_429_TOO_MANY_REQUESTS, 'Credit not enough')

        try:
            file_id = seafile_api.get_file_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, f"File {path} not found")

    
        params = {
            'path': path,
            'obj_id': file_id,
            'repo_id': repo_id,
            'scenario': AI_SCENARIO_FILE_TAGS,
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

        usage_context = resolve_repo_ai_usage_context(repo_id, org_id, AI_SCENARIO_OCR)
        if is_ai_usage_over_limit(request.user, usage_context['repo_owner'], usage_context['org_id']):
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

        
        params = {
            'file_name': os.path.basename(path),
            'obj_id': file_id,
            'repo_id': repo_id,
            'scenario': AI_SCENARIO_OCR,
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

        file_uuid = request.data.get('file_uuid')
        text = request.data.get('text')
        lang = request.data.get('lang')
        org_id = request.user.org.org_id if request.user.org else None

        if not file_uuid:
            return api_error(status.HTTP_400_BAD_REQUEST, 'file_uuid invalid')
        if not text:
            return api_error(status.HTTP_400_BAD_REQUEST, 'text invalid')
        if not lang:
            return api_error(status.HTTP_400_BAD_REQUEST, 'lang invalid')

        uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)
        if not uuid_map or uuid_map.is_dir:
            return api_error(status.HTTP_404_NOT_FOUND, 'File not found.')

        repo_id = uuid_map.repo_id

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')
        if not check_folder_permission(request, repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        usage_context = resolve_repo_ai_usage_context(repo_id, org_id, AI_SCENARIO_TRANSLATE)
        if is_ai_usage_over_limit(request.user, usage_context['repo_owner'], usage_context['org_id']):
            return api_error(status.HTTP_429_TOO_MANY_REQUESTS, 'Credit not enough')

        params = {
            'text': text,
            'lang': lang,
            'repo_id': repo_id,
            'scenario': AI_SCENARIO_TRANSLATE,
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

        file_uuid = request.data.get('file_uuid')
        text = request.data.get('text')
        writing_type = request.data.get('writing_type')
        custom_prompt = request.data.get('custom_prompt')
        org_id =  request.user.org.org_id if request.user.org else None

        if not file_uuid:
            return api_error(status.HTTP_400_BAD_REQUEST, 'file_uuid invalid')
        if not text:
            return api_error(status.HTTP_400_BAD_REQUEST, 'text invalid')
        if not custom_prompt and not writing_type:
            return api_error(status.HTTP_400_BAD_REQUEST, 'writing_type invalid')

        uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)
        if not uuid_map or uuid_map.is_dir:
            return api_error(status.HTTP_404_NOT_FOUND, 'File not found.')
        
        repo_id = uuid_map.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')
        if not check_folder_permission(request, repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        usage_context = resolve_repo_ai_usage_context(repo_id, org_id, AI_SCENARIO_WRITING_ASSISTANT)
        if is_ai_usage_over_limit(request.user, usage_context['repo_owner'], usage_context['org_id']):
            return api_error(status.HTTP_429_TOO_MANY_REQUESTS, 'Credit not enough')

        params = {
            'text': text,
            'writing_type': writing_type,
            'custom_prompt': custom_prompt,
            'repo_id': repo_id,
            'scenario': AI_SCENARIO_WRITING_ASSISTANT,
        }

        try:
            resp = writing_assistant(params)
            resp_json = resp.json()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(resp_json, resp.status_code)


class AISearchIcons(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        if not verify_ai_config():
            return api_error(status.HTTP_400_BAD_REQUEST, 'AI server not configured')

        query = request.data.get('query')
        count = request.data.get('count', 15)
        org_id = request.user.org.org_id if request.user.org else None
        username = request.user.username

        if not query:
            return api_error(status.HTTP_400_BAD_REQUEST, 'query invalid')

        if is_ai_usage_over_limit(username, username, org_id):
            return api_error(status.HTTP_429_TOO_MANY_REQUESTS, 'Credit not enough')

        params = {
            'query': query,
            'count': count,
            'org_id': org_id,
            'username': username,
            'scenario': AI_SCENARIO_SEARCH_ICONS,
        }

        try:
            resp = search_icons(params)
            resp_json = resp.json()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(resp_json, resp.status_code)


def get_repo_prompt(repo_id):
    return ''


def check_session_access(session, username):
    return session.username == username or session.is_shared


class ChatSessionsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        repo_id = request.GET.get('repo_id')
        if not repo_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'repo_id parameter is required.')
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')
        if not check_folder_permission(request, repo_id, '/'): 
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')
        if not user_passes_ai_chat_folder_permissions(request, repo_id):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        session_type = request.GET.get('type', 'mine')
        if session_type == 'shared':
            sessions = ChatSessions.objects.get_shared_sessions_by_repo(repo_id)
        else:
            sessions = ChatSessions.objects.get_sessions_by_repo(repo_id, request.user.username)
        return Response({'sessions': [session.to_dict() for session in sessions]})

    def post(self, request):
        repo_id = request.data.get('repo_id')
        session_name = request.data.get('session_name', '')
        if not repo_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'repo_id parameter is required.')
        if not session_name:
            return api_error(status.HTTP_400_BAD_REQUEST, 'session_name parameter is required.')
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')
        if repo.is_virtual:
            return api_error(status.HTTP_403_FORBIDDEN, 'Virtual library is not supported.')
        if not check_folder_permission(request, repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')
        if not user_passes_ai_chat_folder_permissions(request, repo_id):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        session = ChatSessions.objects.create_session(repo_id, session_name, request.user.username)
        return Response({'session': session.to_dict()}, status=status.HTTP_201_CREATED)


class ChatSessionView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def put(self, request, session_uuid):
        session = ChatSessions.objects.get_session_by_uuid(session_uuid)
        if not session:
            return api_error(status.HTTP_404_NOT_FOUND, 'Session not found.')
        if not check_folder_permission(request, session.repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')
        if not user_passes_ai_chat_folder_permissions(request, session.repo_id):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')
        if session.username != request.user.username:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied. Only the session owner can modify this session.')

        session_name = request.data.get('session_name')
        is_shared = request.data.get('is_shared')
        if session_name is None and is_shared is None:
            return api_error(status.HTTP_400_BAD_REQUEST, 'At least one of session_name or is_shared parameter is required.')

        if session_name is not None:
            session.session_name = session_name
        if is_shared is not None:
            session.is_shared = is_shared
        session.save()
        return Response({'success': True, 'session': session.to_dict()})

    def delete(self, request, session_uuid):
        session = ChatSessions.objects.get_session_by_uuid(session_uuid)
        if not session:
            return api_error(status.HTTP_404_NOT_FOUND, 'Session not found.')
        if not check_folder_permission(request, session.repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')
        if not user_passes_ai_chat_folder_permissions(request, session.repo_id):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')
        if session.username != request.user.username:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied. Only the session owner can delete this session.')

        ChatMessages.objects.filter(session_uuid=session_uuid).delete()
        ChatMessageThoughtProcess.objects.filter(session_uuid=session_uuid).delete()
        session.delete()
        return Response({'success': True})


class ChatSessionCopyView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, session_uuid):
        session = ChatSessions.objects.get_session_by_uuid(session_uuid)
        if not session:
            return api_error(status.HTTP_404_NOT_FOUND, 'Session not found.')
        if not check_folder_permission(request, session.repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')
        if not user_passes_ai_chat_folder_permissions(request, session.repo_id):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')
        if session.username != request.user.username and not session.is_shared:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        chat_task_id = gen_chat_task_id(session_uuid)
        if cache.get(chat_task_id) is not None:
            return api_error(status.HTTP_409_CONFLICT, 'There are unfinished tasks in the current session, please try again later.')

        try:
            new_session = ChatSessions.objects.copy_session(session, request.user.username)
        except Exception as error:
            logger.exception('Failure to copy session: %s', error)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal server error')

        return Response({'session': new_session.to_dict()}, status=status.HTTP_201_CREATED)


class ChatMessagesView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, session_uuid):
        session = ChatSessions.objects.get_session_by_uuid(session_uuid)
        if not session:
            return api_error(status.HTTP_404_NOT_FOUND, 'Session not found.')
        if not check_folder_permission(request, session.repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')
        if not user_passes_ai_chat_folder_permissions(request, session.repo_id):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')
        if not check_session_access(session, request.user.username):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        messages = ChatMessages.objects.get_messages_by_session(session_uuid)
        message_ids = [message.message_id for message in messages if message.message_id]
        thought_process_map = {}
        if message_ids:
            thought_process_map = ChatMessageThoughtProcess.objects.get_thought_process_from_session_uuid_and_message_ids(session_uuid, message_ids)

        messages_data = []
        for message in messages:
            data = message.to_dict()
            if message.role == 'assistant':
                thought_process = thought_process_map.get(message.message_id, {})
                if thought_process:
                    data['thought_process'] = thought_process
            messages_data.append(data)

        chat_task_info = cache.get(gen_chat_task_id(session_uuid))
        results = {
            'session': session.to_dict(),
            'messages': messages_data,
            'running_task': chat_task_info is not None,
        }
        if results['running_task']:
            results['user_input'] = chat_task_info['user_input']
        return Response(results)


class ChatMarkdownArtifactView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, file_uuid):
        uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(file_uuid)
        if not uuid_map or uuid_map.is_dir:
            return api_error(status.HTTP_404_NOT_FOUND, 'File not found.')

        repo_id = uuid_map.repo_id
        file_path = os.path.join(uuid_map.parent_path, uuid_map.filename)
        if not check_folder_permission(request, repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')
        if not user_passes_ai_chat_folder_permissions(request, repo_id):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')

        obj_id = seafile_api.get_file_id_by_path(repo_id, file_path)
        if not obj_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'File not found.')

        file_name = os.path.basename(file_path)
        file_type, _ = get_file_type_and_ext(file_name)
        raw_path, inner_path, user_perm = get_file_view_path_and_perm(request, repo_id, obj_id, file_path)
        if user_perm is None:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        err, file_content, encoding = get_file_content(file_type, inner_path, 'utf-8')
        if err:
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, err)

        return Response({
            'repo_id': repo_id,
            'file_uuid': str(uuid_map.uuid),
            'file_name': file_name,
            'path': file_path,
            'content': file_content,
            'encoding': encoding,
        })


class ChatView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        session_uuid = request.GET.get('session_uuid')
        if not session_uuid:
            return api_error(status.HTTP_400_BAD_REQUEST, 'session_uuid parameter is required.')

        session = ChatSessions.objects.get_session_by_uuid(session_uuid)
        if not session:
            return api_error(status.HTTP_404_NOT_FOUND, 'Session not found.')
        if not check_folder_permission(request, session.repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')
        if not user_passes_ai_chat_folder_permissions(request, session.repo_id):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')
        if not check_session_access(session, request.user.username):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        chat_task_id = gen_chat_task_id(session_uuid)
        while cache.get(chat_task_id) is not None:
            time.sleep(0.1)

        ai_reply = ChatMessages.objects.get_last_message_by_session(session_uuid)
        if not ai_reply:
            return Response({'ai_reply': '', 'sources': [], 'session_uuid': session_uuid})

        result = {
            'ai_reply': ai_reply.content,
            'ai_reply_message_id': ai_reply.id,
            'sources': ai_reply.to_dict()['sources'],
            'session_uuid': session_uuid,
        }
        result['thought_process'] = ChatMessageThoughtProcess.objects.get_thought_process_from_session_uuid_and_message_id(
            session_uuid,
            ai_reply.message_id,
        )
        return Response(result)

    def post(self, request):
        if not verify_chat_ai_config():
            return api_error(status.HTTP_400_BAD_REQUEST, 'AI server not configured')

        repo_id = request.data.get('repo_id')
        query = request.data.get('query')
        attachments = request.data.get('attachments', [])
        if not repo_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'repo_id parameter is required.')
        if not query:
            return api_error(status.HTTP_400_BAD_REQUEST, 'query invalid.')
        if not isinstance(attachments, list):
            return api_error(status.HTTP_400_BAD_REQUEST, 'attachments invalid.')

        try:
            repo = seafile_api.get_repo(repo_id)
        except SearpcError as error:
            logger.error(error)
            repo = None
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')
        if repo.is_virtual:
            return api_error(status.HTTP_403_FORBIDDEN, 'Virtual library is not supported.')
        if not check_folder_permission(request, repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')
        if not user_passes_ai_chat_folder_permissions(request, repo_id):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        repo_permission = check_folder_permission(request, repo_id, '/')
        can_upload = parse_repo_perm(repo_permission).can_upload if repo_permission else False

        org_id = request.user.org.org_id if getattr(request.user, 'org', None) else None
        usage_context = resolve_repo_ai_usage_context(repo_id, org_id, AI_SCENARIO_CHAT)
        if is_ai_usage_over_limit(request.user, usage_context['repo_owner'], usage_context['org_id']):
            return api_error(status.HTTP_429_TOO_MANY_REQUESTS, 'Credit not enough')

        session_uuid = request.data.get('session_uuid')
        if not session_uuid:
            session = ChatSessions.objects.create_session(repo_id, _('New chat'), request.user.username)
            session_uuid = session.session_uuid
        else:
            session = ChatSessions.objects.get_session_by_uuid(session_uuid)
            if not session or session.repo_id != repo_id:
                return api_error(status.HTTP_404_NOT_FOUND, 'Session not found.')
            if session.username != request.user.username:
                if session.is_shared:
                    error_msg = 'Permission denied. Only the session owner can continue this chat. Start a new chat from this conversation to continue.'
                else:
                    error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        chat_task_id = gen_chat_task_id(session_uuid)
        if cache.get(chat_task_id) is not None:
            return api_error(status.HTTP_409_CONFLICT, 'There are unfinished tasks in the current session, please try again later.')

        try:
            message_id = gen_message_id(session_uuid)
        except Exception as error:
            logger.exception('Failure to generate message id: %s', error)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal server error')

        params = {
            'repo_id': repo_id,
            'repo_name': repo.name,
            'session_uuid': session_uuid,
            'query': query,
            'attachments': attachments,
            'llm_model': request.data.get('model'),
            'repo_prompt': get_repo_prompt(repo_id),
            'scenario': AI_SCENARIO_CHAT,
        }

        task_info = {
            'user_input': {
                'message': query,
                'attachments': strip_content_details_from_attachments(attachments),
            }
        }
        cache.set(chat_task_id, task_info, AI_REPLY_TIMEOUT)

        try:
            return StreamingHttpResponse(
                process_stream_ai_reply(
                    chat_task_id,
                    get_ai_reply(params),
                    session_uuid,
                    message_id,
                    query,
                    attachments,
                    repo_id,
                    request.user.username,
                    can_upload,
                ),
                content_type='text/event-stream',
                headers={
                    'Cache-Control': 'no-cache',
                    'X-Accel-Buffering': 'no',
                },
            )
        except Exception as error:
            logger.exception('Failure to make stream: %s', error)
            cache.delete(chat_task_id)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal server error')
