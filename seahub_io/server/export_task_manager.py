import queue
import threading
import logging
import time
import uuid
import json

from seahub_io.events.metrics import METRIC_CHANNEL_NAME, NODE_NAME
from seahub_io.db import init_db_session_class
from seahub_io.server.utils import export_event_log_to_excel, export_org_event_log_to_excel, convert_wiki
from seahub_io.app.event_redis import redis_cache

logger = logging.getLogger('seahub_io')


class EventExportTaskManager(object):

    def __init__(self):
        self.app = None
        self._db_session_class = None
        self.tasks_map = {}
        self.task_results_map = {}
        self.tasks_queue = queue.Queue(10)
        self.current_task_info = {}
        self.threads = []
        self.conf = {
            'workers': 3,
            'expire_time': 30 * 60
        }

    def init(self, app, workers, task_expire_time):
        self.app = app
        self.conf['expire_time'] = task_expire_time
        self.conf['workers'] = workers
        self._db_session_class = init_db_session_class()

    def is_valid_task_id(self, task_id):
        return task_id in (self.tasks_map.keys() | self.task_results_map.keys())
    
    def publish_io_qsize_metric(self, qsize):
        publish_metric = {
            "metric_name": "io_task_queue_size",
            "metric_type": "gauge",
            "metric_help": "The size of the io task queue",
            "component_name": "seahub_io",
            "node_name": NODE_NAME,
            "metric_value": qsize,
            "details": {}
        }
        redis_cache.publish(METRIC_CHANNEL_NAME, json.dumps(publish_metric))


    def add_export_logs_task(self, start_time, end_time, log_type):
        task_id = str(uuid.uuid4())
        task = (export_event_log_to_excel, (self._db_session_class, start_time, end_time, log_type, task_id))

        self.tasks_queue.put(task_id)
        self.tasks_map[task_id] = task
        self.publish_io_qsize_metric(self.tasks_queue.qsize())
        return task_id

    def add_org_export_logs_task(self, start_time, end_time, log_type, org_id):
        task_id = str(uuid.uuid4())
        task = (export_org_event_log_to_excel, (self._db_session_class, start_time, end_time, log_type, task_id, org_id))

        self.tasks_queue.put(task_id)
        self.tasks_map[task_id] = task
        self.publish_io_qsize_metric(self.tasks_queue.qsize())
        return task_id

    def add_convert_wiki_task(self, old_repo_id, new_repo_id, username):

        task_id = str(uuid.uuid4())
        task = (convert_wiki, (old_repo_id, new_repo_id, username, self._db_session_class))

        self.tasks_queue.put(task_id)
        self.tasks_map[task_id] = task
        self.publish_io_qsize_metric(self.tasks_queue.qsize())
        return task_id

    def query_status(self, task_id):
        task_result = self.task_results_map.pop(task_id, None)
        if task_result == 'success':
            return True, None
        if isinstance(task_result, str) and task_result.startswith('error_'):
            return True, task_result[6:]
        return False, None

    def threads_is_alive(self):
        info = {}
        for t in self.threads:
            info[t.name] = t.is_alive()
        return info

    def handle_task(self):
        while True:
            
            try:
                task_id = self.tasks_queue.get(timeout=2)
            except queue.Empty:
                continue
            except Exception as e:
                logger.error(e)
                continue
            task = self.tasks_map.get(task_id)
            if type(task) != tuple or len(task) < 1:
                continue
            if type(task[0]).__name__ != 'function':
                continue
            task_info = task_id + ' ' + str(task[0])
            try:
                self.current_task_info[task_id] = task_info
                logging.info('Run task: %s' % task_info)
                start_time = time.time()

                # run
                task[0](*task[1])
                self.task_results_map[task_id] = 'success'
                self.publish_io_qsize_metric(self.tasks_queue.qsize())
                finish_time = time.time()
                logging.info('Run task success: %s cost %ds \n' % (task_info, int(finish_time - start_time)))
                self.current_task_info.pop(task_id, None)
            except Exception as e:
                logger.exception('Failed to handle task %s, error: %s \n' % (task_info, e))
                if len(e.args) > 0:
                    self.task_results_map[task_id] = 'error_' + str(e.args[0])
                else:
                    self.task_results_map[task_id] = 'error_' + str(e)
                self.current_task_info.pop(task_id, None)
            finally:
                self.tasks_map.pop(task_id, None)

    def run(self):
        thread_num = self.conf['workers']
        for i in range(thread_num):
            t_name = 'TaskManager Thread-' + str(i)
            t = threading.Thread(target=self.handle_task, name=t_name)
            self.threads.append(t)
            t.setDaemon(True)
            t.start()


event_export_task_manager = EventExportTaskManager()
