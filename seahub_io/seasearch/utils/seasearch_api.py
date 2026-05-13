import json
import logging
import requests

logger = logging.getLogger(__name__)


def parse_response(response):
    if response.status_code == 400:
        logger.warning('seasearch error: %s', response.text)
    if response.status_code > 400:
        raise ConnectionError(response.status_code, response.text)
    else:
        try:
            return json.loads(response.text)
        except:
            pass


class Encoder(json.JSONEncoder):
    def encode(self, obj, *args, **kwargs):
        lines = []
        for each in obj:
            line = super(Encoder, self).encode(each, *args, **kwargs)
            lines.append(line)
        return '\n'.join(lines)


def ndjson_dumps(*args, **kwargs):
    """
    dumps data to ndjson format as seasearch parameter
    """
    kwargs.setdefault('cls', Encoder)
    return json.dumps(*args, **kwargs)


class SeaSearchAPI(object):

    def __init__(self, server, token, timeout=180):
        self.token = token
        self.server = server
        self.timeout = timeout
        self.gen_header()

    def gen_header(self):
        self.headers = {
            'Authorization': 'Basic ' + self.token
        }

    def create_index(self, index_name, data):
        url = self.server + '/api/index/' + index_name
        response = requests.put(url, headers=self.headers, json=data, timeout=self.timeout)
        if response.status_code == 400:
            raise Exception('create index: %s, error: %s' % (index_name, response.text))
        data = parse_response(response)

        return data

    def create_document_by_id(self, index_name, doc_id, data):
        url = self.server + '/api/' + index_name + '/_doc/' + doc_id
        response = requests.put(url, headers=self.headers, json=data, timeout=self.timeout)
        if response.status_code == 400:
            raise Exception('index: %s, add document: %s, error: %s' % (index_name, doc_id, response.text))
        data = parse_response(response)

        return data

    def bulk(self, index_name, data):
        """
        this option includes add, update and delete index or document
        """
        url = self.server + '/es/' + index_name + '/_bulk'
        data = ndjson_dumps(data)
        response = requests.post(url, headers=self.headers, data=data, timeout=self.timeout)
        data = parse_response(response)
        error = data.get('error')
        if error:
            raise Exception(error)
        return data

    def vector_search(self, index_name, data):
        url = self.server + '/api/' + index_name + '/_search/vector'
        response = requests.post(url, headers=self.headers, json=data, timeout=self.timeout)

        return parse_response(response)

    def normal_search(self, index_name, data):
        url = self.server + '/es/' + index_name + '/_search'
        response = requests.post(url, headers=self.headers, json=data, timeout=self.timeout)

        return parse_response(response)

    def m_search(self, data, unify_score=True):
        url = self.server + '/es/_msearch'
        if unify_score:
            url += '?unify_score=true'
        data = ndjson_dumps(data)
        response = requests.post(url, headers=self.headers, data=data, timeout=self.timeout)
        return parse_response(response)

    def unified_search(self, data):
        url = self.server + '/api/unified_search'
        response = requests.post(url, headers=self.headers, data=data, timeout=self.timeout)
        return parse_response(response)

    def check_index_mapping(self, index_name):
        url = self.server + '/es/' + index_name + '/_mapping'
        response = requests.get(url, headers=self.headers, timeout=self.timeout)
        if response.status_code == 400:
            return {'is_exist': False}
        elif response.status_code > 400:
            raise ConnectionError(response.status_code, response.text)

        return {'is_exist': True}

    def check_document_by_id(self, index_name, doc_id):
        url = self.server + '/api/' + index_name + '/_doc/' + doc_id
        response = requests.get(url, headers=self.headers, timeout=self.timeout)
        if response.status_code == 400:
            return {'is_exist': False}
        elif response.status_code > 400:
            raise ConnectionError(response.status_code, response.text)

        return {'is_exist': True}

    def get_document_by_id(self, index_name, doc_id):
        url = self.server + '/api/' + index_name + '/_doc/' + doc_id
        response = requests.get(url, headers=self.headers, timeout=self.timeout)
        return parse_response(response)

    def delete_document_by_id(self, index_name, doc_id):
        url = self.server + '/api/' + index_name + '/_doc/' + doc_id
        response = requests.delete(url, headers=self.headers, timeout=self.timeout)
        data = parse_response(response)
        error = data.get('error')
        if error:
            logger.warning('delete_document_by_id error: %s', error)
        return data

    def delete_index_by_name(self, index_name):
        url = self.server + '/api/index/' + index_name
        response = requests.delete(url, headers=self.headers, timeout=self.timeout)
        if response.status_code == 400:
            logger.warning('index: %s not exist error: %s' % (index_name, response.text))
        elif response.status_code > 400:
            raise ConnectionError(response.status_code, response.text)
        return json.loads(response.text)

    def update_document_by_id(self, index_name, doc_id, data):
        url = self.server + '/api/' + index_name + '/_doc/' + doc_id
        response = requests.put(url, headers=self.headers, json=data, timeout=self.timeout)
        data = parse_response(response)
        error = data.get('error')
        if error:
            raise Exception(error)
        return data
