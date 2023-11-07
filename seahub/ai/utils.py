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


def get_sdoc_info_recursively(username, repo_id, path, sdoc_info_list, include_sys_dir=False):
    dirs = seafile_api.list_dir_by_path(repo_id, path)
    for dirent in dirs:

        if stat.S_ISDIR(dirent.mode):
            if not include_sys_dir and path =='/' and dirent.obj_name in ['images', 'Revisions']:
                continue

            sub_path = posixpath.join(path, dirent.obj_name)
            get_sdoc_info_recursively(username, repo_id, sub_path, sdoc_info_list)
            continue

        sdoc_parent_dir = path
        filename = dirent.obj_name
        file_id = dirent.obj_id
        mtime = dirent.mtime
        size = dirent.size
        if not filename.endswith('.sdoc'):
            continue

        sdoc_path = os.path.join(sdoc_parent_dir, filename)
        download_token = seafile_api.get_fileserver_access_token(repo_id, file_id, 'download', username,
                                                                 use_onetime=True)
        sdoc_info = {
            'path': sdoc_path,
            'download_token': download_token,
            'mtime': mtime,
            'size': size,
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
