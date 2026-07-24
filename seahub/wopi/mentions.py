import json
import logging
import hashlib
import time

from django.core.cache import cache

from seahub.utils.ccnet_db import CcnetDB
from seahub.notifications.models import UserNotification
from seahub.utils.repo import get_related_users_by_repo

logger = logging.getLogger(__name__)

WOPI_MENTION_CACHE_EXPIRATION = 12 * 60 * 60
WOPI_MENTION_LOCK_TIMEOUT = 10
WOPI_MENTION_INITIAL_STATE = {
    'mentioned_users': [],
    'updated_at': 0,
}


def wopi_mention_msg_to_json(repo_id, file_path, from_user, mentioned_user):
    return json.dumps({
        'repo_id': repo_id,
        'file_path': file_path,
        'from_user': from_user,
        'mentioned_user': mentioned_user,
    })


def generate_wopi_mentions_cache_key(access_token):
    return 'wopi_mentions_' + hashlib.sha256(access_token.encode('utf8')).hexdigest()


def generate_wopi_mentions_lock_key(access_token):
    return generate_wopi_mentions_cache_key(access_token) + '_lock'


def acquire_wopi_mentions_lock(access_token):
    lock_key = generate_wopi_mentions_lock_key(access_token)
    for _ in range(20):
        if cache.add(lock_key, 1, WOPI_MENTION_LOCK_TIMEOUT):
            return lock_key
        time.sleep(0.05)
    return None


def release_wopi_mentions_lock(lock_key):
    if lock_key:
        cache.delete(lock_key)


def get_cached_wopi_mentions_state(access_token):
    cache_key = generate_wopi_mentions_cache_key(access_token)
    value = cache.get(cache_key, None)
    if not isinstance(value, dict):
        return dict(WOPI_MENTION_INITIAL_STATE)

    state = dict(WOPI_MENTION_INITIAL_STATE)
    state.update(value)
    if not isinstance(state.get('mentioned_users'), list):
        state['mentioned_users'] = []
    return state


def cache_wopi_mentions(access_token, request_user, repo_id, file_path, mentioned_users, org_id=None):
    cache_key = generate_wopi_mentions_cache_key(access_token)
    lock_key = acquire_wopi_mentions_lock(access_token)
    if not lock_key:
        raise RuntimeError('Failed to acquire WOPI mention cache lock.')

    try:
        valid_users = set(get_active_related_users_by_repo(repo_id, org_id))
        state = get_cached_wopi_mentions_state(access_token)

        cached_users = set(state['mentioned_users'])
        cached_users.update(
            username for username in mentioned_users
            if username and username != request_user and username in valid_users
        )

        state.update({
            'mentioned_users': sorted(cached_users),
            'updated_at': int(time.time()),
        })
        cache.set(cache_key, state, WOPI_MENTION_CACHE_EXPIRATION)
        return state
    finally:
        release_wopi_mentions_lock(lock_key)


def flush_cached_wopi_mentions(access_token, request_user, repo_id, file_path, org_id=None):
    cache_key = generate_wopi_mentions_cache_key(access_token)
    lock_key = acquire_wopi_mentions_lock(access_token)
    if not lock_key:
        raise RuntimeError('Failed to acquire WOPI mention cache lock.')

    try:
        state = get_cached_wopi_mentions_state(access_token)
        mentioned_users = state['mentioned_users']
        failed_users = flush_wopi_mention_notifications(
            repo_id, file_path, request_user, mentioned_users, org_id=org_id
        )

        state.update({
            'mentioned_users': sorted(failed_users),
            'updated_at': int(time.time()),
        })
        cache.set(cache_key, state, WOPI_MENTION_CACHE_EXPIRATION)
        return failed_users
    finally:
        release_wopi_mentions_lock(lock_key)


def get_active_related_users_by_repo(repo_id, org_id=None):
    related_users = get_related_users_by_repo(repo_id, org_id)
    return CcnetDB().get_active_users_by_user_list(related_users)


def add_wopi_mention_notification(repo_id, file_path, from_user, to_user):
    detail = wopi_mention_msg_to_json(repo_id, file_path, from_user, to_user)
    return UserNotification.objects.add_wopi_mention_msg(to_user, detail)


def flush_wopi_mention_notifications(repo_id, file_path, from_user, mentioned_users, org_id=None):
    mentioned_users = {username for username in mentioned_users if username and username != from_user}
    if not mentioned_users:
        return set()

    related_users = set(get_active_related_users_by_repo(repo_id, org_id))
    failed_users = set()
    for to_user in mentioned_users:
        if to_user not in related_users:
            continue

        try:
            add_wopi_mention_notification(repo_id, file_path, from_user, to_user)
        except Exception as e:
            logger.error('Failed to create WOPI mention notification for %s in %s%s: %s',
                         to_user, repo_id, file_path, e)
            failed_users.add(to_user)

    return failed_users
