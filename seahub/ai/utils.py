import json
import logging
import os
import posixpath
import re
import requests
import jwt
import time
import uuid
from copy import deepcopy
from urllib.parse import urljoin

from django.core.cache import cache
from django.utils.translation import gettext as _
from django.utils import timezone
from django.db.models.functions import Coalesce
from django.db.models import Sum, Value
from seaserv import seafile_api, ccnet_api, get_org_id_by_repo_id,

from seahub.settings import SEAFILE_AI_SECRET_KEY, SEAFILE_AI_SERVER_URL
from seahub.tags.models import FileUUIDMap
from seahub.role_permissions.utils import get_enabled_role_permissions_by_role
from seahub.constants import DEFAULT_USER, PERMISSION_INVISIBLE
from seahub.share.utils import is_repo_admin
from seahub.utils import HAS_FILE_SEASEARCH, gen_inner_file_upload_url, get_service_url, is_org_context, is_pro_version, mkstemp
from seahub.utils.user_permissions import get_user_role
from seahub.utils.ccnet_db import CcnetDB
from seahub.organizations.models import OrgMemberQuota
from seahub.ai.models import AIUsageStatistics, ChatMessageThoughtProcess, ChatMessages, ChatSessions
try:
    from seahub.settings import ORG_MEMBER_QUOTA_ENABLED
except ImportError:
    ORG_MEMBER_QUOTA_ENABLED = False

logger = logging.getLogger(__name__)

AI_REPLY_TIMEOUT = 180
GENERATED_MARKDOWN_DIR = '/AI Generated/'
MARKDOWN_FILE_RE = re.compile(
    r'<seafile-ai-markdown(?:\s+file_name=(["\'])([^"\']*?)\1)?\s*>([\s\S]*?)</seafile-ai-markdown>'
)
MARKDOWN_LINK_TAG_RE = re.compile(
    r'\s*<seafile-ai-markdown-link\s+url=(?:["\']).*?(?:["\'])\s*></seafile-ai-markdown-link>\s*'
)
MARKDOWN_READONLY_TIPS_RE = re.compile(
    r'\s*<markdown-readonly-tips>[\s\S]*?</markdown-readonly-tips>\s*'
)

AI_SCENARIO_IMAGE_CAPTION = 'image-caption'
AI_SCENARIO_SUMMARY = 'summary'
AI_SCENARIO_FILE_TAGS = 'file-tags'
AI_SCENARIO_OCR = 'ocr'
AI_SCENARIO_TRANSLATE = 'translate'
AI_SCENARIO_WRITING_ASSISTANT = 'writing-assistant'
AI_SCENARIO_CHAT = 'chat'
AI_SCENARIO_UNKNOWN = 'unknown'


# API
def gen_headers():
    payload = {'exp': int(time.time()) + 300, }
    token = jwt.encode(payload, SEAFILE_AI_SECRET_KEY, algorithm='HS256')
    return {"Authorization": "Token %s" % token}


def verify_ai_config():
    if not SEAFILE_AI_SERVER_URL or not SEAFILE_AI_SECRET_KEY:
        return False
    return True


def image_caption(params):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/image-caption/')
    resp = requests.post(url, json=params, headers=headers, timeout=30)
    return resp


def generate_summary(params):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/generate-summary')
    resp = requests.post(url, json=params, headers=headers, timeout=30)
    return resp


def generate_file_tags(params):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/generate-file-tags/')
    resp = requests.post(url, json=params, headers=headers, timeout=30)
    return resp


def ocr(params):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/ocr/')
    resp = requests.post(url, json=params, headers=headers, timeout=30)
    return resp


def translate(params):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/translate/')
    resp = requests.post(url, json=params, headers=headers, timeout=30)
    return resp


def writing_assistant(params):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/writing-assistant/')
    resp = requests.post(url, json=params, headers=headers, timeout=30)
    return resp


# utils
def get_ai_credit_by_user(user, org_id):
    if not org_id or org_id <= 0:
        return -1

    user_role = get_user_role(user)
    role = DEFAULT_USER if (user_role == '' or user_role == DEFAULT_USER) else user_role
    ai_credit_per_user = get_enabled_role_permissions_by_role(role)['monthly_ai_credit_per_user']
    if ai_credit_per_user < 0:
        return -1

    if ORG_MEMBER_QUOTA_ENABLED:
        org_members_quota = OrgMemberQuota.objects.get_quota(org_id)
        ai_credit = org_members_quota * ai_credit_per_user
    else:
        ccnet_db = CcnetDB()
        user_count = ccnet_db.get_org_user_count(org_id)
        ai_credit = user_count * ai_credit_per_user

    return ai_credit


