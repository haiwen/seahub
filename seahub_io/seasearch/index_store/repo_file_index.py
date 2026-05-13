import json
import os
import logging

from seahub_io.seasearch.utils import get_library_diff_files, md5, is_sys_dir_or_file
from seahub_io.seasearch.utils.constants import REPO_FILE_INDEX_PREFIX
from seahub_io.repo_metadata.constants import METADATA_TABLE
from seahub_io.repo_metadata.utils import get_metadata_by_obj_ids
from seahub_io.utils import get_opt_from_conf_or_env, parse_bool
from seahub_io.seasearch.utils.extract import ExtractorFactory
from seahub_io.utils import isoformat_timestr_to_timestamp

logger = logging.getLogger('seasearch')

SEASEARCH_BULK_OPETATE_LIMIT = 100
INDEX_CONTENT_LENGTH_LIMIT = 10000


class RepoFileIndex(object):
    mapping = {
        'properties': {
            'repo_id': {
                'type': 'keyword',
            },
            'path': {
                'type': 'keyword'
            },
            'filename': {
                'type': 'text',
                'fields': {
                    'ngram': {
                        'type': 'text',
                        'index': True,
                        'analyzer': 'seafile_file_name_ngram_analyzer',
                    },
                },
            },
            'description': {
                'type': 'text',
                'analyzer': 'standard'
            },
            'content': {
                'type': 'text',
                'analyzer': 'gse_standard_analyzer',
                'highlightable': True
            },
            'suffix': {
                'type': 'keyword'
            },
            'is_dir': {
                'type': 'boolean',
            },
            'mtime': {
                'type': 'date',
                'format': 'epoch_millis'
            },
            'size': {
                'type': 'numeric'
            }
        }
    }
    """
    gse_standard_analyzer is for support Chinese text tokenization, but it supports tokenization for English/German/French as well:
    1. It splits English sentences by spaces/punctuation
    2. Example: The sentence "Hello world" will be tokenized into ["hello", "world"]
    3. This meets the basic retrieval needs for English content (e.g., search "hello" can match the text containing "hello")
    """
    index_settings = {
        'analysis': {
            'analyzer': {
                'seafile_file_name_ngram_analyzer': {
                    'type': 'custom',
                    'tokenizer': 'seafile_file_name_ngram_tokenizer',
                    'filter': [
                        'lowercase',
                    ],
                },
                'gse_standard_analyzer': {
                    'type': 'gse_standard',
                    "char_filter": [
                        "gse_filter"
                    ]
                },
            },
            "char_filter": {
                "gse_filter": {
                    "type": "mapping",
                    "mappings": [
                        "\n =>  "
                    ]
                }
            },
            'tokenizer': {
                'seafile_file_name_ngram_tokenizer': {
                    'type': 'ngram',
                    'min_gram': 4,
                    'max_gram': 4,
                    'token_chars': [
                        'letter',
                        'digit'
                    ]
                }
            }
        }
    }

    def __init__(self, seasearch_api, repo_data, shard_num, config):
        self.seasearch_api = seasearch_api
        self.repo_data = repo_data
        self.shard_num = shard_num
        self.text_size_limit = 1 * 1024 * 1024  # 1M
        self.office_file_size_limit = 10 * 1024 * 1024  # 10M
        self.index_office_pdf = False

        self.config = config

        self._parse_config()

    def _parse_config(self):
        section_name = 'SEASEARCH'
        self.office_file_size_limit = get_opt_from_conf_or_env(
            self.config, section_name, 'office_file_size_limit', default=int(10)
        ) * 1024 * 1024

        index_office_pdf = get_opt_from_conf_or_env(self.config, section_name, 'index_office_pdf', default=False)
        self.index_office_pdf = parse_bool(index_office_pdf)

    def create_index_if_missing(self, index_name):
        if not self.seasearch_api.check_index_mapping(index_name).get('is_exist'):
            data = {
                'shard_num': self.shard_num,
                'mappings': self.mapping,
                'settings': self.index_settings
            }
            self.seasearch_api.create_index(index_name, data)

    def check_index(self, index_name):
        return self.seasearch_api.check_index_mapping(index_name).get('is_exist')

    def _make_query_searches(self, keyword, search_filename_only):
        match_query_kwargs = {'minimum_should_match': '-25%'}

        def _make_match_query(field, key_word, **kw):
            q = {'query': key_word}
            q.update(kw)
            return {'match': {field: q}}

        searches = []
        searches.append(_make_match_query('filename', keyword, **match_query_kwargs))
        searches.append({
            'match': {
                'filename.ngram': {
                    'query': keyword,
                    'minimum_should_match': '80%',
                }
            }
        })
        if not search_filename_only:
            searches.append(_make_match_query('content', keyword, **match_query_kwargs))
            searches.append(_make_match_query('description', keyword, **match_query_kwargs))

        return searches

    def _ensure_filter_exists(self, query_map):
        if 'filter' not in query_map['bool']:
            query_map['bool']['filter'] = []
        return query_map

    def _add_path_filter(self, query_map, search_path):
        if search_path is None:
            return query_map

        query_map = self._ensure_filter_exists(query_map)
        query_map['bool']['filter'].append({'prefix': {'path': search_path}})
        return query_map

    def _add_suffix_filter(self, query_map, suffixes):
        if suffixes is None:
            return query_map

        query_map = self._ensure_filter_exists(query_map)

        if isinstance(suffixes, list):
            suffixes = [x.lower() for x in suffixes]
            query_map['bool']['filter'].append({'terms': {'suffix': suffixes}})
        else:
            query_map['bool']['filter'].append({'term': {'suffix': suffixes.lower()}})
        return query_map

    def _add_obj_type_filter(self, query_map, obj_type):
        if obj_type is None:
            return query_map

        query_map = self._ensure_filter_exists(query_map)

        query_map['bool']['filter'].append({'term': {'is_dir': obj_type == 'dir'}})
        return query_map

    def is_valid_range(self, data_range):
        if not isinstance(data_range, list):
            return False
        if len(data_range) != 2:
            return False
        if all(e is None for e in data_range):
            return False
        return True

    def _add_time_range_filter(self, query_map, time_range):
        if not self.is_valid_range(time_range):
            return query_map
        search_content = {}
        time_from = time_range[0] * 1000
        time_to = time_range[1] * 1000
        if time_from:
            search_content['gte'] = time_from
        if time_to:
            search_content['lte'] = time_to
        query_map = self._ensure_filter_exists(query_map)
        query_map['bool']['filter'].append({'range': {'mtime': search_content}})
        return query_map

    def _add_size_range_filter(self, query_map, size_range):
        if not self.is_valid_range(size_range):
            return query_map

        search_content = {}
        size_from = size_range[0]
        size_to = size_range[1]
        if size_from:
            search_content['gte'] = size_from
        if size_to:
            search_content['lte'] = size_to
        query_map = self._ensure_filter_exists(query_map)
        query_map['bool']['filter'].append({'range': {'size': search_content}})
        return query_map

    def search_files(self, repos, keyword, start=0, size=10, suffixes=None, search_path=None, obj_type=None,
                     time_range=None, size_range=None, search_filename_only=None):
        bulk_search_params = []
        for repo in repos:
            repo_id = repo[0]
            origin_repo_id = repo[1]
            origin_path = repo[2]
            query_map = {'bool': {}}
            if keyword:
                searches = self._make_query_searches(keyword, search_filename_only)
                query_map['bool']['should'] = searches

            if origin_repo_id:
                repo_id = origin_repo_id
                if search_path:
                    search_path = os.path.join(origin_path, search_path.strip('/'))
                else:
                    search_path = origin_path

            query_map = self._add_suffix_filter(query_map, suffixes)
            query_map = self._add_path_filter(query_map, search_path)
            query_map = self._add_obj_type_filter(query_map, obj_type)

            query_map = self._add_time_range_filter(query_map, time_range)
            query_map = self._add_size_range_filter(query_map, size_range)

            data = {
                'from': start,
                'size': size,
                '_source': ['path', 'repo_id', 'filename', 'is_dir', 'mtime', 'size'],
                'sort': ['_score'],
                'highlight': {
                    'pre_tags': ['<mark>'],
                    'post_tags': ['</mark>'],
                    'fields': {'content': {}},
                }
            }
            if query_map.get('bool'):
                query_map['bool']['minimum_should_match'] = 1
                data['query'] = query_map

            index_name = REPO_FILE_INDEX_PREFIX + repo_id
            repo_query_info = {
                'index': index_name,
                'query': data
            }
            bulk_search_params.append(repo_query_info)

            search_path = None
        query_body = json.dumps({
            'index_queries': bulk_search_params
        })
        results = self.seasearch_api.unified_search(query_body)
        files = []

        hits = results.get('hits', []).get('hits', [])
        total = results.get('hits', {}).get('total', {}).get('value', 0)

        if not hits:
            return files

        for hit in hits:
            source = hit.get('_source')
            score = hit.get('_score')
            _id = hit.get('_id')
            mtime = source['mtime'] / 1000 if source['mtime'] is not None else 0
            r = {
                'repo_id': source['repo_id'],
                'fullpath': source['path'],
                'name': os.path.basename(source['path']),
                'is_dir': source['is_dir'],
                'score': score,
                '_id': _id,
                'mtime': mtime,
                'size': source['size'],
            }
            if highlight_content := hit.get('highlight', {}).get('content', [None])[0]:
                r.update(content=highlight_content)
            files.append(r)

        logger.debug('search keyword: %s, search path: %s, in repos: %s , \nsearch result: %s', keyword, search_path,
                    repos, files)

        return files

    @staticmethod
    def get_file_suffix(path):
        try:
            name = os.path.basename(path)
            suffix = os.path.splitext(name)[1][1:]
            if suffix:
                return suffix.lower()
            return None
        except:
            return None

    def add_files(self, index_name, repo_id, files, path_to_metadata_row, version):
        bulk_add_params = []
        for file_info in files:
            path = file_info[0]
            obj_id = file_info[1]
            mtime = file_info[2] * 1000
            size = file_info[3]

            if is_sys_dir_or_file(path):
                continue

            if not mtime:
                mtime = None

            suffix = self.get_file_suffix(path)
            filename = os.path.basename(path)
            if suffix:
                filename = filename[:-len(suffix)-1]

            index_info = {'index': {'_index': index_name, '_id': md5(path)}}
            metadata_row = path_to_metadata_row.get(path, {})
            doc_info = {
                'repo_id': repo_id,
                'path': path,
                'suffix': suffix,
                'filename': filename,
                'description': metadata_row.get('_description', ''),
                'is_dir': False,
                'mtime': mtime,
                'size': size,
            }

            content = self.parse_content(repo_id, path, size, obj_id, version)

            if content:
                content = content[:INDEX_CONTENT_LENGTH_LIMIT]
            doc_info['content'] = content
            bulk_add_params.append(index_info)
            bulk_add_params.append(doc_info)

            if len(bulk_add_params) >= SEASEARCH_BULK_OPETATE_LIMIT:
                self.seasearch_api.bulk(index_name, bulk_add_params)
                bulk_add_params = []
        if bulk_add_params:
            self.seasearch_api.bulk(index_name, bulk_add_params)

    def check_file_size_limit(self, path, size):
        from seahub_io.seasearch.utils.extract import is_text_file, is_office_pdf

        if is_text_file(path):
            return size <= self.text_size_limit
        elif is_office_pdf(path):
            return size <= self.office_file_size_limit
        else:
            return False

    def parse_content(self, repo_id, path, size, obj_id, version):
        if not self.index_office_pdf:
            return None
        if not self.check_file_size_limit(path, size):
            logger.warning("repo_id: %s, file %s size exceeds limit", repo_id, path)
            content = None
        else:
            extractor = ExtractorFactory.get_extractor(os.path.basename(path))
            content = extractor.extract(repo_id, version, obj_id, path) if extractor else None
        return content

    def add_dirs(self, index_name, repo_id, dirs):
        bulk_add_params = []
        for dir in dirs:
            path = dir[0]
            obj_id = dir[1]
            mtime = dir[2] * 1000
            size = dir[3]

            if is_sys_dir_or_file(path):
                continue

            if path == '/':
                continue
            else:
                filename = os.path.basename(path)

            if not mtime:
                mtime = None

            path = path + '/' if path != '/' else path
            index_info = {'index': {'_index': index_name, '_id': md5(path)}}
            doc_info = {
                'repo_id': repo_id,
                'path': path,
                'suffix': None,
                'filename': filename,
                'is_dir': True,
                'content': None,
                'mtime': mtime,
                'size': None,
            }
            bulk_add_params.append(index_info)
            bulk_add_params.append(doc_info)

            if len(bulk_add_params) >= SEASEARCH_BULK_OPETATE_LIMIT:
                self.seasearch_api.bulk(index_name, bulk_add_params)
                bulk_add_params = []
        if bulk_add_params:
            self.seasearch_api.bulk(index_name, bulk_add_params)

    def delete_files(self, index_name, files):
        delete_params = []
        for file in files:
            path = file[0]
            if is_sys_dir_or_file(path):
                continue
            delete_params.append({'delete': {'_id': md5(path), '_index': index_name}})
            if len(delete_params) >= SEASEARCH_BULK_OPETATE_LIMIT:
                self.seasearch_api.bulk(index_name, delete_params)
                delete_params = []
        if delete_params:
            self.seasearch_api.bulk(index_name, delete_params)

    def delete_dirs(self, index_name, dirs):
        delete_params = []
        for dir in dirs:
            path = dir

            if is_sys_dir_or_file(path):
                continue
            path = path + '/' if path != '/' else path
            delete_params.append({'delete': {'_id': md5(path), '_index': index_name}})
            if len(delete_params) >= SEASEARCH_BULK_OPETATE_LIMIT:
                self.seasearch_api.bulk(index_name, delete_params)
                delete_params = []
        if delete_params:
            self.seasearch_api.bulk(index_name, delete_params)

    def query_data_by_dir(self, index_name, directory, start, size):
        dsl = {
            "query": {
                "bool": {
                    "filter": [
                        {"prefix": {"path": directory}}
                    ]
                }
            },
            "from": start,
            "size": size,
            "_source": ["path"],
            "sort": ["-@timestamp"],  # sort is for getting data ordered
        }

        hits, total = self.normal_search(index_name, dsl)
        return hits, total

    def query_data_by_paths(self, index_name, paths, start, size):
        dsl = {
            "query": {
                "bool": {
                    "filter": [
                        {
                            "terms": {
                                "path": paths
                            }
                        }
                    ]
                }
            },
            "from": start,
            "size": size,
            "_source": ["path"],
            "sort": ["-@timestamp"],  # sort is for getting data ordered
        }

        hits, total = self.normal_search(index_name, dsl)
        return hits, total

    def normal_search(self, index_name, dsl):
        doc_item = self.seasearch_api.normal_search(index_name, dsl)
        total = doc_item['hits']['total']['value']

        return doc_item['hits']['hits'], total

    def delete_files_by_deleted_dirs(self, index_name, dirs):
        for directory in dirs:
            if is_sys_dir_or_file(directory):
                continue
            per_size = SEASEARCH_BULK_OPETATE_LIMIT
            start = 0
            delete_params = []
            while True:
                hits, total = self.query_data_by_dir(index_name, directory, start, per_size)
                for hit in hits:
                    _id = hit['_id']
                    delete_params.append({'delete': {'_id': _id, '_index': index_name}})

                if delete_params:
                    self.seasearch_api.bulk(index_name, delete_params)
                if len(hits) < per_size:
                    break

    def filter_exist_paths(self, index_name, paths):
        exist_paths = []
        per_size = SEASEARCH_BULK_OPETATE_LIMIT
        start = 0
        for i in range(0, len(paths), per_size):
            hits, total = self.query_data_by_paths(index_name, paths[i: i + per_size], start, per_size)
            for hit in hits:
                source = hit.get('_source')
                exist_paths.append(source['path'])

        return exist_paths

    def update(self, index_name, repo_id, old_commit_id, new_commit_id, metadata_rows, metadata_server_api, need_index_metadata):
        added_files, deleted_files, modified_files, added_dirs, deleted_dirs, version = \
            get_library_diff_files(repo_id, old_commit_id, new_commit_id)

        need_deleted_files = deleted_files
        self.delete_files(index_name, need_deleted_files)

        self.delete_dirs(index_name, deleted_dirs)

        self.delete_files_by_deleted_dirs(index_name, deleted_dirs)

        need_added_files = added_files + modified_files

        need_update_metadata_files, path_to_metadata_row = [], {}
        if need_index_metadata:
            need_update_metadata_files, path_to_metadata_row = self.cal_metadata_files(index_name, repo_id, metadata_rows, need_added_files, metadata_server_api)

        self.add_files(index_name, repo_id, need_added_files + need_update_metadata_files, path_to_metadata_row, version)

        self.add_dirs(index_name, repo_id, added_dirs)

    def update_repo_name(self, index_name, repo_id):
        repo = self.repo_data.get_repo_name_mtime_size(repo_id)
        if not repo:
            return
        path = '/'
        bulk_add_params = []
        index_info = {'index': {'_index': index_name, '_id': md5(path)}}
        doc_info = {
            'repo_id': repo_id,
            'path': path,
            'suffix': None,
            'filename': repo[0]['name'],
            'is_dir': True,
            'content': None,
            'mtime': repo[0]['update_time'] * 1000,
            'size': None,
        }
        bulk_add_params.append(index_info)
        bulk_add_params.append(doc_info)

        self.seasearch_api.bulk(index_name, bulk_add_params)

    def delete_index_by_index_name(self, index_name):
        self.seasearch_api.delete_index_by_name(index_name)

    def cal_metadata_files(self, index_name, repo_id, metadata_rows, need_added_files, metadata_server_api):
        metadata_files = []
        path_to_metadata_row = {}
        metadate_file_obj_ids = []
        need_added_paths = {item[0] for item in need_added_files}
        for row in metadata_rows:
            path = os.path.join(row[METADATA_TABLE.columns.parent_dir.name], row[METADATA_TABLE.columns.file_name.name])
            mtime = isoformat_timestr_to_timestamp(row[METADATA_TABLE.columns.file_mtime.name])
            size = row[METADATA_TABLE.columns.size.name]
            path_to_metadata_row[path] = row
            metadate_file_obj_ids.append(row['_obj_id'])
            if path not in need_added_paths:
                metadata_files.append([path, row['_obj_id'], mtime, size])

        added_files_lacked_obj_ids = [file_info[1] for file_info in need_added_files if file_info[1] not in metadate_file_obj_ids]
        added_files_lacked_rows = get_metadata_by_obj_ids(repo_id, added_files_lacked_obj_ids,
                                                          metadata_server_api) if added_files_lacked_obj_ids else []
        if not added_files_lacked_rows:
            added_files_lacked_rows = []

        for row in added_files_lacked_rows:
            path = os.path.join(row[METADATA_TABLE.columns.parent_dir.name], row[METADATA_TABLE.columns.file_name.name])
            if path not in need_added_paths:
                continue
            path_to_metadata_row[path] = row

        paths = self.filter_exist_paths(index_name, [item[0] for item in metadata_files])
        need_update_metadata_files = [item for item in metadata_files if item[0] in paths]
        return need_update_metadata_files, path_to_metadata_row
