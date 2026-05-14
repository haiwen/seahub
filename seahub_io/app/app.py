from seahub_io.app.mq_handler import EventsHandler, init_message_handlers
from seahub_io.tasks import CountUserActivity, CountTrafficInfo
from seahub_io.server import SeafEventServer


class App(object):
    def __init__(self, config):
        init_message_handlers(config)
        self._events_handler = EventsHandler(config)
        self._count_traffic_task = CountTrafficInfo(config)
        self._count_user_activity_task = CountUserActivity(config)
        self._seafevent_server = SeafEventServer(self, config)

    def serve_forever(self):
        self._events_handler.start()
        self._count_user_activity_task.start()
        self._count_traffic_task.start()
        self._seafevent_server.start()