def get_ai_cost_by_user(user, org_id):
    today = timezone.now().date()
    month_start = today.replace(day=1)
    if org_id and org_id > 0:
        cost = AIUsageStatistics.objects.filter(
            org_id=org_id,
            date__gte=month_start,
            date__lte=today,
        ).aggregate(total_cost=Coalesce(Sum('cost'), Value(0.0)))['total_cost']
    else:
        cost = AIUsageStatistics.objects.filter(
            username=user.username,
            date__gte=month_start,
            date__lte=today,
        ).aggregate(total_cost=Coalesce(Sum('cost'), Value(0.0)))['total_cost']
    return cost


def is_ai_usage_over_limit(user, org_id):
    if not org_id or org_id <= 0:
        return False

    ai_credit = get_ai_credit_by_user(user, org_id)
    cost = get_ai_cost_by_user(user, org_id)

    if ai_credit < 0:
        return False

    return ai_credit <= round(cost, 2)


def _get_repo_owner(repo_id, org_id=None):
    repo_owner = seafile_api.get_repo_owner(repo_id)
    if repo_owner:
        return repo_owner
    if org_id and org_id > 0:
        repo_owner = seafile_api.get_org_repo_owner(repo_id)
        if repo_owner:
            return repo_owner
    return None


def _get_group_id_by_repo_owner(repo_owner):
    if not isinstance(repo_owner, str) or '@seafile_group' not in repo_owner:
        return None
    try:
        return int(repo_owner.split('@', 1)[0])
    except Exception:
        return None


def resolve_repo_ai_usage_context(username, repo_id=None, org_id=None, scenario=AI_SCENARIO_UNKNOWN):
    usage_org_id = org_id
    repo_owner = None
    group_id = None

    if repo_id:
        repo_org_id = get_org_id_by_repo_id(repo_id)
        if isinstance(repo_org_id, int) and repo_org_id > 0:
            usage_org_id = repo_org_id
        elif not usage_org_id or usage_org_id <= 0:
            usage_org_id = None

        repo_owner = _get_repo_owner(repo_id, usage_org_id)
        group_id = _get_group_id_by_repo_owner(repo_owner)

    if not isinstance(usage_org_id, int) or usage_org_id <= 0:
        usage_org_id = None

    return {
        'username': username,
        'repo_id': repo_id,
        'repo_owner': repo_owner,
        'group_id': group_id,
        'org_id': usage_org_id,
        'scenario': scenario or AI_SCENARIO_UNKNOWN,
    }

def gen_chat_task_id(session_uuid):
    return f'chat_{session_uuid.replace("-", "")}'


def gen_message_id(session_uuid, max_try=5):
    trying = 0
    new_message_id = ''
    while not new_message_id and trying < max_try:
        try_message_id = uuid.uuid4().hex[:4]
        if ChatMessageThoughtProcess.objects.filter(session_uuid=session_uuid, message_id=try_message_id).count() == 0:
            new_message_id = try_message_id
        trying += 1
    if trying == max_try:
        raise RuntimeError('Failure to generate message_id')
    return new_message_id


def verify_chat_ai_config():
    return bool(SEAFILE_AI_SERVER_URL and SEAFILE_AI_SECRET_KEY and HAS_FILE_SEASEARCH)


def user_passes_ai_chat_folder_permissions(request, repo_id):
    if not is_pro_version():
            return True
    
    username = request.user.username
    # 1. check repo user admin
    if is_repo_admin(username, repo_id):
        return True
    # 2. check folder permissions of the repo of users
    user_folder_perms = seafile_api.list_folder_user_perm_by_repo(repo_id)
    for ufp in user_folder_perms:
        if ufp.user == username and ufp.permission == PERMISSION_INVISIBLE:
            return False
    # 3. check folder permissions of the repo of groups
    # 3.1 list folder perms of a groups
    group_folder_perms = seafile_api.list_folder_group_perm_by_repo(repo_id)
    # 3.2 list user groups
    if group_folder_perms:
        if is_org_context(request):
            org_id = request.user.org.org_id
            user_groups = ccnet_api.get_org_groups_by_user(org_id, username, return_ancestors=True)
        else:
            user_groups = ccnet_api.get_groups(username, return_ancestors=True)

        user_group_ids = [g.id for g in user_groups]
        # 3.3 check folder permissions
        for gfp in group_folder_perms:
            if gfp.group_id in user_group_ids and gfp.permission == PERMISSION_INVISIBLE:
                return False

    return True


