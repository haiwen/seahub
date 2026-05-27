import queue
import threading
import logging
import time
import uuid
import datetime
import json

from seahub_io.db import init_db_session_class
from seahub_io.wiki.confluence2wiki import import_confluence_to_wiki_main
from seahub_io.wiki.wiki2 import import_wiki_page

logger = logging.getLogger('seahub_io')


class EventImportTaskManager(object):

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
    
    def add_import_confluence_to_wiki(self, repo_id, space_key, file_path, username, seafile_server_url):
        task_id = str(uuid.uuid4())
        session = self._db_session_class()
        task = (import_confluence_to_wiki_main, (session, repo_id, space_key, file_path, username, seafile_server_url))
        self.tasks_queue.put(task_id)
        self.tasks_map[task_id] = task
        return task_id
    
    def add_import_wiki_page(self, repo_id, local_file_path, username, page_id, page_name, sdoc_uuid_str, from_page_id):
        task_id = str(uuid.uuid4())
        session = self._db_session_class()
        task = (import_wiki_page, (session, repo_id, local_file_path, username, page_id, page_name, sdoc_uuid_str, from_page_id))
        self.tasks_queue.put(task_id)
        self.tasks_map[task_id] = task
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
            t_name = 'Import-TaskManager Thread-' + str(i)
            t = threading.Thread(target=self.handle_task, name=t_name)
            self.threads.append(t)
            t.setDaemon(True)
            t.start()


event_import_task_manager = EventImportTaskManager()
