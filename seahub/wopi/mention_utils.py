import json
import logging

from django.core.cache import cache

from seahub.notifications.models import UserNotification
from seahub.utils import normalize_cache_key

logger = logging.getLogger(__name__)

WOPI_MENTION_CACHE_TIMEOUT = 12 * 60 * 60


def generate_wopi_mentions_cache_key(repo_id, file_path, request_user):
    return normalize_cache_key(f'{repo_id}_{file_path}_{request_user}', prefix='wopi_mentions_')


def get_wopi_mentioned_users(repo_id, file_path, request_user):
    cache_key = generate_wopi_mentions_cache_key(repo_id, file_path, request_user)
    cached_value = cache.get(cache_key, [])
    return cached_value if cached_value else []


def add_wopi_mentioned_user(repo_id, file_path, request_user, mentioned_user):
    cache_key = generate_wopi_mentions_cache_key(repo_id, file_path, request_user)
    mentioned_users = set(get_wopi_mentioned_users(repo_id, file_path, request_user))
    mentioned_users.add(mentioned_user)
    cache.set(cache_key, list(mentioned_users), WOPI_MENTION_CACHE_TIMEOUT)


def clear_wopi_mentioned_users(repo_id, file_path, request_user):
    cache_key = generate_wopi_mentions_cache_key(repo_id, file_path, request_user)
    cache.delete(cache_key)


def mention_msg_to_json(repo_id, file_path, from_user, file_name):
    return json.dumps({
        'repo_id': repo_id,
        'file_path': file_path,
        'from_user': from_user,
        'file_name': file_name,
    })


def send_wopi_mention_notifications(repo_id, file_path, file_name, request_user):
    mentioned_users = get_wopi_mentioned_users(repo_id, file_path, request_user)
    if not mentioned_users:
        return

    detail = mention_msg_to_json(repo_id, file_path, request_user, file_name)
    for mentioned_user in mentioned_users:
        if mentioned_user == request_user:
            continue
        try:
            UserNotification.objects.add_file_mention_msg(mentioned_user, detail)
        except Exception as e:
            logger.error(e)

    clear_wopi_mentioned_users(repo_id, file_path, request_user)
