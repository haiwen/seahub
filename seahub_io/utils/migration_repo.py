import os
import re
import sys
import random
import time
import logging
import queue
import threading
import configparser
from threading import Thread
from uuid import UUID
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from seafobj.objstore_factory import SeafObjStoreFactory, objstore_factory
from seaserv import seafile_api as api
from seaserv import REPO_STATUS_READ_ONLY, REPO_STATUS_NORMAL
from seafobj import fs_mgr, commit_mgr
from seafobj.fs import SeafDir, SeafFile

ZERO_OBJ_ID = '0000000000000000000000000000000000000000'

logger = logging.getLogger(__name__)

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
                logger.warning('Failed to execute task: %s' % e)
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
    def __init__(self, orig_store, dest_store, dtype, repo_id = None, decrypt = False, repo_objs = None):
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
            
            try:
                dirname = os.path.dirname(self.object_list_file_path)
                if dirname and not os.path.exists(dirname):
                    os.makedirs(dirname)
            except Exception as e:
                logger.warning('Failed to create directory for object_list_file_path: %s', e)
                self.object_list_file_path = ''

        if self.object_list_file_path and \
        os.path.exists(self.object_list_file_path) and \
        os.path.getsize(self.object_list_file_path) > 0:
            logger.info('Start to load [%s] destination object from file' % self.dtype)
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
            logger.info('Start to fetch [%s] object from destination' % self.dtype)
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
        logger.info('[%s] [%d] objects exist in destination' % (self.dtype, self.fetch_count))

        if self.object_list_file_path:
            self.fd = open(self.object_list_file_path, 'a')
        logger.info('Start to migrate [%s] object' % self.dtype)
        self.thread_pool.start()
        self.migrate()
        self.thread_pool.join()
        self.exception = self.thread_pool.exception
        if self.object_list_file_path:
            self.fd.close()
        logger.info('Complete migrate [%s] object' % self.dtype)

    def do_work(self, task):
        try:
            exists = False
            if task.repo_id in self.dest_objs:
                if task.obj_id in self.dest_objs[task.repo_id]:
                    exists = True

        except Exception as e:
            logger.warning('[%s] Failed to check object %s existence from repo %s: %s' % (self.dtype, task.obj_id, task.repo_id, e))
            raise

        if not exists:
            try:
                if self.decrypt:
                    data = self.orig_store.read_decrypted(task.repo_id, task.repo_version, task.obj_id)
                else:
                    data = self.orig_store.read_obj_raw(task.repo_id, task.repo_version, task.obj_id)
            except Exception as e:
                logger.warning('[%s] Failed to read object %s from repo %s: %s' % (self.dtype, task.obj_id, task.repo_id, e))
                raise

            try:
                self.dest_store.write_obj(data, task.repo_id, task.obj_id)
                self.write_count += 1
                if self.write_count % 100 == 0:
                    logger.info('[%s] task: %s objects written to destination.', self.dtype, self.write_count)

                if self.object_list_file_path:
                    with self.lock:
                        self.fd.write('/'.join([task.repo_id, task.obj_id]) + '\n')
                        if self.write_count % 100 == 0:
                            self.fd.flush()
            except Exception as e:
                logger.warning('[%s] Failed to write object %s from repo %s: %s' % (self.dtype, task.obj_id, task.repo_id, e))
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
                obj_list = self.repo_objs.list_objs(self.dtype)
        except Exception as e:
            logger.warning('[%s] Failed to list all objects: %s' % (self.dtype, e))
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
        if len(obj[1]) != 40 or not re.match(r'\A[0-9a-f]+\Z', obj[1]):
            return True
        return False

def remove_repo_objs(repo_id, orig_storage_id):
    dtypes = ['commits', 'fs', 'blocks']
    for dtype in dtypes:
        if 'OBJECT_LIST_FILE_PATH' in os.environ:
            object_list_file_path = '.'.join(['_'.join([os.environ['OBJECT_LIST_FILE_PATH'], repo_id]), dtype])
        else:
            logger.warning('OBJECT_LIST_FILE_PATH environment does not exist.')
            return

        obj_stores = objstore_factory.get_obj_stores(dtype)
        if orig_storage_id not in obj_stores:
            logger.warning('Storage id passed in does not exist in configuration.\n')
            return

        orig_store = obj_stores[orig_storage_id]

        if not os.path.exists(object_list_file_path):
            continue

        with open(object_list_file_path, 'r') as f:
            for line in f:
                obj = line.rstrip('\n').split('/', 1)
                try:
                    orig_store.remove_obj(obj[0], obj[1])
                except Exception as e:
                    logger.warning('Failed to remove object %s from repo %s:%s' % (obj[1], obj[0], e))
        
        # Remove the object list file after successful removal
        try:
            os.remove(object_list_file_path)
        except OSError:
            pass

    logger.info('The process of remove repo [%s] is over.\n', repo_id)

