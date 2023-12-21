import logging
import requests
import jwt
import time
from urllib.parse import urljoin

from seahub.settings import SEAFILE_AI_SERVER_URL, SEAFILE_AI_SECRET_KEY
from seahub.utils import get_user_repos

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


def search(params):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/search/')
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


def get_search_repos(username, org_id):
    repos = []
    owned_repos, shared_repos, group_repos, public_repos = get_user_repos(username, org_id=org_id)
    repo_list = owned_repos + shared_repos + group_repos + public_repos

    for repo in repo_list:
        repos.append((repo.id, repo.origin_repo_id, repo.origin_path))

    return repos
