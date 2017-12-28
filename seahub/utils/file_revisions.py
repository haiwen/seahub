# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8
import time
from seaserv import seafile_api
from seahub.settings import GET_FILE_HISTORY_TIMEOUT

def get_file_revisions_within_limit(repo_id, path, commit_id=None, limit=50):
    if not commit_id:
        repo = seafile_api.get_repo(repo_id)
        commit_id = repo.head_cmmt_id

    file_revisions = seafile_api.get_file_revisions(repo_id,
            commit_id, path, limit)
    next_start_commit = file_revisions[-1].next_start_commit
    return file_revisions[0:-1], next_start_commit

def get_file_revisions_after_renamed(repo_id, path):
    all_file_revisions = []
    repo = seafile_api.get_repo(repo_id)
    commit_id = repo.head_cmmt_id

    start_time = time.time()
    keep_on_search = True
    while keep_on_search:
        file_revisions = seafile_api.get_file_revisions(repo_id,
                commit_id, path, 50)

        all_file_revisions += file_revisions[0:-1]

        end_time = time.time()
        next_start_commit = file_revisions[-1].next_start_commit
        rev_renamed_old_path = file_revisions[-2].rev_renamed_old_path if \
                len(file_revisions) > 1 else None

        if not next_start_commit or \
                rev_renamed_old_path  or \
                end_time - start_time > GET_FILE_HISTORY_TIMEOUT:
            # have searched all commits or
            # found a file renamed/moved commit or
            # timeout
            keep_on_search = False
        else:
            # keep on searching, use next_start_commit
            # as the commit_id start to search
            commit_id = next_start_commit

    return all_file_revisions

def get_all_file_revisions(repo_id, path, commit_id=None):
    """ Only used for test revert file.

    py.test tests/api/endpoints/test_file_view.py::FileViewTest::test_can_revert_file
    """

    all_file_revisions = []

    if not commit_id:
        repo = seafile_api.get_repo(repo_id)
        commit_id = repo.head_cmmt_id

    file_revisions = seafile_api.get_file_revisions(repo_id,
            commit_id, path, -1)
    all_file_revisions += file_revisions

    # if commit's rev_renamed_old_path value not None, seafile will stop searching.
    # so always uses `rev_renamed_old_path` info.
    next_start_commit = file_revisions[-1].next_start_commit
    if next_start_commit:
        path = file_revisions[-2].rev_renamed_old_path if \
                len(file_revisions) > 1 else None
        file_revisions = get_all_file_revisions(repo_id, path,
                next_start_commit)
        all_file_revisions += file_revisions

    # from seafile_api:
    # @next_start_commit: commit_id for next page.
    # An extra commit which only contains @next_start_commit will be appended to the list.
    return all_file_revisions[0:-1]
