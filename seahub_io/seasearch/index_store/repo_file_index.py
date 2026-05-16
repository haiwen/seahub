import json
import os
import logging

from seahub_io.seasearch.utils.constants import REPO_FILE_INDEX_PREFIX

logger = logging.getLogger('seasearch')

SEASEARCH_BULK_OPETATE_LIMIT = 100
INDEX_CONTENT_LENGTH_LIMIT = 10000


class RepoFileIndex(object):
    def __init__(self, seasearch_api):
        self.seasearch_api = seasearch_api
        
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

    
