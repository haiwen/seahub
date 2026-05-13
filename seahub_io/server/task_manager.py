import logging
import queue
import json
from datetime import datetime
from threading import Thread, Lock

from seahub_io.db import init_db_session_class
from seahub_io.app.event_redis import RedisClient
from seahub_io.repo_metadata.constants import ZERO_OBJ_ID


logger = logging.getLogger(__name__)


class IndexTask:

    def __init__(self, task_id, readable_id, func, args):
        self.id = task_id
        self.readable_id = readable_id
        self.func = func
        self.args = args

        self.status = 'init'

        self.started_at = None
        self.finished_at = None

        self.result = None
        self.error = None

    @staticmethod
    def get_readable_id(readable_id):
        return readable_id

    def run(self):
        self.status = 'running'
        self.started_at = datetime.now()
        return self.func(*self.args)

    def set_result(self, result):
        self.result = result
        self.status = 'success'
        self.finished_at = datetime.now()

    def set_error(self, error):
        self.error = error
        self.status = 'error'
        self.finished_at = datetime.now()

    def is_finished(self):
        return self.status in ['error', 'success']

    def get_cost_time(self):
        if self.started_at and self.finished_at:
            return (self.finished_at - self.started_at).seconds
        return None

    def get_info(self):
        return f'{self.id}--{self.readable_id}--{self.func}'

    def __str__(self):
        return f'<IndexTask {self.id} {self.readable_id} {self.func.__name__} {self.status}>'


class TaskManager:

    def __init__(self):
        self.tasks_queue = queue.Queue()
        self.tasks_map = {}             # {task_id: task} all tasks
        self.readable_id2task_map = {}  # {task_readable_id: task} in queue or running
        self.check_task_lock = Lock()   # lock access to readable_id2task_map
        self.app = None
        self.conf = {
            'workers': 3,
            'expire_time': 30 * 60
        }
        self._redis_connection = None
        self._db_session_class = None

    def init(self, app, workers, task_expire_time):
        self.app = app
        self.conf['expire_time'] = task_expire_time
        self.conf['workers'] = workers

        self._db_session_class = init_db_session_class()
        self._redis_connection = RedisClient().connection

    def get_pending_or_running_task(self, readable_id):
        task = self.readable_id2task_map.get(readable_id)
        return task

    def add_init_metadata_task(self, username, repo_id):
        msg_content = {
            'msg_type': 'init-metadata',
            'repo_id': repo_id,
            'commit_id': ZERO_OBJ_ID,
        }
        if self._redis_connection.publish('metadata_update', json.dumps(msg_content)) > 0:
            logging.debug('Publish event: %s' % msg_content)
        else:
            logging.info('No one subscribed to metadata_update channel, event (%s) has not been send' % msg_content)

    def add_init_face_recognition_task(self, username, repo_id):
        msg_content = {
            'msg_type': 'update_face_recognition',
            'repo_id': repo_id,
            'username': username
        }
        if self._redis_connection.publish('metadata_update', json.dumps(msg_content)) > 0:
            logging.debug('Publish event: %s' % msg_content)
        else:
            logging.info('No one subscribed to metadata_update channel, event (%s) has not been send' % msg_content)

    def query_task(self, task_id):
        return self.tasks_map.get(task_id)

    def handle_task(self):
        while True:
            try:
                task = self.tasks_queue.get(timeout=2)
            except queue.Empty:
                continue
            except Exception as e:
                logger.error(e)
                continue

            try:
                task_info = task.get_info()
                logger.info('Run task: %s' % task_info)

                # run
                task.run()
                task.set_result('success')

                logger.info('Run task success: %s cost %ds \n' % (task_info, task.get_cost_time()))
            except Exception as e:
                task.set_error(e)
                logger.exception('Failed to handle task %s, error: %s \n' % (task.get_info(), e))
            finally:
                with self.check_task_lock:
                    self.readable_id2task_map.pop(task.readable_id, None)

    def run(self):
        thread_num = self.conf['workers']
        for i in range(thread_num):
            t_name = 'TaskManager Thread-' + str(i)
            t = Thread(target=self.handle_task, name=t_name)
            t.setDaemon(True)
            t.start()


task_manager = TaskManager()