def strip_content_details_from_attachments(attachments):
    new_attachments = deepcopy(attachments or [])
    for attachment in new_attachments:
        attachment.pop('content', None)
        attachment.pop('comments', None)
        attachment.pop('emails', None)
    return new_attachments


def upload_generated_markdown_file(repo_id, username, file_name, content):
    safe_file_name = os.path.basename((file_name or '').strip()) or 'answer.md'
    file_path = posixpath.join(GENERATED_MARKDOWN_DIR, safe_file_name)
    if seafile_api.get_dir_id_by_path(repo_id, GENERATED_MARKDOWN_DIR) is None:
        seafile_api.mkdir_with_parents(repo_id, '/', GENERATED_MARKDOWN_DIR.strip('/'), username)

    fd, tmp_file = mkstemp()
    try:
        os.write(fd, (content or '').encode('utf-8'))
    finally:
        os.close(fd)

    try:
        obj_id = json.dumps({'parent_dir': GENERATED_MARKDOWN_DIR})
        token = seafile_api.get_fileserver_access_token(
            repo_id, obj_id, 'upload-link', username, use_onetime=False)
        if not token:
            raise Exception('upload token invalid')

        upload_link = gen_inner_file_upload_url('upload-api', token) + '?replace=1'
        with open(tmp_file, 'rb') as file_obj:
            files = {'file': (safe_file_name, file_obj)}
            data = {'parent_dir': GENERATED_MARKDOWN_DIR, 'relative_path': '', 'replace': 1}
            resp = requests.post(upload_link, files=files, data=data)
        if not resp.ok:
            raise Exception(resp.text)
    finally:
        if os.path.exists(tmp_file):
            os.remove(tmp_file)

    file_uuid = FileUUIDMap.objects.get_or_create_fileuuidmap_by_path(repo_id, file_path, False)
    service_url = get_service_url().rstrip('/')
    preview_url = f'{service_url}/smart-link/{file_uuid.uuid}/{safe_file_name}'
    return safe_file_name, preview_url


def rewrite_ai_reply_with_uploaded_markdown_links(ai_reply, repo_id, username, can_upload=True):
    if not isinstance(ai_reply, str) or '<seafile-ai-markdown' not in ai_reply or not repo_id or not username:
        return ai_reply

    # Remove any previously generated hidden preview links from the reply body,
    # then regenerate exactly one link for each current markdown artifact.
    ai_reply = MARKDOWN_LINK_TAG_RE.sub('\n', ai_reply)
    ai_reply = MARKDOWN_READONLY_TIPS_RE.sub('\n', ai_reply)

    failed_files = []
    readonly_files = []

    def replace_markdown_file(match):
        file_name = match.group(2) or 'answer.md'
        content = match.group(3) or ''
        if not can_upload:
            safe_file_name = os.path.basename((file_name or '').strip()) or 'answer.md'
            readonly_files.append(safe_file_name)
            return match.group(0)

        try:
            safe_file_name, preview_url = upload_generated_markdown_file(repo_id, username, file_name, content)
        except Exception as error:
            safe_file_name = os.path.basename((file_name or '').strip()) or 'answer.md'
            failed_files.append(safe_file_name)
            logger.warning('Failed to upload generated markdown file %s: %s', safe_file_name, error)
            return match.group(0)

        preview_tag = f'<seafile-ai-markdown-link url="{preview_url}"></seafile-ai-markdown-link>'
        return f'{preview_tag}\n\n{match.group(0)}'

    next_ai_reply = MARKDOWN_FILE_RE.sub(replace_markdown_file, ai_reply)
    if readonly_files:
        readonly_message = _('Due to your read-only permission for this library, the document cannot be uploaded to this library.')
        next_ai_reply = f'\n\n{next_ai_reply}\n\n<markdown-readonly-tips>{readonly_message}</markdown-readonly-tips>'
    if failed_files:
        failed_files_text = ', '.join(failed_files)
        failure_message = (
            f'Failed to upload the generated Markdown document(s) to {GENERATED_MARKDOWN_DIR}: '
            f'{failed_files_text}.'
        )
        next_ai_reply = f'{next_ai_reply}\n\n{failure_message}'
    return next_ai_reply


