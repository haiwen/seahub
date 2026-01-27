#!/usr/bin/env python3

import os
import sys
import logging
import configparser 
import json
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from migrate import ObjMigrateWorker
from seafobj.objstore_factory import objstore_factory
from seaserv import seafile_api as api
from seaserv import REPO_STATUS_READ_ONLY, REPO_STATUS_NORMAL
from seafobj import fs_mgr, commit_mgr
import argparse

ZERO_OBJ_ID = '0000000000000000000000000000000000000000'

logging.basicConfig(format='%(asctime)s %(message)s', level=logging.INFO)

def main(argv):
    parser = argparse.ArgumentParser()

    parser.add_argument("repo_id", nargs="?", default=None)
    parser.add_argument("orig_storage_id")
    parser.add_argument("dest_storage_id")
    parser.add_argument("--list-src-by-commit", action="store_true", help="list src objects by commit")

    args = parser.parse_args()

    repo_id = args.repo_id
    orig_storage_id = args.orig_storage_id
    dest_storage_id = args.dest_storage_id
    list_src_by_commit = args.list_src_by_commit

    if repo_id is None:
        all_migrate = True
    else:
        all_migrate = False

    if all_migrate:
        migrate_repos(orig_storage_id, dest_storage_id, list_src_by_commit)
    else:
        migrate_repo(repo_id, orig_storage_id, dest_storage_id, list_src_by_commit)

def parse_seafile_db_config():
    env = os.environ
    seafile_conf = os.path.join(env['SEAFILE_CENTRAL_CONF_DIR'], 'seafile.conf')
    cp = configparser.ConfigParser()
    cp.read(seafile_conf)
    host = cp.get('database', 'host')
    port = cp.get('database', 'port')
    user = cp.get('database', 'user')
    passwd = cp.get('database', 'password')
    db_name = cp.get('database', 'db_name')

    return host, port, user, passwd, db_name

def is_default_storage(orig_storage_id):
    env = os.environ
    seafile_conf = os.path.join(env['SEAFILE_CENTRAL_CONF_DIR'], 'seafile.conf')
    cp = configparser.ConfigParser()
    cp.read(seafile_conf)

    json_file = cp.get('storage', 'storage_classes_file')
    f = open(json_file)
    json_cfg = json.load(f)

    is_default = False

    for bend in json_cfg:
        storage_id = bend['storage_id']
        if storage_id == orig_storage_id:
            if 'is_default' in bend:
                is_default = bend['is_default']
                break

    return is_default

def get_repo_ids_by_storage_id (url, storage_id = None):
    if storage_id:
        sql = 'SELECT repo_id FROM RepoStorageId WHERE storage_id=\"%s\"'%(storage_id)
    else:
        sql = 'SELECT repo_id FROM RepoStorageId'

    try:
        engine = create_engine(url, echo=False)
        session = sessionmaker(engine)()
        result_proxy = session.execute(text(sql))
    except:
        return None
    else:
        results = result_proxy.fetchall()

    repo_ids = {}
    for r in results:
        try:
            repo_id = r[0]
        except:
            continue
        repo_ids[repo_id] = repo_id
    return repo_ids

def get_repo_ids_from_trash (url):
    sql = 'SELECT repo_id FROM RepoTrash'

    try:
        engine = create_engine(url, echo=False)
        session = sessionmaker(engine)()
        result_proxy = session.execute(text(sql))
    except:
        return None
    else:
        results = result_proxy.fetchall()

    return results

def get_existing_repo_ids (url):
    sql = 'SELECT r.repo_id FROM Repo r LEFT JOIN VirtualRepo v ON r.repo_id = v.repo_id WHERE v.repo_id IS NULL'

    try:
        engine = create_engine(url, echo=False)
        session = sessionmaker(engine)()
        result_proxy = session.execute(text(sql))
    except:
        return None
    else:
        results = result_proxy.fetchall()

    return results

