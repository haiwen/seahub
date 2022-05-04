# Copyright (c) 2012-2016 Seafile Ltd.

import logging
import os

from seahub.settings import EVENTS_CONFIG_FILE, CLOUD_MODE
from seahub.utils.file_types import IMAGE, DOCUMENT, SPREADSHEET, SVG, PDF, \
        MARKDOWN, VIDEO, AUDIO, TEXT
from seahub.utils import get_user_repos
from seahub.base.templatetags.seahub_tags import email2nickname, \
    email2contact_email

import seaserv
from seaserv import seafile_api

os.environ['EVENTS_CONFIG_FILE'] = EVENTS_CONFIG_FILE
from seafes import es_search

# Get an instance of a logger
logger = logging.getLogger(__name__)


# Decoupled from saehub's variable
SEARCH_FILEEXT = {
    TEXT: ('ac', 'am', 'bat', 'c', 'cc', 'cmake', 'cpp', 'cs', 'css', 'diff', 'el', 'h', 'html', 'htm', 'java', 'js', 'json', 'less', 'make', 'org', 'php', 'pl', 'properties', 'py', 'rb', 'scala', 'script', 'sh', 'sql', 'txt', 'text', 'tex', 'vi', 'vim', 'xhtml', 'xml', 'log', 'csv', 'groovy', 'rst', 'patch', 'go'),
    IMAGE: ('gif', 'jpeg', 'jpg', 'png', 'ico', 'bmp', 'tif', 'tiff', 'eps'),
    DOCUMENT: ('doc', 'docx', 'ppt', 'pptx', 'odt', 'fodt', 'odp', 'fodp'),
    SPREADSHEET: ('xls', 'xlsx', 'ods', 'fods'),
    SVG: ('svg',),
    PDF: ('pdf',),
    MARKDOWN: ('markdown', 'md'),
    VIDEO: ('mp4', 'ogv', 'webm', 'mov'),
    AUDIO: ('mp3', 'oga', 'ogg'),
    '3D': ('stl', 'obj'),
}

def get_owned_repos(username, org_id=None):
    if org_id is None:
        owned_repos = seafile_api.get_owned_repo_list(username)
    else:
        owned_repos = seafile_api.get_org_owned_repo_list(org_id, username)

    return owned_repos

def get_shared_repos(username, org_id=None):
    if org_id is None:
        shared_repos = seafile_api.get_share_in_repo_list(username, -1, -1)
    else:
        shared_repos = seafile_api.get_org_share_in_repo_list(org_id, username, -1, -1)

    return shared_repos

def get_group_repos(username, org_id=None):
    if org_id is None:
        groups_repos = seafile_api.get_group_repos_by_user(username)
    else:
        groups_repos = seafile_api.get_org_group_repos_by_user(username, org_id)

    return groups_repos

def get_public_repos(username, org_id=None):
    if org_id is None:
        if CLOUD_MODE:
            public_repos = []
        else:
            public_repos = seaserv.list_inner_pub_repos(username)
    else:
        public_repos = seaserv.seafserv_threaded_rpc.list_org_inner_pub_repos(org_id)

    return public_repos

def get_search_repos_map(search_repo, username, org_id, shared_from, not_shared_from):

    # for getting repo type map
    def get_repo_type_map(repo_list, repo_type):
        repo_type_map = {}
        for repo in repo_list:
            repo_type_map[repo.id] = repo_type

        return repo_type_map

    repo_id_map = {}
    repo_type_map = {}

    if search_repo == 'mine':

        repo_list = get_owned_repos(username, org_id=org_id)
        repo_type_map = get_repo_type_map(repo_list, search_repo)

    elif search_repo == 'shared':

        repo_list = get_shared_repos(username, org_id=org_id)
        if shared_from:
            repo_list = [r for r in repo_list if r.user == shared_from]
        if not_shared_from:
            repo_list = [r for r in repo_list if r.user != not_shared_from]

        repo_type_map = get_repo_type_map(repo_list, search_repo)

    elif search_repo == 'group':

        repo_list = get_group_repos(username, org_id=org_id)
        repo_type_map = get_repo_type_map(repo_list, search_repo)

    elif search_repo == 'public':

        repo_list = get_public_repos(username, org_id=org_id)
        repo_type_map = get_repo_type_map(repo_list, search_repo)

    else:
        owned_repos, shared_repos, group_repos, public_repos = get_user_repos(
                username, org_id=org_id)
        repo_list = owned_repos + shared_repos + group_repos + public_repos

        # priority is group > public > mine(or shared)
        repo_type_map.update(get_repo_type_map(owned_repos, 'mine'))
        repo_type_map.update(get_repo_type_map(shared_repos, 'shared'))
        repo_type_map.update(get_repo_type_map(public_repos, 'public'))
        repo_type_map.update(get_repo_type_map(group_repos, 'group'))

    for repo in repo_list:
        subrepo_tag = False
        search_repo_id = repo.id
        if repo.origin_repo_id:
            search_repo_id = repo.origin_repo_id
            subrepo_tag = True
        # search priority: repo > subrepo
        if search_repo_id not in repo_id_map or subrepo_tag is False:
            repo_id_map[search_repo_id] = repo

    return repo_id_map, repo_type_map

def search_files(repos_map, search_path, keyword, obj_desc, start, size, org_id=None):
    # search file
    if len(repos_map) > 1:
        search_path = None
    files_found, total = es_search(repos_map, search_path, keyword, obj_desc, start, size)

    result = []
    for f in files_found:
        repo = repos_map.get(f['repo_id'], None)
        if not repo:
            continue

        if repo.origin_path:
            if not f['fullpath'].startswith(repo.origin_path):
                # this operation will reduce the result items, but it will not happen now
                continue
            else:
                f['repo_id'] = repo.repo_id
                f['fullpath'] = f['fullpath'].split(repo.origin_path)[-1]

        if not repo.owner:
            if org_id:
                repo.owner = seafile_api.get_org_repo_owner(repo.id)
            else:
                repo.owner = seafile_api.get_repo_owner(repo.id)

        # if match multiple files, keep the lookup only once.
        if not hasattr(repo, 'owner_nickname') or not repo.owner_nickname:
            repo.owner_nickname = email2nickname(repo.owner)

        if not hasattr(repo, 'owner_contact_email') or not repo.owner_contact_email:
            repo.owner_contact_email = email2contact_email(repo.owner)

        if f['fullpath'] == '/':
            f['last_modified_by'] = repo.last_modifier
            f['last_modified'] = repo.last_modify
            f['size'] = repo.size
        else:
            try:
                dirent = seafile_api.get_dirent_by_path(f['repo_id'], f['fullpath'])
            except Exception as e:
                logger.error(e)
                continue

            if not dirent:
                continue

            f['last_modified_by'] = dirent.modifier
            f['last_modified'] = dirent.mtime
            f['size'] = dirent.size

        f['repo'] = repo
        f['repo_name'] = repo.name
        f['repo_owner_email'] = repo.owner
        f['repo_owner_name'] = repo.owner_nickname
        f['repo_owner_contact_email'] = repo.owner_contact_email

        result.append(f)

    return result, total

def is_valid_date_type(data):
    try:
        data = int(data)
    except:
        return False
    else:
        return True

def is_valid_size_type(data):
    try:
        data = int(data)
        if data < 0:
            raise
    except:
        return False
    else:
        return True