def process_generated_markdown_result(ai_result, repo_id, username, can_upload=True):
    if not isinstance(ai_result, dict):
        return ai_result

    ai_reply = ai_result.get('ai_reply')
    if ai_reply is None:
        ai_reply = ai_result.get('answer')

    next_ai_reply = rewrite_ai_reply_with_uploaded_markdown_links(ai_reply, repo_id, username, can_upload=can_upload)
    if next_ai_reply == ai_reply:
        return ai_result

    ai_result['ai_reply'] = next_ai_reply
    if 'answer' in ai_result:
        ai_result['answer'] = next_ai_reply
    return ai_result


def record_message_to_db(ai_result, session_uuid, message_id, query, attachments):
    if not isinstance(ai_result, dict):
        ai_result = {
            'ai_reply': str(ai_result),
            'sources': [],
            'thought_process': {},
        }

    if 'ai_reply' not in ai_result:
        ai_result['ai_reply'] = ai_result.get('answer', '')

    ai_result.pop('answer', None)
    ai_result.update({
        'session_uuid': session_uuid,
        'attachments': strip_content_details_from_attachments(attachments),
    })

    try:
        thought_process = ai_result.get('thought_process', {})
        if thought_process:
            ChatMessageThoughtProcess.objects.create_thought_process(
                session_uuid,
                message_id,
                thought_process,
            )
        user_message = ChatMessages.objects.create_message(
            session_uuid,
            message_id,
            'user',
            query,
            attachments=ai_result['attachments'],
        )
        ai_reply_message = ChatMessages.objects.create_message(
            session_uuid,
            message_id,
            'assistant',
            ai_result['ai_reply'],
            sources=json.dumps(ai_result.get('sources', [])),
        )
        ChatSessions.objects.filter(session_uuid=session_uuid).update(updated_at=timezone.now())
        ai_result.update({
            'user_message_id': user_message.id,
            'ai_reply_message_id': ai_reply_message.id,
        })
    except Exception as error:
        logger.warning('Failure to record chat messages: %s', error)

    return ai_result


def process_stream_ai_reply(chat_task_id, ai_response, session_uuid, message_id, query, attachments, repo_id, username, can_upload=True):
    has_recorded_result = False
    has_generator_exit = False
    error_msg = None
    try:
        for line in ai_response.iter_lines():
            if not line:
                continue
            line_str = line.decode('utf-8')
            if not line_str.startswith('data:'):
                line_str = f'data: {line_str}'
            content = line_str[len('data: '):]
            if content.startswith('{"results": ') and content.endswith('}'):
                results = json.loads(content)['results']
                results = process_generated_markdown_result(results, repo_id, username, can_upload=can_upload)
                item = 'data: %s\n\n' % json.dumps({
                    'results': record_message_to_db(results, session_uuid, message_id, query, attachments),
                })
                has_recorded_result = True
            elif content.startswith('[ERROR: ') and content.endswith(']'):
                error_msg = content[1:-1]
                item = 'data: %s\n\n' % json.dumps({
                    'results': record_message_to_db(error_msg, session_uuid, message_id, query, attachments),
                })
                has_recorded_result = True
            else:
                item = line_str if line_str.endswith('\n\n') else f'{line_str}\n\n'
            if not has_generator_exit:
                try:
                    yield item
                except GeneratorExit:
                    has_generator_exit = True
                    continue
            if error_msg:
                raise ConnectionError(error_msg)
    except Exception as error:
        logger.exception('Streaming response interrupted: %s', error)
        if not has_recorded_result:
            item = 'data: %s\n\n' % json.dumps({
                'results': record_message_to_db({
                    'ai_reply': 'There is an issue with the AI server or web server (LLM or internal server error), please try again later',
                    'sources': [],
                    'thought_process': {},
                }, session_uuid, message_id, query, attachments),
            })
            if not has_generator_exit:
                try:
                    yield item
                except GeneratorExit:
                    has_generator_exit = True
        if not has_generator_exit:
            try:
                yield 'data: [DONE]\n\n'
            except GeneratorExit:
                has_generator_exit = True
    cache.delete(chat_task_id)


def get_ai_reply(params):
    payload = {'exp': int(time.time()) + AI_REPLY_TIMEOUT}
    token = jwt.encode(payload, SEAFILE_AI_SECRET_KEY, algorithm='HS256')
    headers = {'Authorization': 'Token %s' % token}
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/get-ai-reply')

    response = requests.post(
        url,
        json=params,
        headers=headers,
        stream=True,
        timeout=AI_REPLY_TIMEOUT,
    )
    if response.status_code == 500:
        raise RuntimeError('ask ai error status: %s body: %s' % (response.status_code, response.text))
    return response