def get_repo_ids(storage_id, dest_storage_id):
    host, port, user, passwd, db_name = parse_seafile_db_config()
    is_default = is_default_storage(storage_id)
    url = 'mysql+pymysql://' + user + ':' + passwd + '@' + host + ':' + port + '/' + db_name

    if is_default:
        all_repo_ids = get_repo_ids_by_storage_id (url)
    storage_repo_ids =  get_repo_ids_by_storage_id (url, storage_id)
    dest_storage_repo_ids =  get_repo_ids_by_storage_id (url, dest_storage_id)

    existing_repo_ids = get_existing_repo_ids (url)

    ret_repo_ids = []
    for r in existing_repo_ids:
        try:
            repo_id = r[0]
        except:
            continue
        #If it's default storage, we should also return the repos which are not in the RepoStorageID table.
        #Repo table is checked to preventing returning deleted repos.
        if is_default:
            if repo_id in storage_repo_ids or not repo_id in all_repo_ids or repo_id in dest_storage_repo_ids:
                ret_repo_ids.append(repo_id)
        else:
            if repo_id in storage_repo_ids or repo_id in dest_storage_repo_ids:
                ret_repo_ids.append(repo_id)

    repo_list_in_trash = get_repo_ids_from_trash (url)
    for r in repo_list_in_trash:
        try:
            repo_id = r[0]
        except:
            continue
        #If it's default storage, we should also return the repos which are not in the RepoStorageID table.
        #Repo table is checked to preventing returning deleted repos.
        if is_default:
            if repo_id in storage_repo_ids or not repo_id in all_repo_ids or repo_id in dest_storage_repo_ids:
                ret_repo_ids.append(repo_id)
        else:
            if repo_id in storage_repo_ids or repo_id in dest_storage_repo_ids:
                ret_repo_ids.append(repo_id)

    return ret_repo_ids

def get_virt_repo_ids(repo_id):
    host, port, user, passwd, db_name = parse_seafile_db_config()
    url = 'mysql+pymysql://' + user + ':' + passwd + '@' + host + ':' + port + '/' + db_name
    sql = 'SELECT repo_id FROM VirtualRepo WHERE origin_repo=\"%s\"'%(repo_id)

    virt_repo_ids = set()
    engine = create_engine(url, echo=False)
    session = sessionmaker(engine)()
    result_proxy = session.execute(text(sql))
    results = result_proxy.fetchall()
    for r in results:
        repo_id = r[0]
        virt_repo_ids.add(repo_id)

    return virt_repo_ids

def migrate_repo(repo_id, orig_storage_id, dest_storage_id, list_src_by_commit):
    repo = api.get_repo(repo_id)
    if repo is None:
        logging.warning('Failed to get repo %s.\n', repo_id)
        sys.exit(1)
    if repo.is_virtual:
        logging.warning('Can not migrate virtual repo %s.\n', repo_id)
        sys.exit(1)

    api.set_repo_status (repo_id, REPO_STATUS_READ_ONLY)

    virt_repo_ids = get_virt_repo_ids(repo_id)

    dtypes = ['commits', 'fs', 'blocks']
    workers = []
    repo_objs = None
    if list_src_by_commit:
        repo_objs = RepoObjects(repo_id, virt_repo_ids)
        try:
            repo_objs.traverse()
        except Exception as e:
            logging.warning('Failed to traverse repo objects %s: %s.\n', repo_id, e)
            api.set_repo_status (repo_id, REPO_STATUS_NORMAL)
            sys.exit(1)
    for dtype in dtypes:
        obj_stores = objstore_factory.get_obj_stores(dtype)
        #If these storage ids passed in do not exist in conf, stop migrate this repo.
        if orig_storage_id not in obj_stores or dest_storage_id not in obj_stores:
            logging.warning('Storage id passed in does not exist in configuration.\n')
            api.set_repo_status (repo_id, REPO_STATUS_NORMAL)
            sys.exit()

        orig_store = obj_stores[orig_storage_id]
        dest_store = obj_stores[dest_storage_id]
        
        try:
            worker = ObjMigrateWorker (orig_store, dest_store, dtype, repo_id, repo_objs=repo_objs, virt_repo_ids=virt_repo_ids)
            worker.start()
            workers.append(worker)
        except:
            logging.warning('Failed to migrate repo %s.', repo_id)
    
    try:
        for w in workers:
            w.join()
    except:
        api.set_repo_status (repo_id, REPO_STATUS_NORMAL)
        sys.exit(1)
    
    for w in workers:
        if w.exception:
            logging.warning(w.exception)
            api.set_repo_status (repo_id, REPO_STATUS_NORMAL)
            sys.exit(1)

    if list_src_by_commit:
        # This RPC was added in version 11.0. If the user is running a server version earlier than 11.0, this part of the code needs to be commented.
        api.set_repo_valid_since (repo_id, repo_objs.timestamp_by_repo[repo_id])
        for virt_repo_id in virt_repo_ids:
            api.set_repo_valid_since (virt_repo_id, repo_objs.timestamp_by_repo[virt_repo_id])

    # The virtual repo’s storage_id is updated before that of the parent repo.
    # This way, even if the process is interrupted, the migration of both the parent repo and the virtual repo will be retried the next time.
    for virt_repo_id in virt_repo_ids:
        if api.update_repo_storage_id(virt_repo_id, dest_storage_id) < 0:
            logging.warning('Failed to update virtual repo [%s] storage_id.\n', virt_repo_id)

    if api.update_repo_storage_id(repo_id, dest_storage_id) < 0:
        logging.warning('Failed to update repo [%s] storage_id.\n', repo_id)
        api.set_repo_status (repo_id, REPO_STATUS_NORMAL)
        return

    api.set_repo_status (repo_id, REPO_STATUS_NORMAL)
    logging.info('The process of migrating repo [%s] is over.\n', repo_id)

