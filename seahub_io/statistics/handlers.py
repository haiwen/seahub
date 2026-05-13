# coding: utf-8
import logging
import json
import logging.handlers

from datetime import datetime
from .counter import update_hash_record, save_traffic_info


def UserLoginEventHandler(config, session, msg):
    enabled = False
    if config.has_option('STATISTICS', 'enabled'):
        enabled = config.getboolean('STATISTICS', 'enabled')
    if not enabled:
        logging.info('statistics is disabled')
        return

    try:
        elements = json.loads(msg['content'])
    except:
        logging.warning("got bad message: %s", msg)
        return

    username = elements.get('user_name')
    timestamp = elements.get('timestamp')
    org_id = elements.get('org_id')
    _timestamp = datetime.strptime(timestamp, '%Y-%m-%d %H:%M:%S')

    update_hash_record(session, username, _timestamp, org_id)


def FileStatsEventHandler(config, session, msg):
    enabled = False
    if config.has_option('STATISTICS', 'enabled'):
        enabled = config.getboolean('STATISTICS', 'enabled')
    if not enabled:
        logging.info('statistics is disabled')
        return

    try:
        elements = json.loads(msg['content'])
    except:
        logging.warning("got bad message: %s", msg)
        return

    timestamp = datetime.utcfromtimestamp(msg['ctime'])
    oper = elements.get('msg_type')
    user_name = elements.get('user_name')
    repo_id = elements.get('repo_id')
    size = int(elements.get('bytes'))

    save_traffic_info(session, timestamp, user_name, repo_id, oper, size)


def register_handlers(handlers):
    handlers.add_handler('seahub.stats:user-login', UserLoginEventHandler)
    handlers.add_handler('seaf_server.stats:web-file-upload', FileStatsEventHandler)
    handlers.add_handler('seaf_server.stats:web-file-download', FileStatsEventHandler)
    handlers.add_handler('seaf_server.stats:link-file-upload', FileStatsEventHandler)
    handlers.add_handler('seaf_server.stats:link-file-download', FileStatsEventHandler)
    handlers.add_handler('seaf_server.stats:sync-file-upload', FileStatsEventHandler)
    handlers.add_handler('seaf_server.stats:sync-file-download', FileStatsEventHandler)
