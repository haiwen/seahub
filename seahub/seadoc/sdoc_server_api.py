import json
import requests

from seahub.settings import SEADOC_SERVER_URL
from seahub.seadoc.utils import gen_seadoc_access_token


def parse_response(response):
    if response.status_code >= 400:
        raise ConnectionError(response.status_code, response.text)
    else:
        try:
            data = json.loads(response.text)
            return data
        except:
            pass


class SdocServerAPI(object):

    def __init__(self, doc_uuid, filename, username, access_token=None):
        self.doc_uuid = doc_uuid
        self.filename = filename
        self.username = username
        self.headers = None
        self.sdoc_server_url = SEADOC_SERVER_URL.rstrip('/')
        self.timeout = 30
        if access_token:
            self.headers = {'Authorization': 'Token ' + access_token}
        else:
            self._init()

    def _init(self):
        sdoc_server_access_token = gen_seadoc_access_token(
            self.doc_uuid, self.filename, self.username)
        self.headers = {'Authorization': 'Token ' + sdoc_server_access_token}

    def internal_refresh_docs(self, doc_uuids):
        url = self.sdoc_server_url + '/api/v1/docs/' + self.doc_uuid + '/internal-refresh-docs/?from=seahub'
        data = {"doc_uuids" : doc_uuids}
        response = requests.post(url, json=data, headers=self.headers)
        return parse_response(response)

    def remove_doc(self):
        url = self.sdoc_server_url + '/api/v1/docs/' + self.doc_uuid + '/?from=seahub'
        response = requests.delete(url, headers=self.headers)
        return parse_response(response)
    
    def get_doc(self):
        url = self.sdoc_server_url + '/api/v1/docs/' + self.doc_uuid + '/?from=seahub'
        response = requests.get(url, headers=self.headers)
        return parse_response(response)

    def get_review_snapshot(self):
        url = self.sdoc_server_url + '/api/v1/docs/' + self.doc_uuid + '/review-snapshot/?from=seahub'
        response = requests.get(url, headers=self.headers, timeout=self.timeout)
        return parse_response(response)

    @staticmethod
    def build_review_request(data):
        commands = []
        for item in data['selected_items']:
            if item['kind'] in ('set_block_type', 'set_list_type'):
                command = {
                    'kind': 'update_element_attributes',
                    'target_element_id': item['target']['block_id'],
                    'payload': {'type': item['after_type']},
                }
            elif item['kind'] in ('replace_block_text', 'replace_table_cell_text'):
                command = {
                    'kind': 'replace_element_content',
                    'target_element_id': item['target']['block_id'],
                    'payload': {'text': item['after_text']},
                }
            elif item['kind'] == 'delete_block':
                command = {
                    'kind': 'delete_element',
                    'target_element_id': item['target']['block_id'],
                }
            elif item['kind'] == 'insert_block':
                command = {
                    'kind': 'insert_element',
                    'parent_element_id': None,
                    '%s_element_id' % item['placement']: item['target']['block_id'],
                    'payload': {'type': item['after_type'], 'text': item['after_text']},
                }
            else:
                raise ValueError('Unsupported review command: %s' % item['kind'])
            commands.append(command)
        return {'commands': commands, 'review': data}

    @staticmethod
    def validate_review_request(body):
        # Transport limits of the element-commands API, not element capabilities.
        for command in body['commands']:
            text = command.get('payload', {}).get('text')
            if text is not None and len(text.encode('utf-8')) > 256 * 1024:
                return 'review_text_too_large'
        # Prepare exactly as requests.post(json=...) does, including escaping.
        prepared = requests.Request('POST', 'http://sdoc', json=body).prepare()
        if len(prepared.body) > 1024 * 1024:
            return 'review_request_too_large'
        return None

    def apply_change_set(self, access_token, data):
        body = self.build_review_request(data)
        url = self.sdoc_server_url + '/api/v1/docs/' + self.doc_uuid + '/element-commands?from=seahub'
        headers = {'Authorization': 'Token ' + access_token}
        response = requests.post(url, json=body, headers=headers, timeout=self.timeout)
        return parse_response(response)

    def get_apply_result(self, access_token, apply_attempt_id, timeout=5):
        url = self.sdoc_server_url + '/api/v1/docs/' + self.doc_uuid + '/element-commands/' + apply_attempt_id + '/?from=seahub'
        headers = {'Authorization': 'Token ' + access_token}
        response = requests.get(url, headers=headers, timeout=timeout)
        return parse_response(response)

    def abort_review_apply(self, access_token, apply_attempt_id):
        url = self.sdoc_server_url + '/api/v1/docs/' + self.doc_uuid + '/element-commands/' + apply_attempt_id + '/abort/?from=seahub'
        headers = {'Authorization': 'Token ' + access_token}
        response = requests.post(url, json={}, headers=headers, timeout=5)
        return parse_response(response)

    def save_doc(self):
        url = self.sdoc_server_url + '/api/v1/docs/' + self.doc_uuid + '/save/?from=seahub'
        response = requests.post(url, json={}, headers=self.headers)
        return parse_response(response)
    
    def publish_doc(self, origin_doc_uuid, origin_doc_name):
        url = self.sdoc_server_url + '/api/v1/docs/' + self.doc_uuid + '/publish/?from=seahub'
        data = {
            'origin_doc_uuid': origin_doc_uuid,
            'origin_doc_name': origin_doc_name,
        }
        response = requests.post(url, json=data, headers=self.headers)
        return parse_response(response)
    
    def replace_doc(self):
        url = self.sdoc_server_url + '/api/v1/docs/' + self.doc_uuid + '/replace/?from=seahub'
        data = {
            'doc_name': self.filename
        }
        response = requests.post(url, json=data, headers=self.headers)
        return parse_response(response)

    def add_participant(self, users):
        url = self.sdoc_server_url + '/api/v1/docs/' + self.doc_uuid + '/participants/?from=seahub'
        data = {
            'users': users
        }
        response = requests.post(url, json=data, headers=self.headers)
        return parse_response(response)

    def remove_participant(self, email):
        url = self.sdoc_server_url + '/api/v1/docs/' + self.doc_uuid + '/participants/?from=seahub'
        data = {
            'doc_name': self.filename,
            'email': email
        }
        response = requests.delete(url, json=data, headers=self.headers)
        return parse_response(response)