def migrate_repos(orig_storage_id, dest_storage_id, list_src_by_commit):
    repo_ids = get_repo_ids(orig_storage_id, dest_storage_id)

    pending_repos = {}
    for repo_id in repo_ids:
        api.set_repo_status (repo_id, REPO_STATUS_READ_ONLY)

        virt_repo_ids = get_virt_repo_ids(repo_id)

        dtypes = ['commits', 'fs', 'blocks']
        workers = []
        repo_objs = None
        if list_src_by_commit:
            repo_objs = RepoObjects(repo_id, virt_repo_ids)
            try:
                repo_objs.traverse()
            except Exception as e:
                logging.warning('Failed to traverse repo objects %s: %s.\n', repo_id, e)
                api.set_repo_status (repo_id, REPO_STATUS_NORMAL)
                pending_repos[repo_id] = repo_id
                continue
        for dtype in dtypes:
            obj_stores = objstore_factory.get_obj_stores(dtype)
            #If these storage ids passed in do not exist in conf, stop migrate this repo.
            if orig_storage_id not in obj_stores or dest_storage_id not in obj_stores:
                logging.warning('Storage id passed in does not exist in configuration.\n')
                api.set_repo_status (repo_id, REPO_STATUS_NORMAL)
                sys.exit()

            orig_store = obj_stores[orig_storage_id]
            dest_store = obj_stores[dest_storage_id]
            
            try:
                worker = ObjMigrateWorker (orig_store, dest_store, dtype, repo_id, repo_objs=repo_objs, virt_repo_ids=virt_repo_ids)
                worker.start()
                workers.append(worker)
            except:
                logging.warning('Failed to migrate repo %s.', repo_id)

        try:
            for w in workers:
                w.join()
        except:
            api.set_repo_status (repo_id, REPO_STATUS_NORMAL)
            sys.exit(1)
        
        for w in workers:
            if w.exception:
                logging.warning(w.exception)
                pending_repos[repo_id] = repo_id

        if repo_id in pending_repos:
            api.set_repo_status (repo_id, REPO_STATUS_NORMAL)
            logging.info('The process of migrating repo [%s] is failed.\n', repo_id)
            continue

        if list_src_by_commit:
            # This RPC was added in version 11.0. If the user is running a server version earlier than 11.0, this part of the code needs to be commented.
            api.set_repo_valid_since (repo_id, repo_objs.timestamp_by_repo[repo_id])
            for virt_repo_id in virt_repo_ids:
                api.set_repo_valid_since (virt_repo_id, repo_objs.timestamp_by_repo[virt_repo_id])

        # The virtual repo’s storage_id is updated before that of the parent repo.
        # This way, even if the process is interrupted, the migration of both the parent repo and the virtual repo will be retried the next time.
        for virt_repo_id in virt_repo_ids:
            if api.update_repo_storage_id(virt_repo_id, dest_storage_id) < 0:
                logging.warning('Failed to update virtual repo [%s] storage_id.\n', virt_repo_id)

        if api.update_repo_storage_id(repo_id, dest_storage_id) < 0:
            logging.warning('Failed to update repo [%s] storage_id.\n', repo_id)
            api.set_repo_status (repo_id, REPO_STATUS_NORMAL)
            return

        api.set_repo_status (repo_id, REPO_STATUS_NORMAL)
        logging.info('The process of migrating repo [%s] is over.\n', repo_id)

    if len(pending_repos) != 0:
        logging.info('The following repos were not migrated successfully and need to be migrated again:\n')
        for r in pending_repos:
            logging.info('%s\n', r)

