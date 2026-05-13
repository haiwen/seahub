import time
import logging
import json
from threading import Thread

from seaserv import seafile_api

import seahub_io.events.handlers as events_handlers
import seahub_io.events_publisher.handlers as publisher_handlers
import seahub_io.statistics.handlers as stats_handlers
from seahub_io.db import init_db_session_class
from seahub_io.app.event_redis import RedisClient
import seahub_io.repo_metadata.handlers as metadata_handler

logger = logging.getLogger(__name__)

__all__ = [
    'EventsHandler',
    'init_message_handlers'
]


class MessageHandler(object):
    def __init__(self):
        # A (channel, List<handler>) map. For a given channel, there may be
        # multiple handlers
        self._handlers = {}

    def add_handler(self, msg_type, func):
        if msg_type in self._handlers:
            funcs = self._handlers[msg_type]
        else:
            funcs = []
            self._handlers[msg_type] = funcs

        if func not in funcs:
            funcs.append(func)

    def handle_message(self, config, session, redis_connection, channel, msg):
        try:
            content = json.loads(msg.get('content'))
        except:
            logger.warning("invalid message format: %s", msg)
            return

        if not content.get('msg_type'):
            return

        msg_type = channel + ':' + content.get('msg_type')
        if msg_type not in self._handlers:
            return

        funcs = self._handlers.get(msg_type)
        for func in funcs:
            try:
                if func.__name__ == 'RepoUpdatePublishHandler' or func.__name__ == 'RepoMetadataUpdateHandler':
                    func(config, redis_connection, msg)
                else:
                    func(config, session, msg)
            except Exception as e:
                logger.exception("error when handle msg: %s", e)

    def get_channels(self):
        channels = set()
        for msg_type in self._handlers:
            pos = msg_type.find(':')
            channels.add(msg_type[:pos])

        return channels


message_handler = MessageHandler()


def init_message_handlers(config):
    if config.has_option('Audit', 'enabled'):
        try:
            enable_audit = config.getboolean('Audit', 'enabled')
        except ValueError:
            enable_audit = False
    elif config.has_option('AUDIT', 'enabled'):
        try:
            enable_audit = config.getboolean('AUDIT', 'enabled')
        except ValueError:
            enable_audit = False
    else:
        enable_audit = False

    events_handlers.register_handlers(message_handler, enable_audit)
    stats_handlers.register_handlers(message_handler)
    publisher_handlers.register_handlers(message_handler)
    metadata_handler.register_handlers(message_handler)


class EventsHandler(object):

    def __init__(self, config):
        self._config = config
        self._db_session_class = init_db_session_class()
        self._redis_connection = RedisClient().connection

    def handle_event(self, channel):
        config = self._config
        session = self._db_session_class()
        redis_connection = self._redis_connection
        while 1:
            try:
                msg = seafile_api.pop_event(channel)
            except Exception as e:
                logger.error('Failed to get event: %s' % e)
                time.sleep(3)
                continue
            if msg:
                try:
                    message_handler.handle_message(config, session, redis_connection, channel, msg)
                except Exception as e:
                    logger.error(e)
                finally:
                    session.close()
                    if redis_connection:
                        redis_connection.close()
            else:
                time.sleep(0.5)

    def start(self):
        channels = message_handler.get_channels()
        logger.info('Subscribe to channels: %s', channels)
        for channel in channels:
            event_handler = Thread(target=self.handle_event, args=(channel, ))
            event_handler.start()
