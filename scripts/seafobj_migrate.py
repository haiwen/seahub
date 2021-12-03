#!/usr/bin/env python
#coding: utf-8

import os
import sys
import logging
from threading import Thread
import queue
import rados

from seafobj.objstore_factory import SeafObjStoreFactory

logging.basicConfig(format='%(asctime)s %(message)s', level=logging.INFO)

class Worker(Thread):
    def __init__(self, do_work, task_queue):
        Thread.__init__(self)
        self.do_work = do_work
        self.task_queue = task_queue

    def run(self):
        while True:
            try:
                task = self.task_queue.get()
                if task is None:
                    break
                self.do_work(task)
            except Exception as e:
                logging.warning('Failed to execute task: %s' % e)
            finally:
                self.task_queue.task_done()

class ThreadPool(object):
    def __init__(self, do_work, nworker=20):
        self.do_work = do_work
        self.nworker = nworker
        self.task_queue = queue.Queue()

    def start(self):
        for i in range(self.nworker):
            Worker(self.do_work, self.task_queue).start()

    def put_task(self, task):
        self.task_queue.put(task)

    def join(self):
        self.task_queue.join()
        # notify all thread to stop
        for i in range(self.nworker):
            self.task_queue.put(None)

class Task(object):
    def __init__(self, repo_id, repo_version, obj_id):
        self.repo_id = repo_id
        self.repo_version = repo_version
        self.obj_id = obj_id

class ObjMigrateWorker(Thread):
    def __init__(self, orig_obj_factory, dest_obj_factory, dtype):
        Thread.__init__(self)
        self.dtype = dtype
        self.orig_store = orig_obj_factory.get_obj_store(dtype)
        self.dest_store = dest_obj_factory.get_obj_store(dtype)
        self.thread_pool = ThreadPool(self.do_work)

    def run(self):
        logging.info('Start to migrate [%s] object' % self.dtype)
        self.thread_pool.start()
        self.migrate()
        self.thread_pool.join()
        logging.info('Complete migrate [%s] object' % self.dtype)

    def do_work(self, task):
        ioctx = self.dest_store.ceph_client.ioctx_pool.get_ioctx(task.repo_id)
        try:
            ioctx.stat(task.obj_id)
        except rados.ObjectNotFound:
            try:
                data = self.orig_store.read_obj_raw(task.repo_id, task.repo_version, task.obj_id)
            except Exception as e:
                logging.warning('[%s] Failed to read object %s from repo %s: %s' % (self.dtype, task.obj_id, task.repo_id, e))
                raise

            try:
                ioctx.write_full(task.obj_id, data)
            except Exception as e:
                logging.warning('[%s] Failed to write object %s of repo %s to Ceph: %s' % (self.dtype, task.obj_id, task.repo_id, e))
                raise
        except Exception as e:
            logging.warning('[%s] Failed to stat object %s of repo %s in Ceph: %s' % (self.dtype, task.obj_id, task.repo_id, e))
            raise
        finally:
            self.dest_store.ceph_client.ioctx_pool.return_ioctx(ioctx)

    def migrate(self):
        top_path = self.orig_store.obj_dir
        for repo_id in os.listdir(top_path):
            repo_path = os.path.join(top_path, repo_id)
            for spath in os.listdir(repo_path):
                obj_path = os.path.join(repo_path, spath)
                for lpath in os.listdir(obj_path):
                    obj_id = spath + lpath
                    task = Task(repo_id, 1, obj_id)
                    self.thread_pool.put_task(task)

def main():
    try:
        fs_obj_factory = SeafObjStoreFactory()
        os.environ['SEAFILE_CENTRAL_CONF_DIR'] = os.environ['CEPH_SEAFILE_CENTRAL_CONF_DIR']
    except KeyError:
        logging.warning('CEPH_SEAFILE_CENTRAL_CONF_DIR environment variable is not set.\n')
        sys.exit()

    ceph_obj_factory = SeafObjStoreFactory()

    dtypes = ['commits', 'fs', 'blocks']
    for dtype in dtypes:
        ObjMigrateWorker(fs_obj_factory, ceph_obj_factory, dtype).start()

if __name__ == '__main__':
    main()