# RepoObjects traverses commits, fs and block objects in the source storage starting from the repo’s HEAD commit.
class RepoObjects(object):
    def __init__(self, repo_id, virt_repo_ids):
        self.repo_id = repo_id
        self.timestamp_by_repo = {}
        self.commit_keys_by_repo = {}
        self.fs_keys = set()
        self.block_keys = set()
        self.virt_repo_ids = virt_repo_ids

    def traverse(self):
        repo = api.get_repo(self.repo_id)
        if repo is None:
            raise Exception("Failed to get repo %s" % self.repo_id)

        # The fs and block objects for both the origin repo and its virtual repos are migrated when the origin repo is migrated.
        # This avoids the situation where, after a virtual repo has been migrated but the origin repo has not, the virutal repo’s fs and block objects are still written to the origin repo’s storage.
        self.traverse_repo(repo)
        for virt_repo_id in self.virt_repo_ids:
            self.traverse_virt_repo(virt_repo_id, repo.version)

    def traverse_repo(self, repo):
        commit_keys = set()
        self.timestamp_by_repo[self.repo_id] = 0

        page = 0
        limit = 100
        while True:
            start = page * limit
            commits = api.get_commit_list(self.repo_id, start, limit)

            for commit in commits:
                if commit.id in commit_keys:
                    continue
                if self.timestamp_by_repo[self.repo_id] == 0:
                    self.timestamp_by_repo[self.repo_id] = commit.ctime
                if commit.ctime < self.timestamp_by_repo[self.repo_id]:
                    self.timestamp_by_repo[self.repo_id] = commit.ctime
                commit_keys.add(commit.id)
                self.traverse_dir(repo.version, commit.root_id)

            if len(commits) == limit:
                page = page + 1
            else:
                self.commit_keys_by_repo[self.repo_id] = commit_keys
                logging.info('Successfully traversed %d commits, %d fs and %d blocks in repo %s.\n', len(commit_keys), len(self.fs_keys), len(self.block_keys), self.repo_id)
                return

    def traverse_virt_repo(self, repo_id, version):
        commit_keys = set()
        self.timestamp_by_repo[repo_id] = 0

        page = 0
        limit = 100
        while True:
            start = page * limit
            commits = api.get_commit_list(repo_id, start, limit)

            for commit in commits:
                if commit.id in commit_keys:
                    continue
                if self.timestamp_by_repo[repo_id] == 0:
                    self.timestamp_by_repo[repo_id] = commit.ctime
                if commit.ctime < self.timestamp_by_repo[repo_id]:
                    self.timestamp_by_repo[repo_id] = commit.ctime
                commit_keys.add(commit.id)
                self.traverse_dir(version, commit.root_id)

            if len(commits) == limit:
                page = page + 1
            else:
                self.commit_keys_by_repo[repo_id] = commit_keys
                logging.info('Successfully traversed %d commits in virtual repo %s.\n', len(commit_keys), repo_id)
                return

    def traverse_dir(self, version, root_id):
        if root_id == ZERO_OBJ_ID:
            return
        if root_id in self.fs_keys:
            return
        self.fs_keys.add(root_id)

        seafdir = fs_mgr.load_seafdir(self.repo_id, version, root_id)
        for d in seafdir.get_files_list():
            if d.id == ZERO_OBJ_ID:
                continue
            if d.id in self.fs_keys:
                continue
            self.fs_keys.add(d.id)

            file = fs_mgr.load_seafile(self.repo_id, version, d.id)
            for blk_id in file.blocks:
                if blk_id in self.block_keys:
                    continue
                self.block_keys.add(blk_id)

        for d in seafdir.get_subdirs_list():
            self.traverse_dir (version, d.id)

    def list_objs(self, dtype, repo_id):
        if dtype == 'commits':
            commit_keys = self.commit_keys_by_repo[repo_id]
            for key in commit_keys:
                obj = [repo_id, key, 0]
                yield obj
        elif dtype == 'fs':
            for key in self.fs_keys:
                obj = [self.repo_id, key, 0]
                yield obj
        elif dtype == 'blocks':
            for key in self.block_keys:
                obj = [self.repo_id, key, 0]
                yield obj

if __name__ == '__main__':
    main(sys.argv)
