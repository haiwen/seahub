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

    def __init__(self, doc_uuid, filename, username):
        self.doc_uuid = doc_uuid
        self.filename = filename
        self.username = username
        self.headers = None
        self.sdoc_server_url = SEADOC_SERVER_URL.rstrip('/')
        self.timeout = 30
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
        url = self.sdoc_server_url + '/api/v1/docs/' + self.doc_uuid + '/content/?from=seahub'
        response = requests.get(url, headers=self.headers)
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

