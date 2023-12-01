import os
import logging
import requests
import jwt
import time
from urllib.parse import urljoin

from seahub.settings import SEAFILE_AI_SERVER_URL, SEAFILE_AI_SECRET_KEY

from seaserv import seafile_api
from seafobj import fs_mgr, commit_mgr
from seafobj.exceptions import GetObjectError


logger = logging.getLogger(__name__)

ZERO_OBJ_ID = '0000000000000000000000000000000000000000'
SUPPORT_FILE_TYPES = ['.sdoc']


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


def query_library_commit_info(repo_id):
    headers = gen_headers()
    url = urljoin(SEAFILE_AI_SERVER_URL, '/api/v1/library-commit-info/')
    resp = requests.get(url, headers=headers, params={'repo_id': repo_id})
    return resp


def get_file_download_token(repo_id, file_id, username):
    return seafile_api.get_fileserver_access_token(repo_id, file_id, 'download', username, use_onetime=True)


def get_latest_commit_id(repo_id):
    commit = seafile_api.get_commit_list(repo_id, 0, 1)
    return commit[0].id


def get_library_diff_files(repo_id, old_commit_id, new_commit_id, username):
    if old_commit_id == new_commit_id:
        return [], [], []

    old_root = None
    if old_commit_id:
        try:
            old_commit = commit_mgr.load_commit(repo_id, 0, old_commit_id)
            old_root = old_commit.root_id
        except GetObjectError as e:
            logger.debug(e)
            old_root = None

    try:
        new_commit = commit_mgr.load_commit(repo_id, 0, new_commit_id)
    except GetObjectError as e:
        # new commit should exists in the obj store
        logger.warning(e)
        return [], [], []

    new_root = new_commit.root_id
    version = new_commit.get_version()
    differ = CommitDiffer(repo_id, version, old_root, new_root, username)
    added_files, deleted_files, added_dirs, deleted_dirs, modified_files = differ.diff(new_commit.ctime)

    return added_files, deleted_files, modified_files


class CommitDiffer(object):
    def __init__(self, repo_id, version, root1, root2, username):
        self.repo_id = repo_id
        self.version = version
        self.root1 = root1
        self.root2 = root2
        self.username = username

    def diff(self, root2_time): # noqa: C901
        added_files = []
        deleted_files = []
        deleted_dirs = []
        modified_files = []
        added_dirs = []

        new_dirs = [] # (path, dir_id)
        queued_dirs = [] # (path, dir_id1, dir_id2)

        if ZERO_OBJ_ID == self.root1:
            self.root1 = None
        if ZERO_OBJ_ID == self.root2:
            self.root2 = None

        if self.root1 == self.root2:
            return (added_files, deleted_files, added_dirs, deleted_dirs,
                    modified_files)
        elif not self.root1:
            new_dirs.append(('/', self.root2, root2_time, None))
        elif not self.root2:
            deleted_dirs.append('/')
        else:
            queued_dirs.append(('/', self.root1, self.root2))

        while True:
            path = old_id = new_id = None
            try:
                path, old_id, new_id = queued_dirs.pop(0)
            except IndexError:
                break

            dir1 = fs_mgr.load_seafdir(self.repo_id, self.version, old_id)
            dir2 = fs_mgr.load_seafdir(self.repo_id, self.version, new_id)

            for dent in dir1.get_files_list():
                new_dent = dir2.lookup_dent(dent.name)
                if not new_dent or new_dent.type != dent.type:
                    if file_extension(dent.name) in SUPPORT_FILE_TYPES:
                        deleted_files.append((make_path(path, dent.name), ))
                else:
                    dir2.remove_entry(dent.name)
                    if new_dent.id == dent.id:
                        pass
                    else:
                        if file_extension(dent.name) in SUPPORT_FILE_TYPES:
                            modified_files.append(
                                (make_path(path, dent.name),
                                 new_dent.id,
                                 new_dent.mtime,
                                 new_dent.size,
                                 get_file_download_token(self.repo_id, new_dent.id, self.username)
                                 )
                            )

            added_files.extend(
                [
                    (make_path(path, dent.name),
                     dent.id,
                     dent.mtime,
                     dent.size,
                     get_file_download_token(self.repo_id, dent.id, self.username))
                    for dent in dir2.get_files_list()
                    if file_extension(dent.name) in SUPPORT_FILE_TYPES
                ]
            )

            for dent in dir1.get_subdirs_list():
                new_dent = dir2.lookup_dent(dent.name)
                if not new_dent or new_dent.type != dent.type:
                    deleted_dirs.append(make_path(path, dent.name))
                else:
                    dir2.remove_entry(dent.name)
                    if new_dent.id == dent.id:
                        pass
                    else:
                        queued_dirs.append((make_path(path, dent.name), dent.id, new_dent.id))

            new_dirs.extend([(make_path(path, dent.name), dent.id, dent.mtime, dent.size) for dent in dir2.get_subdirs_list()])

        while True:
            # Process newly added dirs and its sub-dirs, all files under
            # these dirs should be marked as added.
            path = obj_id = None
            try:
                path, obj_id, mtime, size = new_dirs.pop(0)
                added_dirs.append((path, obj_id, mtime, size))
            except IndexError:
                break
            d = fs_mgr.load_seafdir(self.repo_id, self.version, obj_id)
            added_files.extend(
                [
                    (make_path(path, dent.name),
                     dent.id,
                     dent.mtime,
                     dent.size,
                     get_file_download_token(self.repo_id, dent.id, self.username)
                     ) for dent in d.get_files_list()
                    if file_extension(dent.name) in SUPPORT_FILE_TYPES
                ]
            )

            new_dirs.extend([(make_path(path, dent.name), dent.id, dent.mtime, dent.size) for dent in d.get_subdirs_list()])

        return (added_files, deleted_files, added_dirs, deleted_dirs,
                modified_files)


def search_entry(entries, entryname):
    for name, obj_id in entries:
        if name == entryname:
            entries.remove((name, obj_id))
            return (name, obj_id)
    return (None, None)


def make_path(dirname, filename):
    if dirname == '/':
        return dirname + filename
    else:
        return '/'.join((dirname, filename))


def file_extension(filename):
    return os.path.splitext(filename)[1]
