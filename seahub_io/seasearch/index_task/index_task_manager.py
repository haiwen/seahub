import logging

from seahub_io.seasearch.index_store.index_manager import IndexManager
from seahub_io.seasearch.index_store.repo_file_index import RepoFileIndex
from seahub_io.seasearch.index_store.wiki_index import WikiIndex
from seahub_io.seasearch.utils.seasearch_api import SeaSearchAPI
from seahub_io.utils import parse_bool, get_opt_from_conf_or_env


logger = logging.getLogger('seasearch')


class IndexTaskManager:
    def __init__(self):
        self.enabled = False

        self.seasearch_api = None
        self._repo_data = None
        self.index_manager = None
        self._repo_file_index = None
        self._wiki_index = None

    def init(self, config):
        self._parse_config(config)

    def _parse_config(self, config):
        """Parse file index update related parts of events.conf"""
        section_name = 'SEASEARCH'
        key_enabled = 'enabled'

        if not config.has_section(section_name):
            return

        # [ enabled ]
        enabled = get_opt_from_conf_or_env(config, section_name, key_enabled, default=False)
        enabled = parse_bool(enabled)
        if not enabled:
            return
        self.enabled = True

        seasearch_url = get_opt_from_conf_or_env(
            config, section_name, 'seasearch_url'
        )
        seasearch_token = get_opt_from_conf_or_env(
            config, section_name, 'seasearch_token'
        )
        
        self.seasearch_api = SeaSearchAPI(
            seasearch_url,
            seasearch_token,
        )
        self.index_manager = IndexManager()
        self._repo_file_index = RepoFileIndex(
            self.seasearch_api,
        )
        self._wiki_index = WikiIndex(
            self.seasearch_api,
        )

    def file_search(self, query, repos, count, suffixes, search_path, obj_type, time_range, size_range, search_filename_only):
        return self.index_manager.file_search(
            query, repos, self._repo_file_index, count, suffixes, search_path, obj_type, time_range, size_range, search_filename_only
        )

    def search_wikis(self, query, wiki_ids, count):
        return self.index_manager.search_wikis(query, wiki_ids, self._wiki_index, count)

index_task_manager = IndexTaskManager()
