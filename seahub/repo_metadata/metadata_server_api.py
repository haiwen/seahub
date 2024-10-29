import requests, jwt, time
from seahub.settings import METADATA_SERVER_URL, METADATA_SERVER_SECRET_KEY


def list_metadata_records(repo_id, user, parent_dir=None, name=None, is_dir=None, start=0, limit=1000, order_by=None):
    from seafevents.repo_metadata.utils import METADATA_TABLE
    sql = f'SELECT * FROM `{METADATA_TABLE.name}`'

    parameters = []

    if parent_dir:
        sql += f' WHERE `{METADATA_TABLE.columns.parent_dir.name}` LIKE ?'
        parameters.append(parent_dir)
        if name:
            sql += f' AND `{METADATA_TABLE.columns.file_name.name}` LIKE ?'
            parameters.append(name)

        if is_dir:
            sql += f' AND `{METADATA_TABLE.columns.is_dir.name}` LIKE ?'
            parameters.append(str(is_dir))
    elif name:
        sql += f' WHERE `{METADATA_TABLE.columns.file_name.name}` LIKE ?'
        parameters.append(name)

        if is_dir:
            sql += f' AND `{METADATA_TABLE.columns.is_dir.name}` LIKE ?'
            parameters.append(str(is_dir))
    elif is_dir:
        sql += f' WHERE `{METADATA_TABLE.columns.is_dir.name}` LIKE ?'
        parameters.append(str(is_dir))

    sql += f' ORDER BY {order_by}' if order_by else \
        f' ORDER BY \
            `{METADATA_TABLE.columns.parent_dir.name}` ASC, \
            `{METADATA_TABLE.columns.is_dir.name}` DESC, \
            `{METADATA_TABLE.columns.file_name.name}` ASC'

    sql += f' LIMIT {start}, {limit};'

    metadata_server_api = MetadataServerAPI(repo_id, user)
    response_results = metadata_server_api.query_rows(sql, parameters)

    return response_results

def list_metadata_view_records(repo_id, user, view, start=0, limit=1000):
    from seafevents.repo_metadata.utils import METADATA_TABLE, gen_view_data_sql
    metadata_server_api = MetadataServerAPI(repo_id, user)
    columns = metadata_server_api.list_columns(METADATA_TABLE.id).get('columns')
    sql = gen_view_data_sql(METADATA_TABLE, columns, view, start, limit, user)
    response_results = metadata_server_api.query_rows(sql, [])
    return response_results


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

    # column
    def list_columns(self, table_id):
        url = f'{METADATA_SERVER_URL}/api/v1/base/{self.base_id}/columns'
        data = {
            'table_id': table_id
        }
        response = requests.get(url, json=data, headers=self.headers, timeout=self.timeout)
        return parse_response(response)

    def add_column(self, table_id, column):
        url = f'{METADATA_SERVER_URL}/api/v1/base/{self.base_id}/columns'
        data = {
            'table_id': table_id,
            'column': column
        }
        response = requests.post(url, json=data, headers=self.headers, timeout=self.timeout)
        return parse_response(response)

    def add_columns(self, table_id, columns):
        url = f'{METADATA_SERVER_URL}/api/v1/base/{self.base_id}/columns'
        data = {
            'table_id': table_id,
            'columns': columns
        }
        response = requests.post(url, json=data, headers=self.headers, timeout=self.timeout)
        return parse_response(response)
    
    def delete_column(self, table_id, column_key):
        url = f'{METADATA_SERVER_URL}/api/v1/base/{self.base_id}/columns'
        data = {
            'table_id': table_id,
            'column_key': column_key
        }
        response = requests.delete(url, json=data, headers=self.headers, timeout=self.timeout)
        return parse_response(response)
    
    def update_column(self, table_id, column):
        url = f'{METADATA_SERVER_URL}/api/v1/base/{self.base_id}/columns'
        data = {
            'table_id': table_id,
            'column': column
        }
        response = requests.put(url, json=data, headers=self.headers, timeout=self.timeout)
        return parse_response(response)

    def create_table(self, table_name):
        url = f'{METADATA_SERVER_URL}/api/v1/base/{self.base_id}/tables'
        data = {
            'name': table_name,
        }
        response = requests.post(url, json=data, headers=self.headers, timeout=self.timeout)
        return parse_response(response)

    def get_metadata(self):
        url = f'{METADATA_SERVER_URL}/api/v1/base/{self.base_id}/metadata'
        response = requests.get(url, headers=self.headers, timeout=self.timeout)
        return parse_response(response)

    def delete_table(self, table_id):
        url = f'{METADATA_SERVER_URL}/api/v1/base/{self.base_id}/tables/{table_id}'
        response = requests.delete(url, headers=self.headers, timeout=self.timeout)
        return parse_response(response)
