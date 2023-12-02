import logging
import requests
import jwt
import time
from urllib.parse import urljoin

from seahub.settings import SEAFILE_AI_SERVER_URL, SEAFILE_AI_SECRET_KEY

from seaserv import seafile_api


logger = logging.getLogger(__name__)


def gen_headers():
    payload = {'exp': int(time.time()) + 300, }
    token = jwt.encode(payload, SEAFILE_AI_SECRET_KEY, algorithm='HS256')
    return {"Authorization": "Token %s" % token}


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

def question_answering_search_in_library(params):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/question-answering-search-in-library/')
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
    params = {'repo_id': repo_id}
    resp = requests.delete(url, headers=headers, json=params)
    return resp


def query_task_status(task_id):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/task-status/')
    resp = requests.get(url, headers=headers, params={'task_id': task_id})
    return resp


def query_library_index_state(repo_id):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/library-index-state/')
    resp = requests.get(url, headers=headers, params={'repo_id': repo_id})
    return resp


def get_file_download_token(repo_id, file_id, username):
    return seafile_api.get_fileserver_access_token(repo_id, file_id, 'download', username, use_onetime=True)


def get_latest_commit_id(repo_id):
    commit = seafile_api.get_commit_list(repo_id, 0, 1)
    return commit[0].id