def parse_seafile_db_config():
    host = os.environ.get('SEAFILE_MYSQL_DB_HOST', 'db')
    port = os.environ.get('SEAFILE_MYSQL_DB_PORT', '3306')
    user = os.environ.get('SEAFILE_MYSQL_DB_USER', 'seafile')
    passwd = os.environ.get('SEAFILE_MYSQL_DB_PASSWORD')
    db_name = os.environ.get('SEAFILE_MYSQL_DB_SEAFILE_DB_NAME', 'seafile_db')

    return host, port, user, passwd, db_name

class RepoObjects(object):
    def __init__(self, repo_id, storage_id=None):
        self.repo_id = repo_id
        self.storage_id = storage_id
        self.timestamp = 0
        self.commit_keys = set()
        self.fs_keys = set()
        self.block_keys = set()
        self.virt_repo_ids = set()
        self.get_virt_repo_ids()

    def get_virt_repo_ids(self):
        host, port, user, passwd, db_name = parse_seafile_db_config()
        url = 'mysql+pymysql://' + user + ':' + passwd + '@' + host + ':' + port + '/' + db_name
        sql = 'SELECT repo_id FROM VirtualRepo WHERE origin_repo=\"%s\"'%(self.repo_id)

        engine = create_engine(url, echo=False)
        session = sessionmaker(engine)()
        result_proxy = session.execute(text(sql))
        results = result_proxy.fetchall()
        for r in results:
            repo_id = r[0]
            self.virt_repo_ids.add(repo_id)

    def traverse(self):
        repo = api.get_repo(self.repo_id)
        if repo is None:
            raise Exception("Failed to get repo %s" % self.repo_id)

        # When the migrated repo is a virtual repo, only commit objects are migrated.
        # When the migrated repo is a parent repo, the fs and blocks objects of its virtual repos are migrated as well.
        # Because virtual repos and their origin repos share fs and block objects, we do not migrate fs and block objects when migrating a virtual repo.
        # Instead, fs and block objects for both the origin repo and its virtual repos are migrated when the origin repo is migrated.
        # This avoids the situation where, after a virtual repo has been migrated but the origin repo has not, the virutal repo’s fs and block objects are still written to the origin repo’s storage.
        self.traverse_repo(repo)
        for virt_repo_id in self.virt_repo_ids:
            self.traverse_virt_repo(virt_repo_id, repo.version)

    def traverse_repo(self, repo):
        page = 0
        limit = 100
        while True:
            start = page * limit
            commits = api.get_commit_list(self.repo_id, start, limit)

            for commit in commits:
                if commit.id in self.commit_keys:
                    continue
                if self.timestamp == 0:
                    self.timestamp = commit.ctime
                if commit.ctime < self.timestamp:
                    self.timestamp = commit.ctime
                self.commit_keys.add(commit.id)
                if repo.is_virtual:
                    continue
                self.traverse_dir(repo.version, commit.root_id)

            if len(commits) == limit:
                page = page + 1
            else:
                logger.info('Successfully traversed %d commits, %d fs and %d blocks in repo %s.\n', len(self.commit_keys), len(self.fs_keys), len(self.block_keys), self.repo_id)
                return

    def traverse_virt_repo(self, repo_id, version):
        page = 0
        limit = 100
        virt_commit_keys = set() 
        while True:
            start = page * limit
            commits = api.get_commit_list(repo_id, start, limit)

            for commit in commits:
                if commit.id in virt_commit_keys:
                    continue
                virt_commit_keys.add(commit.id)
                self.traverse_dir(version, commit.root_id)

            if len(commits) == limit:
                page = page + 1
            else:
                logger.info('Successfully traversed %d commits in virtual repo %s.\n', len(virt_commit_keys), repo_id)
                return

    def traverse_dir(self, version, root_id):
        if root_id == ZERO_OBJ_ID:
            return
        if root_id in self.fs_keys:
            return
        self.fs_keys.add(root_id)

        if self.storage_id:
            seafdir_data = fs_mgr.obj_stores[self.storage_id].read_obj(self.repo_id, version, root_id)
            if version == 0:
                dirents = fs_mgr.parse_dirents_v0(seafdir_data, root_id)
            else:
                dirents = fs_mgr.parse_dirents_v1(seafdir_data, root_id)
            seafdir = SeafDir(self.storage_id, version, root_id, dirents)
        else:
            seafdir = fs_mgr.load_seafdir(self.repo_id, version, root_id)

        for d in seafdir.get_files_list():
            if d.id == ZERO_OBJ_ID:
                continue
            if d.id in self.fs_keys:
                continue
            self.fs_keys.add(d.id)

            if self.storage_id:
                seafile_data = fs_mgr.obj_stores[self.storage_id].read_obj(self.repo_id, version, d.id)
                if version == 0:
                    blocks, size = fs_mgr.parse_blocks_v0(seafile_data, d.id)
                else:
                    blocks, size = fs_mgr.parse_blocks_v1(seafile_data, d.id)
                file = SeafFile(self.storage_id, version, d.id, blocks, size)
            else:
                file = fs_mgr.load_seafile(self.repo_id, version, d.id)

            for blk_id in file.blocks:
                if blk_id in self.block_keys:
                    continue
                self.block_keys.add(blk_id)

        for d in seafdir.get_subdirs_list():
            self.traverse_dir (version, d.id)

    def list_objs(self, dtype):
        if dtype == 'commits':
            for key in self.commit_keys:
                obj = [self.repo_id, key, 0]
                yield obj
        elif dtype == 'fs':
            for key in self.fs_keys:
                obj = [self.repo_id, key, 0]
                yield obj
        elif dtype == 'blocks':
            for key in self.block_keys:
                obj = [self.repo_id, key, 0]
                yield obj

