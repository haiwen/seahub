#!/usr/bin/env python3
#coding: utf-8

import os
import re
import sys
import random
import logging
import queue
import threading
import argparse
from threading import Thread
from uuid import UUID
from seafobj.objstore_factory import SeafObjStoreFactory

logging.basicConfig(format='%(asctime)s %(message)s', level=logging.INFO)

class Worker(Thread):
    def __init__(self, do_work, task_queue, pool):
        Thread.__init__(self)
        self.do_work = do_work
        self.task_queue = task_queue
        self.pool = pool

    def run(self):
        while True:
            try:
                task = self.task_queue.get()
                if task is None:
                    break
                self.do_work(task)
            except Exception as e:
                self.pool.exception = e
                logging.warning('Failed to execute task: %s' % e)
            finally:
                self.task_queue.task_done()

class ThreadPool(object):
    def __init__(self, do_work, nworker=20):
        self.do_work = do_work
        self.nworker = nworker
        # The pool's exception will be set when an exception occurs in the worker processing the migration object.
        self.exception = None
        self.task_queue = queue.Queue(maxsize = 2000)

    def start(self):
        for i in range(self.nworker):
            Worker(self.do_work, self.task_queue, self).start()

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
    def __init__(self, orig_store, dest_store, dtype, repo_id = None, decrypt = False, repo_objs = None, virt_repo_ids = None):
        Thread.__init__(self)
        self.lock = threading.Lock()
        self.dtype = dtype
        self.orig_store = orig_store
        self.dest_store = dest_store
        self.repo_id = repo_id
        self.thread_pool = ThreadPool(self.do_work)
        self.write_count = 0
        self.fetch_count = 0
        self.dest_objs = {}
        self.object_list_file_path = ''
        self.fd = None
        self.exception = None
        self.decrypt = decrypt
        # set repo_objs when list src objects by commit.
        self.repo_objs = repo_objs
        # virt_repo_ids is used to migrate virtual repo's commit.
        self.virt_repo_ids = virt_repo_ids
    
    def run(self):
        try:
            self._run()
        except Exception as e:
            self.exception = e

    def _run(self):
        if 'OBJECT_LIST_FILE_PATH' in os.environ:
            if self.repo_id:
                self.object_list_file_path = '.'.join(['_'.join([os.environ['OBJECT_LIST_FILE_PATH'], self.repo_id]), self.dtype])
            else:
                self.object_list_file_path = '.'.join([os.environ['OBJECT_LIST_FILE_PATH'], self.dtype])

        if self.object_list_file_path and \
        os.path.exists(self.object_list_file_path) and \
        os.path.getsize(self.object_list_file_path) > 0:
            logging.info('Start to load [%s] destination object from file' % self.dtype)
            with open(self.object_list_file_path, 'r') as f:
                for line in f:
                    obj = line.rstrip('\n').split('/', 1)
                    if self.invalid_obj(obj):
                        continue
                    self.fetch_count += 1
                    if obj[0] in self.dest_objs:
                        self.dest_objs[obj[0]].add(obj[1])
                    else:
                        self.dest_objs[obj[0]] = set()
                        self.dest_objs[obj[0]].add(obj[1])

        else:
            logging.info('Start to fetch [%s] object from destination' % self.dtype)
            if self.object_list_file_path:
                f = open(self.object_list_file_path, 'a')
            for obj in self.dest_store.list_objs(self.repo_id):
                if self.invalid_obj(obj):
                    continue
                self.fetch_count += 1
                if obj[0] in self.dest_objs:
                    self.dest_objs[obj[0]].add(obj[1])
                else:
                    self.dest_objs[obj[0]] = set()
                    self.dest_objs[obj[0]].add(obj[1])
                if self.object_list_file_path:
                    f.write('/'.join(obj[:2]) + '\n')
                    if self.fetch_count % 100 == 0:
                        f.flush()
            if self.object_list_file_path:
                f.close()
        logging.info('[%s] [%d] objects exist in destination' % (self.dtype, self.fetch_count))

        if self.object_list_file_path:
            self.fd = open(self.object_list_file_path, 'a')
        logging.info('Start to migrate [%s] object' % self.dtype)
        self.thread_pool.start()
        self.migrate()
        self.migrate_virt_repos()
        self.thread_pool.join()
        self.exception = self.thread_pool.exception
        if self.object_list_file_path:
            self.fd.close()
        logging.info('Complete migrate [%s] object' % self.dtype)

    def do_work(self, task):
        try:
            exists = False
            if task.repo_id in self.dest_objs:
                if task.obj_id in self.dest_objs[task.repo_id]:
                    exists = True

        except Exception as e:
            logging.warning('[%s] Failed to check object %s existence from repo %s: %s' % (self.dtype, task.obj_id, task.repo_id, e))
            raise

        if not exists:
            try:
                if self.decrypt:
                    data = self.orig_store.read_decrypted(task.repo_id, task.repo_version, task.obj_id)
                else:
                    data = self.orig_store.read_obj_raw(task.repo_id, task.repo_version, task.obj_id)
            except Exception as e:
                logging.warning('[%s] Failed to read object %s from repo %s: %s' % (self.dtype, task.obj_id, task.repo_id, e))
                raise

            try:
                self.dest_store.write_obj(data, task.repo_id, task.obj_id)
                self.write_count += 1
                if self.write_count % 100 == 0:
                    logging.info('[%s] task: %s objects written to destination.', self.dtype, self.write_count)

                if self.object_list_file_path:
                    with self.lock:
                        self.fd.write('/'.join([task.repo_id, task.obj_id]) + '\n')
                        if self.write_count % 100 == 0:
                            self.fd.flush()
            except Exception as e:
                logging.warning('[%s] Failed to write object %s from repo %s: %s' % (self.dtype, task.obj_id, task.repo_id, e))
                raise

    def put_task(self, objs):
        if self.dest_store.get_name() != "filesystem storage backend":
            random.shuffle(objs)
        for obj in objs:
            repo_id,obj_id=obj.split('/')
            task = Task(repo_id, 1, obj_id)
            self.thread_pool.put_task(task)

    def migrate(self):
        try:
            if self.repo_objs is None:
                obj_list = self.orig_store.list_objs(self.repo_id)
            else:
                obj_list = self.repo_objs.list_objs(self.dtype, self.repo_id)
        except Exception as e:
            logging.warning('[%s] Failed to list all objects: %s' % (self.dtype, e))
            raise

        objs = []
        for obj in obj_list:
            if self.invalid_obj(obj):
                continue
            repo_id = obj[0]
            obj_id = obj[1]
            objs.append(repo_id+"/"+obj_id)
            if len(objs) >= 1000000:
                self.put_task(objs)
                objs = []

        self.put_task(objs)

    def migrate_virt_repos(self):
        if self.dtype != "commits":
            return

        for virt_repo_id in self.virt_repo_ids:
            try:
                if self.repo_objs is None:
                    obj_list = self.orig_store.list_objs(virt_repo_id)
                else:
                    obj_list = self.repo_objs.list_objs(self.dtype, virt_repo_id)
            except Exception as e:
                logging.warning('[%s] Failed to list all objects: %s' % (self.dtype, e))
                raise

            objs = []
            for obj in obj_list:
                if self.invalid_obj(obj):
                    continue
                repo_id = obj[0]
                obj_id = obj[1]
                objs.append(repo_id+"/"+obj_id)
                if len(objs) >= 1000000:
                    self.put_task(objs)
                    objs = []

            self.put_task(objs)

    def invalid_obj(self, obj):
        if len(obj) < 2:
            return True
        try:
            UUID(obj[0], version = 4)
        except ValueError:
            return True
        if len(obj[1]) != 40 or not re.match('\A[0-9a-f]+\Z', obj[1]):
            return True
        return False

def main(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument('--decrypt', action='store_true', help='decrypt data from source storage and write to destination in plain text')
    parser.add_argument('config_dir', help='The dir where the destination configuration file exists')
    args = parser.parse_args()

    decrypt = args.decrypt

    try:
        orig_obj_factory = SeafObjStoreFactory()
        os.environ['SEAFILE_CENTRAL_CONF_DIR'] = os.environ['DEST_SEAFILE_CENTRAL_CONF_DIR']
    except KeyError:
        logging.warning('DEST_SEAFILE_CENTRAL_CONF_DIR environment variable is not set.\n')
        sys.exit()

    dest_obj_factory = SeafObjStoreFactory()

    dtypes = ['commits', 'fs', 'blocks']
    for dtype in dtypes:
        orig_store = orig_obj_factory.get_obj_store(dtype)
        dest_store = dest_obj_factory.get_obj_store(dtype)
        if orig_store.get_name() == dest_store.get_name() and \
           orig_store.get_container_name() == dest_store.get_container_name():
            logging.warning('%s does not support migration between identical storage' % (orig_store.get_name()))
            sys.exit()
        ObjMigrateWorker(orig_store, dest_store, dtype, decrypt=decrypt).start()

if __name__ == '__main__':
    main(sys.argv)
