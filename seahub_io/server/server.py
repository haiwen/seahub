import logging
from threading import Thread

from waitress import serve

from seahub_io.app.mq_handler import EventsHandler, init_message_handlers
from seahub_io.tasks import CountUserActivity, CountTrafficInfo
from seahub_io.server.request_handler import app as application
from seahub_io.server.task_manager import task_manager
from seahub_io.server.export_task_manager import event_export_task_manager
from seahub_io.server.import_task_manager import event_import_task_manager
from seahub_io.server.repo_archive_task_manager import repo_archive_task_manager
from seahub_io.seasearch.index_task.index_task_manager import index_task_manager
from seahub_io.face_recognition.face_recognition_manager import FaceRecognitionManager


logger = logging.getLogger(__name__)


class SeafEventServer(Thread):

    def __init__(self, config, app=None):
        Thread.__init__(self)
        self.app = app
        self._parse_config(config)

        init_message_handlers(config)
        self._events_handler = EventsHandler(config)
        self._count_traffic_task = CountTrafficInfo(config)
        self._count_user_activity_task = CountUserActivity(config)

        task_manager.init(self.app, self._workers, self._task_expire_time)
        event_export_task_manager.init(self.app, self._workers, self._task_expire_time)
        event_import_task_manager.init(self.app, self._workers, self._task_expire_time)
        repo_archive_task_manager.init(self.app, self._workers, self._task_expire_time)

        task_manager.run()
        event_export_task_manager.run()
        event_import_task_manager.run()
        repo_archive_task_manager.run()

        application.face_recognition_manager = FaceRecognitionManager()
        index_task_manager.init(config)

    def _parse_config(self, config):
        if config.has_option('SEAF-EVENT-SERVER', 'host'):
            self._host = config.get('SEAF-EVENT-SERVER', 'host')
        else:
            self._host = '127.0.0.1'

        if config.has_option('SEAF-EVENT-SERVER', 'port'):
            self._port = config.getint('SEAF-EVENT-SERVER', 'port')
        else:
            self._port = 8890

        if config.has_option('SEAF-EVENT-SERVER', 'workers'):
            self._workers = config.getint('SEAF-EVENT-SERVER', 'workers')
        else:
            self._workers = 3

        if config.has_option('SEAF-EVENT-SERVER', 'task_expire_time'):
            self._task_expire_time = config.getint('SEAF-EVENT-SERVER', 'task_expire_time')
        else:
            self._task_expire_time = 30 * 60

    def run(self):
        self._events_handler.start()
        self._count_user_activity_task.start()
        self._count_traffic_task.start()

        logger.info('Start seahub_io server at %s:%s', self._host, self._port)
        serve(application, host=self._host, port=self._port)
