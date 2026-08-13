import time
import logging
import os.path
import json
import jwt
from django.core.cache import cache
from django.http import StreamingHttpResponse
from django.utils.translation import gettext as _
from django.utils import timezone
from django.db import transaction
from django.conf import settings
from pysearpc import SearpcError

from seahub.ai.models import ChatMessageThoughtProcess, ChatMessages, ChatSessions, ReviewTask, ensure_review_tables
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
from seahub.utils.file_types import SEADOC
from seahub.views import check_folder_permission
from seahub.utils.repo import parse_repo_perm
from seahub.ai.utils import AI_SCENARIO_SEARCH_ICONS, image_caption, translate, writing_assistant, verify_ai_config, generate_summary, \
    generate_file_tags, ocr, search_icons, is_ai_usage_over_limit, gen_chat_task_id, gen_message_id, \
    get_ai_reply, process_stream_ai_reply, resolve_repo_ai_usage_context, strip_content_details_from_attachments, \
    verify_chat_ai_config, AI_REPLY_TIMEOUT, AI_SCENARIO_CHAT, AI_SCENARIO_FILE_TAGS, AI_SCENARIO_IMAGE_CAPTION, \
    AI_SCENARIO_OCR, AI_SCENARIO_SUMMARY, AI_SCENARIO_TRANSLATE, AI_SCENARIO_WRITING_ASSISTANT, user_passes_ai_chat_folder_permissions, \
    generate_sdoc_review
from seahub.tags.models import FileUUIDMap
from seahub.views.file import get_file_view_path_and_perm, get_file_content
from seahub.seadoc.sdoc_server_api import SdocServerAPI
from seahub.seadoc.utils import gen_seadoc_access_token

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


def get_sdoc_review_task(task_id):
    try:
        return ReviewTask.objects.get(id=task_id)
    except ReviewTask.DoesNotExist:
        return None


def get_sdoc_review_target(request, repo_id, path):
    logger.info('sdoc_review_target: repo=%s path=%s', repo_id, path)
    if not repo_id or not path:
        logger.warning('sdoc_review_target: missing repo_id or path')
        return None, api_error(status.HTTP_400_BAD_REQUEST, 'repo_id and path are required.')

    repo = seafile_api.get_repo(repo_id)
    if not repo:
        logger.warning('sdoc_review_target: repo not found repo=%s', repo_id)
        return None, api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')

    parent_path = os.path.dirname(path) or '/'
    if not check_folder_permission(request, repo_id, parent_path):
        logger.warning('sdoc_review_target: permission denied repo=%s path=%s', repo_id, parent_path)
        return None, api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

    basename = os.path.basename(path)
    file_type, file_ext = get_file_type_and_ext(basename)
    logger.info('sdoc_review_target: basename=%s file_type=%s file_ext=%s', basename, file_type, file_ext)
    if file_type != SEADOC:
        logger.warning('sdoc_review_target: not an sdoc file_type=%s', file_type)
        return None, api_error(status.HTTP_404_NOT_FOUND, 'SDoc not found.')

    try:
        uuid_map = FileUUIDMap.objects.get_or_create_fileuuidmap_by_path(repo_id, path, False, pending=True)
        logger.info('sdoc_review_target: uuid_map=%s', uuid_map.uuid if uuid_map else 'None')
        return uuid_map, None
    except Exception as e:
        logger.exception('sdoc_review_target: failed to get_or_create uuid_map: %s', e)
        return None, api_error(status.HTTP_404_NOT_FOUND, 'SDoc not found.')


def generate_sdoc_service_token(file_uuid, filename, username, purpose, **claims):
    payload = {
        'file_uuid': str(file_uuid),
        'filename': filename,
        'username': username,
        'permission': 'rw',
        'purpose': purpose,
        'exp': int(time.time()) + 60,
    }
    payload.update(claims)
    return jwt.encode(payload, settings.SEADOC_PRIVATE_KEY, algorithm='HS256')


def verify_sdoc_save_result_token(request, task_id, file_uuid, applied_sdoc_version, outcome, saved_version=None):
    auth = request.headers.get('Authorization', '').split()
    if len(auth) != 2 or auth[0].lower() != 'token':
        return False
    try:
        payload = jwt.decode(auth[1], settings.SEADOC_PRIVATE_KEY, algorithms=['HS256'])
    except Exception:
        return False

    if payload.get('purpose') != 'sdoc_agent_save_result':
        return False
    if str(payload.get('task_id')) != str(task_id):
        return False
    if str(payload.get('file_uuid')) != str(file_uuid):
        return False
    if payload.get('applied_sdoc_version') != applied_sdoc_version:
        return False
    if payload.get('outcome') != outcome:
        return False
    if outcome == 'persisted' and payload.get('saved_version') != saved_version:
        return False
    return True


