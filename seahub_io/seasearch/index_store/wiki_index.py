import logging
import json
from seahub_io.seasearch.utils.constants import WIKI_INDEX_PREFIX


logger = logging.getLogger('seasearch')


SEASEARCH_WIKI_BULK_ADD_LIMIT = 10
SEASEARCH_WIKI_BULK_DELETE_LIMIT = 50


class WikiIndex(object):
    def __init__(self, seasearch_api):
        self.seasearch_api = seasearch_api

    def _make_query_searches(self, keyword):
        match_query_kwargs = {'minimum_should_match': '-25%'}

        def _make_match_query(field, key_word, **kw):
            q = {'query': key_word}
            q.update(kw)
            return {'match': {field: q}}

        searches = []
        searches.append(_make_match_query('content', keyword, **match_query_kwargs))
        searches.append(_make_match_query('title', keyword, **match_query_kwargs))
        searches.append({
            'match': {
                'content.ngram': {
                    'query': keyword,
                    'minimum_should_match': '80%',
                }
            }
        })
        searches.append({
            'match': {
                'title.ngram': {
                    'query': keyword,
                    'minimum_should_match': '80%',
                }
            }
        })
        return searches

    
    def search_wikis(self, wiki_ids, keyword, start=0, size=10):
        bulk_search_params = []

        query_map = {'bool': {'should': [], 'minimum_should_match': 1}}
        searches = self._make_query_searches(keyword)
        query_map['bool']['should'] = searches

        data = {
            'query': query_map,
            'from': start,
            'size': size,
            '_source': ['wiki_id', 'doc_uuid', 'title'],
            'sort': ['_score'],
            "highlight": {
                "pre_tags": ["<mark>"],
                "post_tags": ["</mark>"],
                "fields": {"content": {}, "title": {}},
            },
        }

        # Add query for each wiki index
        for wiki_id in wiki_ids:
            index_name = WIKI_INDEX_PREFIX + wiki_id
            bulk_search_params.append({'index': index_name, 'query': data})

        query_body = json.dumps({
            'index_queries': bulk_search_params
        })

        results = self.seasearch_api.unified_search(query_body)
        wikis = []

        hits = results.get('hits', []).get('hits', [])
        total = results.get('hits', {}).get('total', {}).get('value', 0)

        if not hits:
            return wikis, 0

        for hit in hits:
            source = hit.get('_source')
            score = hit.get('_score')
            _id = hit.get('_id')
            r = {
                'doc_uuid': source['doc_uuid'],
                'wiki_id': source['wiki_id'],
                'score': score,
                '_id': _id,
                'title': source['title'],
            }
            if highlight_content := hit.get('highlight', {}).get('content', [None])[0]:
                r.update(content=highlight_content)
            if highlight_title := hit.get('highlight', {}).get('title', [None])[0]:
                r.update(title=highlight_title)
            wikis.append(r)

        return wikis, total

