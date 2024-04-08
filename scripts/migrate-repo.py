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

logging.basicConfig(format='%(asctime)s %(message)s', level=logging.INFO)

def main(argv):
    if len(argv) == 4:
        all_migrate = False
        repo_id = argv[1]
        orig_storage_id = argv[2]
        dest_storage_id = argv[3]
    elif len(argv) == 3:
        all_migrate = True
        orig_storage_id = argv[1]
        dest_storage_id = argv[2]

    if all_migrate:
        migrate_repos(orig_storage_id, dest_storage_id)
    else:
        migrate_repo(repo_id, orig_storage_id, dest_storage_id)

def parse_seafile_config(storage_id):
    env = os.environ
    seafile_conf = os.path.join(env['SEAFILE_CENTRAL_CONF_DIR'], 'seafile.conf')
    cp = configparser.ConfigParser()
    cp.read(seafile_conf)
    host = cp.get('database', 'host')
    port = cp.get('database', 'port')
    user = cp.get('database', 'user')
    passwd = cp.get('database', 'password')
    db_name = cp.get('database', 'db_name')

    is_default = is_default_storage(cp, storage_id)

    return host, port, user, passwd, db_name, is_default

def is_default_storage(cp, orig_storage_id):
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
    sql = 'SELECT repo_id FROM Repo'

    try:
        engine = create_engine(url, echo=False)
        session = sessionmaker(engine)()
        result_proxy = session.execute(text(sql))
    except:
        return None
    else:
        results = result_proxy.fetchall()

    return results

def get_repo_ids(storage_id):
    host, port, user, passwd, db_name, is_default = parse_seafile_config(storage_id)
    url = 'mysql+pymysql://' + user + ':' + passwd + '@' + host + ':' + port + '/' + db_name

    if is_default:
        all_repo_ids = get_repo_ids_by_storage_id (url)
    storage_repo_ids =  get_repo_ids_by_storage_id (url, storage_id)

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
            if repo_id in storage_repo_ids or not repo_id in all_repo_ids:
                ret_repo_ids.append(repo_id)
        else:
            if repo_id in storage_repo_ids:
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
            if repo_id in storage_repo_ids or not repo_id in all_repo_ids:
                ret_repo_ids.append(repo_id)
        else:
            if repo_id in storage_repo_ids:
                ret_repo_ids.append(repo_id)

    return ret_repo_ids

def migrate_repo(repo_id, orig_storage_id, dest_storage_id):
    api.set_repo_status (repo_id, REPO_STATUS_READ_ONLY)
    dtypes = ['commits', 'fs', 'blocks']
    workers = []
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
            worker = ObjMigrateWorker (orig_store, dest_store, dtype, repo_id)
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
        if w.exit_code == 1:
            logging.warning(w.exception)
            api.set_repo_status (repo_id, REPO_STATUS_NORMAL)
            sys.exit(1)

    if api.update_repo_storage_id(repo_id, dest_storage_id) < 0:
        logging.warning('Failed to update repo [%s] storage_id.\n', repo_id)
        api.set_repo_status (repo_id, REPO_STATUS_NORMAL)
        return

    api.set_repo_status (repo_id, REPO_STATUS_NORMAL)
    logging.info('The process of migrating repo [%s] is over.\n', repo_id)

def migrate_repos(orig_storage_id, dest_storage_id):
    repo_ids = get_repo_ids(orig_storage_id)

    for repo_id in repo_ids:
        api.set_repo_status (repo_id, REPO_STATUS_READ_ONLY)
        dtypes = ['commits', 'fs', 'blocks']
        workers = []
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
                worker = ObjMigrateWorker (orig_store, dest_store, dtype, repo_id)
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
            if w.exit_code == 1:
                logging.warning(w.exception)
                api.set_repo_status (repo_id, REPO_STATUS_NORMAL)
                sys.exit(1)

        if api.update_repo_storage_id(repo_id, dest_storage_id) < 0:
            logging.warning('Failed to update repo [%s] storage_id.\n', repo_id)
            api.set_repo_status (repo_id, REPO_STATUS_NORMAL)
            return

        api.set_repo_status (repo_id, REPO_STATUS_NORMAL)
        logging.info('The process of migrating repo [%s] is over.\n', repo_id)

if __name__ == '__main__':
    main(sys.argv)
