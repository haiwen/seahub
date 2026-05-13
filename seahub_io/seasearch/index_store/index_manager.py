import logging
import time
from datetime import datetime

from seahub_io.seasearch.utils import need_index_metadata_info
from seahub_io.db import init_db_session_class
from seahub_io.seasearch.utils.constants import ZERO_OBJ_ID, REPO_FILE_INDEX_PREFIX, \
    WIKI_INDEX_PREFIX
from seahub_io.repo_metadata.metadata_server_api import MetadataServerAPI
from seahub_io.repo_metadata.constants import METADATA_TABLE
from seahub_io.utils import timestamp_to_isoformat_timestr

from seahub_io.repo_metadata.utils import query_metadata_rows

logger = logging.getLogger('seasearch')


class IndexManager(object):

    def __init__(self):
        self.session = init_db_session_class()
        self.metadata_server_api = MetadataServerAPI('seahub_io')

    def update_library_file_index(self, repo_id, commit_id, repo_file_index, repo_status_file_index, metadata_query_time):
        try:
            new_commit_id = commit_id
            index_name = REPO_FILE_INDEX_PREFIX + repo_id

            repo_file_index.create_index_if_missing(index_name)

            repo_status = repo_status_file_index.get_repo_status_by_id(repo_id)
            from_commit = repo_status.from_commit
            to_commit = repo_status.to_commit
            metadata_last_updated_time = repo_status.metadata_updated_time

            if not from_commit:
                commit_id = ZERO_OBJ_ID
            else:
                commit_id = from_commit

            rows = []
            need_index_metadata = need_index_metadata_info(repo_id, self.session)
            if need_index_metadata:
                if not metadata_last_updated_time:
                    metadata_last_updated_time = datetime(1970, 1, 1).timestamp()
                last_update_time = timestamp_to_isoformat_timestr(float(metadata_last_updated_time))
                sql = f"SELECT `_id`, `_mtime`, `_description`, `_parent_dir`, `_name`, `_obj_id`, `_file_mtime`, `_size` FROM `{METADATA_TABLE.name}` WHERE `_is_dir` = False AND `_mtime` >= '{last_update_time}'"
                rows = query_metadata_rows(repo_id, self.metadata_server_api, sql)
            else:
                metadata_query_time = None

            if not rows and new_commit_id == commit_id:
                return

            if repo_status.need_recovery():
                logger.warning('%s: repo file index inrecovery', repo_id)
                repo_file_index.update(index_name, repo_id, commit_id, to_commit, rows, self.metadata_server_api, need_index_metadata)
                commit_id = to_commit
                time.sleep(1)

            try:
                repo_file_index.update_repo_name(index_name, repo_id)
            except Exception as e:
                logger.warning('update repo_name index failed, repo_id: %s, error: %s' % (repo_id, e))

            repo_status_file_index.begin_update_repo(repo_id, commit_id, new_commit_id, metadata_last_updated_time)
            repo_file_index.update(index_name, repo_id, commit_id, new_commit_id, rows, self.metadata_server_api, need_index_metadata)
            repo_status_file_index.finish_update_repo(repo_id, new_commit_id, metadata_query_time)

            logger.info('repo: %s, update repo file index success', repo_id)

        except Exception as e:
            logger.exception('repo_id: %s, update repo file index error: %s.', repo_id, e)

    def delete_repo_file_index(self, repo_id, repo_file_index, repo_status_file_index):
        # first delete repo_file_index
        repo_file_index_name = REPO_FILE_INDEX_PREFIX + repo_id
        repo_file_index.delete_index_by_index_name(repo_file_index_name)
        repo_status_file_index.delete_documents_by_repo(repo_id)

    def file_search(self, query, repos, repo_file_index, count, suffixes, search_path, obj_type, time_range, size_range, search_filename_only):
        return repo_file_index.search_files(repos, query, 0, count, suffixes, search_path, obj_type, time_range, size_range, search_filename_only)

    def delete_wiki_index(self, wiki_id, wiki_index, wiki_status_index):
        # first delete wiki_index
        wiki_index_name = WIKI_INDEX_PREFIX + wiki_id
        wiki_index.delete_index_by_index_name(wiki_index_name)
        wiki_status_index.delete_documents_by_repo(wiki_id)

    def search_wikis(self, query, wiki_ids, wiki_index, count):
        return wiki_index.search_wikis(wiki_ids, query, 0, count)

    def update_wiki_index(self, wiki_id, commit_id, wiki_index, wiki_status_index):
        try:
            new_commit_id = commit_id
            index_name = WIKI_INDEX_PREFIX + wiki_id

            wiki_index.create_index_if_missing(index_name)

            wiki_status = wiki_status_index.get_repo_status_by_id(wiki_id)
            from_commit = wiki_status.from_commit
            to_commit = wiki_status.to_commit

            if new_commit_id == from_commit:
                return

            if not from_commit:
                commit_id = ZERO_OBJ_ID
            else:
                commit_id = from_commit

            if wiki_status.need_recovery():
                logger.warning('%s: wiki index inrecovery', wiki_id)
                wiki_index.update(index_name, wiki_id, commit_id, to_commit)
                commit_id = to_commit
                time.sleep(1)
            wiki_status_index.begin_update_repo(wiki_id, commit_id, new_commit_id)
            wiki_index.update(index_name, wiki_id, commit_id, new_commit_id)
            wiki_status_index.finish_update_repo(wiki_id, new_commit_id)

            logger.info('wiki: %s, update wiki index success', wiki_id)

        except Exception as e:
            logger.exception('wiki_id: %s, update wiki index error: %s.', wiki_id, e)
