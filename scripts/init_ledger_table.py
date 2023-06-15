import logging

import requests

LEDGER_COLUMNS = [
    {'column_key': '0000', 'column_name': 'Repo ID', 'column_type': 'text', 'column_data': None},
    {'column_key': 'GqGh', 'column_name': 'File', 'column_type': 'text', 'column_data': {'enable_fill_default_value': False, 'enable_check_format': False, 'format_specification_value': None, 'default_value': '', 'format_check_type': 'chinese_id_card'}},
    {'column_key': 'l76s', 'column_name': 'UUID', 'column_type': 'text', 'column_data': {'enable_fill_default_value': False, 'enable_check_format': False, 'format_specification_value': None, 'default_value': '', 'format_check_type': 'chinese_id_card'}},
    {'column_key': '1fUd', 'column_name': 'Path', 'column_type': 'text', 'column_data': {'enable_fill_default_value': False, 'enable_check_format': False, 'format_specification_value': None, 'default_value': '', 'format_check_type': 'chinese_id_card'}},
    {'column_key': 'IFzK', 'column_name': '文件大分类', 'column_type': 'single-select', 'column_data': {'enable_fill_default_value': False, 'default_value': None, 'options': []}},
    {'column_key': 'qc3L', 'column_name': '文件中分类', 'column_type': 'single-select', 'column_data': {'enable_fill_default_value': False, 'default_value': None, 'options': []}},
    {'column_key': 'k93T', 'column_name': '文件小分类', 'column_type': 'single-select', 'column_data': {'enable_fill_default_value': False, 'default_value': None, 'options': []}},
    {'column_key': 'sysV', 'column_name': '文件负责人', 'column_type': 'text', 'column_data': {'enable_fill_default_value': False, 'enable_check_format': False, 'format_specification_value': None, 'default_value': '', 'format_check_type': 'chinese_id_card'}},
    {'column_key': 'TZw3', 'column_name': '密级', 'column_type': 'single-select', 'column_data': {'enable_fill_default_value': False, 'default_value': None, 'options': []}},
    {'column_key': 'uFNa', 'column_name': '保密期限', 'column_type': 'number', 'column_data': {'format': 'number', 'precision': 2, 'enable_precision': False, 'enable_fill_default_value': False, 'enable_check_format': False, 'decimal': 'dot', 'thousands': 'no', 'format_min_value': 0, 'format_max_value': 1000}},
    {'column_key': 'BeVA', 'column_name': '创建日期', 'column_type': 'date', 'column_data': {'format': 'YYYY-MM-DD HH:mm', 'enable_fill_default_value': False, 'default_value': '', 'default_date_type': 'specific_date'}},
    {'column_key': 'ngbE', 'column_name': '废弃日期', 'column_type': 'formula', 'column_data': {'format': 'YYYY-MM-DD', 'formula': "dateAdd({创建日期}, {保密期限}, 'days')", 'operated_columns': ['BeVA', 'uFNa'], 'result_type': 'date'}}
]

DTABLE_WEB_SERVER = ''
SEATABLE_LEDGER_BASE_API_TOKEN = ''
LEDGER_TABLE_NAME = 'props'

# auth
url = f"{DTABLE_WEB_SERVER.strip('/')}/api/v2.1/dtable/app-access-token/?from=dtable_web"
resp = requests.get(url, headers={'Authorization': f'Token {SEATABLE_LEDGER_BASE_API_TOKEN}'})
dtable_uuid = resp.json()['dtable_uuid']
access_token = resp.json()['access_token']
dtable_server_url = resp.json()['dtable_server']
headers = {'Authorization': f'Token {access_token}'}

# query metadata
url = f"{dtable_server_url.strip('/')}/api/v1/dtables/{dtable_uuid}/metadata/?from=dtable_web"
resp = requests.get(url, headers=headers)
metadata = resp.json()['metadata']
existed_table = None
for table in metadata['tables']:
    if table['name'] == LEDGER_TABLE_NAME:
        existed_table = table
        break

# check table or add table
if existed_table:
    logging.info('table %s exists', LEDGER_TABLE_NAME)
    for col in LEDGER_COLUMNS:
        target_col = None
        for table_col in existed_table['columns']:
            if col['column_name'] == table_col['name']:
                target_col = table_col
                break
        if not target_col:
            logging.error('Column %s not found', col['column_name'])
            exit(1)
        if target_col['type'] != col['column_type']:
            logging.error('Column %s type should be %s', col['column_name'], col['column_type'])
            exit(1)
else:
    # add table
    url = f"{dtable_server_url.strip('/')}/api/v1/dtables/{dtable_uuid}/tables/?from=dtable_web"
    data = {
        'table_name': LEDGER_TABLE_NAME,
        'columns': LEDGER_COLUMNS
    }
    resp = requests.post(url, headers=headers, json=data)
