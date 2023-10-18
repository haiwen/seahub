import os
import logging
import requests
import jwt
import time
import stat
import posixpath
from urllib.parse import urljoin

from seahub.settings import SEAFILE_AI_SERVER_URL, SEAFILE_AI_SECRET_KEY

from seaserv import seafile_api


logger = logging.getLogger(__name__)


def gen_headers():
    payload = {'exp': int(time.time()) + 300, }
    token = jwt.encode(payload, SEAFILE_AI_SECRET_KEY, algorithm='HS256')
    return {"Authorization": "Token %s" % token}


def get_dir_file_recursively(username, repo_id, path, all_dirs):
    dirs = seafile_api.list_dir_by_path(repo_id, path)
    for dirent in dirs:
        entry = {}
        if stat.S_ISDIR(dirent.mode):
            entry["type"] = 'dir'
        else:
            entry["type"] = 'file'

        entry["parent_dir"] = path
        entry["id"] = dirent.obj_id
        entry["name"] = dirent.obj_name
        entry["mtime"] = dirent.mtime

        all_dirs.append(entry)

        if stat.S_ISDIR(dirent.mode):
            sub_path = posixpath.join(path, dirent.obj_name)
            get_dir_file_recursively(username, repo_id, sub_path, all_dirs)

    return all_dirs


def get_dir_sdoc_info_list(dir_file_info_list, repo_id, username):
    sdoc_info_list = []
    for item in dir_file_info_list:
        if item.get('type') == 'dir' or item.get('size') == 0 or not item.get('name', '').endswith('.sdoc'):
            continue

        sdoc_parent_dir = item.get('parent_dir')
        filename = item.get('name')
        file_id = item.get('id')
        mtime = item.get('mtime')
        path = os.path.join(sdoc_parent_dir, filename)
        download_token = seafile_api.get_fileserver_access_token(repo_id, file_id, 'download', username,
                                                                 use_onetime=True)
        sdoc_info = {
            'path': path,
            'download_token': download_token,
            'mtime': mtime,
        }
        sdoc_info_list.append(sdoc_info)
    return sdoc_info_list


def create_library_sdoc_index(params):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/library-sdoc-indexes/')
    resp = requests.post(url, json=params, headers=headers)
    return resp


def similarity_search_in_library(params):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/similarity-search-in-library/')
    resp = requests.post(url, json=params, headers=headers)
    return resp


def update_library_sdoc_index(params):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/library-sdoc-index/')
    resp = requests.put(url, headers=headers, json=params)
    return resp


def delete_library_index(repo_id):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/library-sdoc-index/')
    params = {'associate_id': repo_id}
    resp = requests.delete(url, headers=headers, json=params)
    return resp


def query_task_status(task_id):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/task-status/')
    resp = requests.get(url, headers=headers, params={'task_id': task_id})
    return resp


def query_library_index_state(associate_id):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/library-index-state/')
    resp = requests.get(url, headers=headers, params={'associate_id': associate_id})
    return resp
