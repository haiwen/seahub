import logging
import requests
import jwt
import time
from urllib.parse import urljoin

from seahub.settings import SECRET_KEY, SEAFEVENTS_SERVER_URL
from seahub.utils import get_user_repos

from seaserv import seafile_api


logger = logging.getLogger(__name__)


SEARCH_REPOS_LIMIT = 200
RELATED_REPOS_PREFIX = 'RELATED_REPOS_'
RELATED_REPOS_CACHE_TIMEOUT = 2 * 60 * 60


def search(params):
    payload = {'exp': int(time.time()) + 300, }
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    headers = {"Authorization": "Token %s" % token}
    url = urljoin(SEAFEVENTS_SERVER_URL, '/search')
    resp = requests.post(url, json=params, headers=headers)
    return resp


def get_file_download_token(repo_id, file_id, username):
    return seafile_api.get_fileserver_access_token(repo_id, file_id, 'download', username, use_onetime=True)


def get_search_repos(username, org_id):
    repos = []
    owned_repos, shared_repos, group_repos, public_repos = get_user_repos(username, org_id=org_id)
    repo_list = owned_repos + public_repos + shared_repos + group_repos

    repo_id_set = set()
    for repo in repo_list:
        repo_id = repo.id
        if repo.origin_repo_id:
            repo_id = repo.origin_repo_id

        if repo_id in repo_id_set:
            continue
        repo_id_set.add(repo_id)
        repos.append((repo.id, repo.origin_repo_id, repo.origin_path, repo.name))

    return repos


def format_repos(repos):
    searched_repos = []
    repos_map = {}
    for repo in repos:
        real_repo_id = repo[0]
        origin_repo_id = repo[1]
        origin_path = repo[2]
        repo_name = repo[3]
        searched_repos.append((real_repo_id, origin_repo_id, origin_path))

        if origin_repo_id:
            repos_map[origin_repo_id] = (real_repo_id, origin_path, repo_name)
            continue
        repos_map[real_repo_id] = (real_repo_id, origin_path, repo_name)
    return searched_repos, repos_map