def iter_sdoc_text_leaves(elements, block_type=None, block_id=None):
    for element in elements or []:
        if not isinstance(element, dict):
            continue
        element_type = element.get('type') or block_type
        current_block_id = element.get('id') or block_id
        children = element.get('children')
        if 'text' in element:
            yield element, block_type, block_id
            continue
        if isinstance(children, list):
            yield from iter_sdoc_text_leaves(children, element_type, current_block_id)


def validate_sdoc_review_candidate(candidate, elements):
    if not isinstance(candidate, dict):
        raise ValueError('Invalid review suggestion.')
    required_fields = (
        'operation_kind', 'target_block_id', 'target_text_node_id', 'target_block_type',
        'start_offset', 'end_offset', 'before_leaf_text', 'before_range_text', 'after_text', 'rationale')
    if any(field not in candidate for field in required_fields):
        raise ValueError('The review suggestion is incomplete.')
    if candidate['operation_kind'] != 'replace_text':
        raise ValueError('Only text replacement is supported.')
    if candidate['target_block_type'] not in ('title', 'subtitle', 'header1', 'header2', 'header3', 'header4', 'header5', 'header6', 'paragraph'):
        raise ValueError('This document element is not supported.')
    if not isinstance(candidate['start_offset'], int) or not isinstance(candidate['end_offset'], int):
        raise ValueError('Invalid text range.')
    if not isinstance(candidate['after_text'], str) or len(candidate['after_text']) > 2000:
        raise ValueError('The replacement text is too long.')

    for leaf, block_type, block_id in iter_sdoc_text_leaves(elements):
        if leaf.get('id') != candidate['target_text_node_id']:
            continue
        if block_id != candidate['target_block_id'] or block_type != candidate['target_block_type']:
            raise ValueError('The review target does not match the document.')
        leaf_text = leaf.get('text', '')
        start_offset = candidate['start_offset']
        end_offset = candidate['end_offset']
        if start_offset < 0 or end_offset < start_offset or end_offset > len(leaf_text):
            raise ValueError('The text range is invalid.')
        if candidate['before_leaf_text'] != leaf_text:
            raise ValueError('The review target text has changed.')
        if candidate['before_range_text'] != leaf_text[start_offset:end_offset]:
            raise ValueError('The review target range does not match.')
        return
    raise ValueError('The review target was not found.')


