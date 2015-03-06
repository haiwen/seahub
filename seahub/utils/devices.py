import logging
import datetime

from seaserv import seafile_api
from seahub.api2.models import TokenV2, DESKTOP_PLATFORMS

logger = logging.getLogger(__name__)

__all__ = [
    'get_user_devices',
    'do_unlink_device',
]

def _last_sync_time(repos):
    latest_sync_time = max([r['sync_time'] for r in repos])
    return datetime.datetime.fromtimestamp(latest_sync_time)

def get_user_devices(username):
    devices = TokenV2.objects.get_user_devices(username)

    peer_repos_map = get_user_synced_repo_infos(username)

    for device in devices:
        if device['platform'] in DESKTOP_PLATFORMS:
            peer_id = device['device_id']
            repos = peer_repos_map.get(peer_id, [])
            device['synced_repos'] = repos
            if repos:
                device['last_accessed'] = max(device['last_accessed'],
                                              _last_sync_time(repos))

    return devices

def get_user_synced_repo_infos(username):
    '''Return a (client_ccnet_peer_id, synced_repos_on_that_client) dict'''
    tokens = []
    try:
        tokens = seafile_api.list_repo_tokens_by_email(username)
    except:
        return {}

    def sort_by_sync_time_descending(a, b):
        if isinstance(a, dict):
            return cmp(b['sync_time'], a['sync_time'])
        else:
            return cmp(b.sync_time, a.sync_time)

    tokens.sort(sort_by_sync_time_descending, reverse=True)

    peer_repos_map = {}
    for token in tokens:
        peer_id = token.peer_id
        repo_id = token.repo_id

        if peer_id not in peer_repos_map:
            peer_repos_map[peer_id] = {}

        peer_repos_map[peer_id][repo_id] = {
            'repo_id': token.repo_id,
            'repo_name': token.repo_name,
            'sync_time': token.sync_time
        }

    ret = {}
    for peer_id, repos in peer_repos_map.iteritems():
        ret[peer_id] = sorted(repos.values(), sort_by_sync_time_descending)

    return ret

def do_unlink_device(username, platform, device_id):
    if platform in DESKTOP_PLATFORMS:
        # For desktop client, we also remove the sync tokens
        msg = 'failed to delete_repo_tokens_by_peer_id'
        try:
            if seafile_api.delete_repo_tokens_by_peer_id(username, device_id) < 0:
                logger.warning(msg)
                raise Exception(msg)
        except:
            logger.exception(msg)
            raise

    TokenV2.objects.delete_device_token(username, platform, device_id)
