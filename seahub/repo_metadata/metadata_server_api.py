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
            'name': self.name,
            'type': self.type
        }
    
#metadata base
METADATA_TABLE = structure_table('0001', 'Table1')
METADATA_COLUMN_ID = structure_column('0', '_id', 'text')
METADATA_COLUMN_CREATOR = structure_column('16', 'creator', 'text')
METADATA_COLUMN_CREATED_TIME = structure_column('17', 'created_time', 'date')
METADATA_COLUMN_MODIFIER = structure_column('18', 'modifier', 'text')
METADATA_COLUMN_MODIFIED_TIME = structure_column('19', 'modified_time', 'date')
METADATA_COLUMN_PARENT_DIR = structure_column('20', 'parent_dir', 'text')
METADATA_COLUMN_NAME = structure_column('21', 'name', 'text')
METADATA_COLUMN_IS_DIR = structure_column('22', 'is_dir', 'text')

def parse_response(response):
    if response.status_code >= 300 or response.status_code < 200:
        raise ConnectionError(response.status_code, response.text)
    else:
        try:
            return response.json()
        except:
            pass

class MetadataServerAPI:
    def __init__(self, base_id, user):
        self.base_id = base_id
        self.user = user

    def gen_headers(self):
        payload = {
            'exp': int(time.time()) + 300, 
            'base_id': self.base_id,
            'user': self.user
        }
        token = jwt.encode(payload, METADATA_SERVER_SECRET_KEY, algorithm='HS256')
        return {"Authorization": "Bearer %s" % token}

    def create_base(self):
        headers = self.gen_headers()
        #create a metadata base for base_id
        url = f'{METADATA_SERVER_URL}/api/v1/base/{self.base_id}'
        response = requests.post(url, headers=headers)
        return parse_response(response)

    def delete_base(self):
        headers = self.gen_headers()
        url = f'{METADATA_SERVER_URL}/api/v1/base/{self.base_id}'
        response = requests.delete(url, headers=headers)
        return parse_response(response)
    

    def add_column(self, table, column):
        headers = self.gen_headers()
        url = f'{METADATA_SERVER_URL}/api/v1/base/{self.base_id}/columns'
        data = {
            'table_id': table.id,
            'column': column.to_build_column_dict()
        }
        response = requests.post(url, json=data, headers=headers)
        return parse_response(response)
    
    def insert_rows(self, table, columns, rows):
        headers = self.gen_headers()
        url = f'{METADATA_SERVER_URL}/api/v1/base/{self.base_id}/rows'
        data = {
                'table_id': table.id,
                'column_keys': [column.key for column in columns],
                'rows': rows
            }
        
        response = requests.post(url, json=data, headers=headers)
        return parse_response(response)
    
    def update_rows(self, table, columns, rows):
        headers = self.gen_headers()
        url = f'{METADATA_SERVER_URL}/api/v1/base/{self.base_id}/rows'
        data = {
                'table_id': table.id,
                'column_keys': [column.key for column in columns],
                'rows': rows
            }
        

        response = requests.put(url, json=data, headers=headers)
        return parse_response(response)

    def delete_rows(self, table, row_ids):
        headers = self.gen_headers()
        url = f'{METADATA_SERVER_URL}/api/v1/base/{self.base_id}/rows'
        data = {
                'table_id': table.id,
                'row_ids': row_ids
            }
        response = requests.delete(url, json=data, headers=headers)
        return parse_response(response)

    def query_rows(self, sql, params=[]):
        headers = self.gen_headers()
        post_data = {
            'sql': sql
        }

        if params:
            post_data['params'] = params
            
        url = f'{METADATA_SERVER_URL}/api/v1/base/{self.base_id}/query'
        response = requests.post(url, json=post_data, headers=headers)
        return parse_response(response)