def migrate_repo(repo_id, orig_storage_id, dest_storage_id, list_src_by_commit=False, initial_status=REPO_STATUS_NORMAL, final_status=REPO_STATUS_NORMAL):
    api.set_repo_status (repo_id, REPO_STATUS_READ_ONLY)
    dtypes = ['commits', 'fs', 'blocks']
    workers = []
    repo_objs = None
    if list_src_by_commit:
        repo_objs = RepoObjects(repo_id, orig_storage_id)
        try:
            repo_objs.traverse()
        except Exception as e:
            logger.warning('Failed to traverse repo objects %s: %s.\n', repo_id, e)
            api.set_repo_status (repo_id, initial_status)
            raise e
    for dtype in dtypes:
        obj_stores = objstore_factory.get_obj_stores(dtype)
        #If these storage ids passed in do not exist in conf, stop migrate this repo.
        if orig_storage_id not in obj_stores or dest_storage_id not in obj_stores:
            logger.warning('Storage id passed in does not exist in configuration.\n')
            api.set_repo_status (repo_id, initial_status)
            return

        orig_store = obj_stores[orig_storage_id]
        dest_store = obj_stores[dest_storage_id]
        
        try:
            worker = ObjMigrateWorker (orig_store, dest_store, dtype, repo_id, repo_objs=repo_objs)
            worker.start()
            workers.append(worker)
        except:
            logger.warning('Failed to migrate repo %s.', repo_id)
            api.set_repo_status (repo_id, initial_status)
            raise
    
    try:
        for w in workers:
            w.join()
    except:
        api.set_repo_status (repo_id, initial_status)
        raise
    
    for w in workers:
        if w.exception:
            logger.warning(w.exception)
            api.set_repo_status (repo_id, initial_status)
            raise w.exception

    if list_src_by_commit:
        api.set_repo_valid_since (repo_id, repo_objs.timestamp)

    # logger.info('[DEBUG] Sleeping 60s for verification...')
    # time.sleep(60)

    if api.update_repo_storage_id(repo_id, dest_storage_id) < 0:
        logger.warning('Failed to update repo [%s] storage_id.\n', repo_id)
        api.set_repo_status (repo_id, initial_status)
        raise Exception('Failed to update repo storage_id')

    api.set_repo_status (repo_id, final_status)
    logger.info('The process of migrating repo [%s] is over.\n', repo_id)
