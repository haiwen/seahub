# Copyright (c) 2012-2016 Seafile Ltd.
import logging
import datetime

from seaserv import seafile_api
from seahub.api2.models import TokenV2, DESKTOP_PLATFORMS

logger = logging.getLogger(__name__)

__all__ = [
    'do_unlink_device',
]

def _last_sync_time(repos):
    latest_sync_time = max([r['sync_time'] for r in repos])
    return datetime.datetime.fromtimestamp(latest_sync_time)

def do_unlink_device(username, platform, device_id, remote_wipe=False):
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

    if remote_wipe:
        try:
            TokenV2.objects.mark_device_to_be_remote_wiped(username, platform, device_id)
        except Exception as e:
            logger.error(e)
            TokenV2.objects.delete_device_token(username, platform, device_id)
    else:
        TokenV2.objects.delete_device_token(username, platform, device_id)
