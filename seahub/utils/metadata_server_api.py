import requests, jwt, time
from seahub.settings import MATEDATA_SERVER_URL, METEDATA_SERVER_SECRET_KEY

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
    
def gen_headers(base_id, user):
    payload = {
        'exp': int(time.time()) + 300, 
        'base_id': base_id,
        'user': user
    }
    token = jwt.encode(payload, METEDATA_SERVER_SECRET_KEY, algorithm='HS256')
    return {"Authorization": "Bearer %s" % token}

def create_base(base_id, headers):
    #create a metadata base for base_id
    url = f'{MATEDATA_SERVER_URL}/api/v1/base/{base_id}'
    response = requests.post(url, headers=headers)
    return response

def delete_base(base_id, headers):
    url = f'{MATEDATA_SERVER_URL}/api/v1/base/{base_id}'
    response = requests.delete(url, headers=headers)
    return response
    

def add_column(base_id, table, column, headers):
    url = f'{MATEDATA_SERVER_URL}/api/v1/base/{base_id}/columns'
    data = {
        'table_id': table.id,
        'column': column.to_build_column_dict()
    }
    response = requests.post(url, json=data, headers=headers)
    return response
    
def insert_rows(base_id, table, columns, rows, headers):
    url = f'{MATEDATA_SERVER_URL}/api/v1/base/{base_id}/rows'
    data = {
            'table_id': table.id,
            'column_keys': [column.key for column in columns],
            'rows': rows
        }
    
    response = requests.post(url, json=data, headers=headers)
    return response
    
def update_rows(base_id, table, columns, rows, headers):
    url = f'{MATEDATA_SERVER_URL}/api/v1/base/{base_id}/rows'
    data = {
            'table_id': table.id,
            'column_keys': [column.key for column in columns],
            'rows': rows
        }
    

    response = requests.put(url, json=data, headers=headers)
    return response

def delete_rows(base_id, table, row_ids, headers):
    url = f'{MATEDATA_SERVER_URL}/api/v1/base/{base_id}/rows'
    data = {
            'table_id': table.id,
            'row_ids': row_ids
        }
    response = requests.delete(url, json=data, headers=headers)
    return response

def query_rows(base_id, sql, headers, params=[]):
    post_data = {
        'sql': sql
    }

    if params:
        post_data['params'] = params
        
    url = f'{MATEDATA_SERVER_URL}/api/v1/base/{base_id}/query'
    response = requests.post(url, json=post_data, headers=headers)
    return response