class ReviewTasksView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        ensure_review_tables()
        repo_id = request.data.get('repo_id')
        path = request.data.get('path')
        prompt = request.data.get('prompt', '').strip()
        session_uuid = request.data.get('session_uuid')
        if not prompt:
            return api_error(status.HTTP_400_BAD_REQUEST, 'prompt is required.')

        uuid_map, error = get_sdoc_review_target(request, repo_id, path)
        if error:
            return error

        session = ChatSessions.objects.get_session_by_uuid(session_uuid) if session_uuid else None
        if not session or session.repo_id != repo_id or session.username != request.user.username:
            return api_error(status.HTTP_404_NOT_FOUND, 'Session not found.')

        try:
            service_token = generate_sdoc_service_token(
                uuid_map.uuid, uuid_map.filename, request.user.username, 'sdoc_agent_snapshot')
            sdoc_api = SdocServerAPI(str(uuid_map.uuid), uuid_map.filename, request.user.username, access_token=service_token)
            snapshot = sdoc_api.get_review_snapshot()
        except Exception as error:
            logger.exception('Failed to load SDoc review snapshot: %s', error)
            return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, 'SDoc is unavailable.')

        elements = snapshot.get('elements')
        base_version = snapshot.get('version')
        if not isinstance(elements, list) or not isinstance(base_version, int):
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Invalid SDoc snapshot.')

        try:
            message_id = gen_message_id(session_uuid)
        except Exception as error:
            logger.exception('Failed to allocate chat message id: %s', error)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal server error.')

        with transaction.atomic():
            user_message = ChatMessages.objects.create_message(session_uuid, message_id, 'user', prompt, attachments=[])
            task = ReviewTask.objects.create(
                chat_session_id=session_uuid,
                repo_id=repo_id,
                path=path,
                file_uuid=str(uuid_map.uuid),
                requester=request.user.username,
                prompt=prompt,
                base_sdoc_version=base_version,
            )

        try:
            candidate = generate_sdoc_review({
                'prompt': prompt,
                'elements': elements,
                'username': request.user.username,
                'org_id': request.user.org.org_id if getattr(request.user, 'org', None) else None,
            })
            validate_sdoc_review_candidate(candidate, elements)
        except ValueError as error:
            task.status = ReviewTask.STATUS_FAILED
            task.error_code = 'invalid_candidate'
            task.save(update_fields=['status', 'error_code', 'updated_at'])
            assistant_message = ChatMessages.objects.create_message(session_uuid, message_id, 'assistant', str(error), attachments=[])
            return Response({
                'task': task.to_dict(),
                'messages': [user_message.to_dict(), assistant_message.to_dict()],
            }, status=status.HTTP_201_CREATED)
        except Exception as error:
            logger.exception('Failed to generate SDoc review: %s', error)
            task.status = ReviewTask.STATUS_FAILED
            task.error_code = 'generation_failed'
            task.save(update_fields=['status', 'error_code', 'updated_at'])
            assistant_message = ChatMessages.objects.create_message(session_uuid, message_id, 'assistant', _('Unable to generate a review suggestion.'), attachments=[])
            return Response({
                'task': task.to_dict(),
                'messages': [user_message.to_dict(), assistant_message.to_dict()],
            }, status=status.HTTP_201_CREATED)

        with transaction.atomic():
            assistant_message = ChatMessages.objects.create_message(
                session_uuid,
                message_id,
                'assistant',
                _('I created a review suggestion.'),
            )
            task.assistant_message = assistant_message
            task.status = ReviewTask.STATUS_REVIEW_READY
            task.target_block_id = candidate['target_block_id']
            task.target_text_node_id = candidate['target_text_node_id']
            task.target_block_type = candidate['target_block_type']
            task.before_leaf_text = candidate['before_leaf_text']
            task.before_range_text = candidate['before_range_text']
            task.start_offset = candidate['start_offset']
            task.end_offset = candidate['end_offset']
            task.after_text = candidate['after_text']
            task.rationale = candidate['rationale']
            task.save()
            ChatSessions.objects.filter(session_uuid=session_uuid).update(updated_at=timezone.now())

        return Response({
            'task': task.to_dict(),
            'messages': [user_message.to_dict(), assistant_message.to_dict()],
        }, status=status.HTTP_201_CREATED)


class ReviewTaskView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)

    def get(self, request, task_id):
        ensure_review_tables()
        task = get_sdoc_review_task(task_id)
        if not task:
            return api_error(status.HTTP_404_NOT_FOUND, 'Review task not found.')
        _, error = get_sdoc_review_target(request, task.repo_id, task.path)
        if error:
            return error
        return Response({'task': task.to_dict()})


class ReviewTaskApproveView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)

    def post(self, request, task_id):
        ensure_review_tables()
        task = get_sdoc_review_task(task_id)
        if not task:
            return api_error(status.HTTP_404_NOT_FOUND, 'Review task not found.')
        uuid_map, error = get_sdoc_review_target(request, task.repo_id, task.path)
        if error:
            return error
        permission = check_folder_permission(request, task.repo_id, os.path.dirname(task.path) or '/')
        if not permission or not parse_repo_perm(permission).can_edit_on_web:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        claimed = ReviewTask.objects.filter(
            id=task.id, status=ReviewTask.STATUS_REVIEW_READY).update(
            status=ReviewTask.STATUS_APPLYING,
            approved_by=request.user.username,
            updated_at=timezone.now())
        if not claimed:
            task.refresh_from_db()
            return Response({'task': task.to_dict()})

        task.refresh_from_db()
        token = generate_sdoc_service_token(
            uuid_map.uuid, uuid_map.filename, request.user.username,
            'sdoc_agent_apply', task_id=str(task.id), approved_by=task.approved_by)
        try:
            sdoc_api = SdocServerAPI(str(uuid_map.uuid), uuid_map.filename, request.user.username)
            result = sdoc_api.apply_change_set(token, {
                'task_id': str(task.id),
                'expected_version': task.base_sdoc_version,
                'approved_by': task.approved_by,
                'target_block_id': task.target_block_id,
                'target_text_node_id': task.target_text_node_id,
                'target_block_type': task.target_block_type,
                'before_leaf_text': task.before_leaf_text,
                'before_range_text': task.before_range_text,
                'start_offset': task.start_offset,
                'end_offset': task.end_offset,
                'after_text': task.after_text,
            })
        except Exception as error:
            logger.exception('Failed to apply SDoc review: %s', error)
            task.status = ReviewTask.STATUS_FAILED
            task.error_code = 'apply_failed'
            task.save(update_fields=['status', 'error_code', 'updated_at'])
            return Response({'task': task.to_dict()})

        if result.get('status') == 'stale':
            task.status = ReviewTask.STATUS_STALE
            task.save(update_fields=['status', 'updated_at'])
            return Response({'task': task.to_dict()})
        if result.get('status') != 'applied':
            task.status = ReviewTask.STATUS_FAILED
            task.error_code = result.get('error_code', 'apply_failed')
            task.save(update_fields=['status', 'error_code', 'updated_at'])
            return Response({'task': task.to_dict()})

        applied_version = result.get('applied_version')
        updated = ReviewTask.objects.filter(
            id=task.id, status=ReviewTask.STATUS_APPLYING).update(
            status=ReviewTask.STATUS_APPLIED,
            applied_sdoc_version=applied_version,
            updated_at=timezone.now())
        task.refresh_from_db()
        return Response({'task': task.to_dict()})


