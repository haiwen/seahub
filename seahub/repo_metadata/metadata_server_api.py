import requests, jwt, time
from seahub.settings import METADATA_SERVER_URL, METADATA_SERVER_SECRET_KEY

class structure_table(object):
    def __init__(self, id, name):
        self.id = id
        self.name = name

class structure_column(object):
    def __init__(self, key, name, type):
        self.key = key
        self.name = name
        self.type = type

    def to_build_column_dict(self):
        return {
            'key': self.key,
            'name': self.name,
            'type': self.type
        }
    
#metadata base
METADATA_TABLE = structure_table('0001', 'Table1')
METADATA_COLUMN_ID = structure_column('_id', '_id', 'text')
METADATA_COLUMN_CREATOR = structure_column('_file_creator', '_file_creator', 'text')
METADATA_COLUMN_CREATED_TIME = structure_column('_file_ctime', '_file_ctime', 'date')
METADATA_COLUMN_MODIFIER = structure_column('_file_modifier', '_file_modifier', 'text')
METADATA_COLUMN_MODIFIED_TIME = structure_column('_file_mtime', '_file_mtime', 'date')
METADATA_COLUMN_PARENT_DIR = structure_column('_parent_dir', '_parent_dir', 'text')
METADATA_COLUMN_NAME = structure_column('_name', '_name', 'text')
METADATA_COLUMN_IS_DIR = structure_column('_is_dir', '_is_dir', 'text')


def parse_response(response):
    if response.status_code >= 300 or response.status_code < 200:
        raise ConnectionError(response.status_code, response.text)
    else:
        try:
            return response.json()
        except:
            pass

class MetadataServerAPI:
    def __init__(self, base_id, user, timeout=30):
        self.base_id = base_id
        self.user = user
        self.headers = self.gen_headers()
        self.timeout = timeout

    def gen_headers(self):
        payload = {
            'exp': int(time.time()) + 3600, 
            'base_id': self.base_id,
            'user': self.user
        }
        token = jwt.encode(payload, METADATA_SERVER_SECRET_KEY, algorithm='HS256')
        return {"Authorization": "Bearer %s" % token}

    def create_base(self):
        url = f'{METADATA_SERVER_URL}/api/v1/base/{self.base_id}'
        response = requests.post(url, headers=self.headers, timeout=self.timeout)
        return parse_response(response)

    def delete_base(self):
        url = f'{METADATA_SERVER_URL}/api/v1/base/{self.base_id}'
        response = requests.delete(url, headers=self.headers, timeout=self.timeout)
        if response.status_code == 404:
            return {'success': True}
        return parse_response(response)
    

    def add_column(self, table_id, column):
        url = f'{METADATA_SERVER_URL}/api/v1/base/{self.base_id}/columns'
        data = {
            'table_id': table_id,
            'column': column
        }
        response = requests.post(url, json=data, headers=self.headers, timeout=self.timeout)
        return parse_response(response)
    
    def insert_rows(self, table_id, rows):
        url = f'{METADATA_SERVER_URL}/api/v1/base/{self.base_id}/rows'
        data = {
                'table_id': table_id,
                'rows': rows
            }
        response = requests.post(url, json=data, headers=self.headers, timeout=self.timeout)
        return parse_response(response)
    
    def update_rows(self, table_id, rows):
        url = f'{METADATA_SERVER_URL}/api/v1/base/{self.base_id}/rows'
        data = {
                'table_id': table_id,
                'rows': rows
            }
        response = requests.put(url, json=data, headers=self.headers, timeout=self.timeout)
        return parse_response(response)

    def delete_rows(self, table_id, row_ids):
        url = f'{METADATA_SERVER_URL}/api/v1/base/{self.base_id}/rows'
        data = {
                'table_id': table_id,
                'row_ids': row_ids
            }
        response = requests.delete(url, json=data, headers=self.headers, timeout=self.timeout)
        return parse_response(response)

    def query_rows(self, sql, params=[]):
        post_data = {
            'sql': sql
        }

        if params:
            post_data['params'] = params
        url = f'{METADATA_SERVER_URL}/api/v1/base/{self.base_id}/query'
        response = requests.post(url, json=post_data, headers=self.headers, timeout=self.timeout)
        return parse_response(response)
