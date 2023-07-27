import requests


class ColumnTypes:
    COLLABORATOR = 'collaborator'
    NUMBER = 'number'
    DATE = 'date'
    GEOLOCATION = 'geolocation'
    CREATOR = 'creator'
    LAST_MODIFIER = 'last-modifier'
    TEXT = 'text'
    IMAGE = 'image'
    LONG_TEXT = 'long-text'
    CHECKBOX = 'checkbox'
    SINGLE_SELECT = 'single-select'
    MULTIPLE_SELECT = 'multiple-select'
    URL = 'url'
    DURATION = 'duration'
    FILE = 'file'
    EMAIL = 'email'
    RATE = 'rate'
    FORMULA = 'formula'
    LINK_FORMULA = 'link-formula'
    AUTO_NUMBER = 'auto-number'
    LINK = 'link'
    CTIME = 'ctime'
    MTIME = 'mtime'
    BUTTON = 'button'
    DIGITAL_SIGN = 'digital-sign'


def parse_response(response):
    if response.status_code >= 400:
        raise ConnectionError(response.status_code, response.text)
    else:
        try:
            return response.json()
        except:
            pass


class SeaTableAPI:

    def __init__(self, api_token, server_url):
        self.api_token = api_token
        self.server_url = server_url
        self.dtable_uuid = None
        self.access_token = None
        self.dtable_server_url = None
        self.dtable_db_url = None
        self.headers = None
        self.auth()

    def auth(self):
        url = f"{self.server_url.strip('/')}/api/v2.1/dtable/app-access-token/?from=dtable_web"
        resp = requests.get(url, headers={'Authorization': f'Token {self.api_token}'})
        self.dtable_uuid = resp.json()['dtable_uuid']
        self.access_token = resp.json()['access_token']
        self.dtable_server_url = resp.json()['dtable_server']
        self.dtable_db_url = resp.json()['dtable_db']
        self.headers = {'Authorization': f'Token {self.access_token}'}

    def get_metadata(self):
        url = f"{self.dtable_server_url.strip('/')}/api/v1/dtables/{self.dtable_uuid}/metadata/?from=dtable_web"
        resp = requests.get(url, headers=self.headers)
        return parse_response(resp)['metadata']

    def query(self, sql, convert=None, server_only=None):
        url = f"{self.dtable_db_url.strip('/')}/api/v1/query/{self.dtable_uuid}/?from=dtable_web"
        data = {'sql': sql}
        if convert is not None:
            data['convert_keys'] = convert
        if server_only is not None:
            data['server_only'] = server_only
        resp = requests.post(url, json=data, headers=self.headers)
        return parse_response(resp)

    def add_table(self, table_name, columns=None):
        url = f"{self.dtable_server_url.strip('/')}/api/v1/dtables/{self.dtable_uuid}/tables/?from=dtable_web"
        data = {'table_name': table_name}
        if columns:
            data['columns'] = columns
        resp = requests.post(url, headers=self.headers, json=data)
        return parse_response(resp)

    def insert_column(self, table_name, column):
        url = f"{self.dtable_server_url.strip('/')}/api/v1/dtables/{self.dtable_uuid}/columns/?from=dtable_web"
        data = {'table_name': table_name}
        data.update(column)
        resp = requests.post(url, headers=self.headers, json=data)
        return parse_response(resp)

    def append_row(self, table_name, row):
        url = f"{self.dtable_server_url.strip('/')}/api/v1/dtables/{self.dtable_uuid}/rows/?from=dtable_web"
        data = {
            'table_name': table_name,
            'row': row
        }
        resp = requests.post(url, headers=self.headers, json=data)
        return parse_response(resp)

    def update_row(self, table_name, row_id, row):
        url = f"{self.dtable_server_url.strip('/')}/api/v1/dtables/{self.dtable_uuid}/rows/?from=dtable_web"
        data = {
            'table_name': table_name,
            'row': row,
            "row_id": row_id
        }
        resp = requests.put(url, headers=self.headers, json=data)
        return parse_response(resp)

    def get_table_by_name(self, table_name):
        metadata = self.get_metadata()
        for table in metadata['tables']:
            if table['name'] == table_name:
                return table
        return None