class ReviewTaskRejectView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)

    def post(self, request, task_id):
        ensure_review_tables()
        task = get_sdoc_review_task(task_id)
        if not task:
            return api_error(status.HTTP_404_NOT_FOUND, 'Review task not found.')
        _, error = get_sdoc_review_target(request, task.repo_id, task.path)
        if error:
            return error
        ReviewTask.objects.filter(id=task.id, status=ReviewTask.STATUS_REVIEW_READY).update(
            status=ReviewTask.STATUS_REJECTED, updated_at=timezone.now())
        task.refresh_from_db()
        return Response({'task': task.to_dict()})


class ReviewSaveResultView(APIView):
    authentication_classes = ()
    permission_classes = ()

    def post(self, request):
        ensure_review_tables()
        task_id = request.data.get('task_id')
        file_uuid = request.data.get('file_uuid')
        applied_version = request.data.get('applied_sdoc_version')
        outcome = request.data.get('outcome')
        saved_version = request.data.get('saved_version')
        if not task_id or not file_uuid or not isinstance(applied_version, int) or outcome not in ('persisted', 'save_pending', 'file_unavailable'):
            return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid save result.')
        if outcome == 'persisted' and not isinstance(saved_version, int):
            return api_error(status.HTTP_400_BAD_REQUEST, 'saved_version is required.')

        task = get_sdoc_review_task(task_id)
        if not task or str(task.file_uuid) != str(file_uuid):
            return api_error(status.HTTP_404_NOT_FOUND, 'Review task not found.')
        if not verify_sdoc_save_result_token(request, task_id, file_uuid, applied_version, outcome, saved_version):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        if task.status == ReviewTask.STATUS_PERSISTED:
            if outcome == 'persisted' and task.applied_sdoc_version == applied_version:
                return Response({'task': task.to_dict()})
            return api_error(status.HTTP_409_CONFLICT, 'Save result conflicts with current task state.')

        if task.status not in (ReviewTask.STATUS_APPLYING, ReviewTask.STATUS_APPLIED, ReviewTask.STATUS_SAVE_PENDING):
            return api_error(status.HTTP_409_CONFLICT, 'Review task cannot accept a save result.')
        if task.status != ReviewTask.STATUS_APPLYING and task.applied_sdoc_version != applied_version:
            return api_error(status.HTTP_409_CONFLICT, 'Applied version does not match.')

        if outcome == 'persisted':
            if applied_version > saved_version:
                return api_error(status.HTTP_409_CONFLICT, 'Saved version is behind the applied version.')
            task.status = ReviewTask.STATUS_PERSISTED
            task.applied_sdoc_version = applied_version
            task.error_code = None
        elif outcome == 'save_pending':
            task.status = ReviewTask.STATUS_SAVE_PENDING
            task.applied_sdoc_version = applied_version
        else:
            task.status = ReviewTask.STATUS_FAILED
            task.applied_sdoc_version = applied_version
            task.error_code = 'file_unavailable'
        task.save(update_fields=['status', 'applied_sdoc_version', 'error_code', 'updated_at'])
        return Response({'task': task.to_dict()})


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
