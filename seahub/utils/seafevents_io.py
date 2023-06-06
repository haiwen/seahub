import jwt
import requests

from seahub.settings import SEAFEVENTS_IO_SERVER, SEAFEVENTS_IO_SERVER_AUTH_TOKEN

headers = {'Authorization': 'Token ' + SEAFEVENTS_IO_SERVER_AUTH_TOKEN}


def add_export_ledger_to_excel_task(repo_id, parent_dir=None):
    url = f"{SEAFEVENTS_IO_SERVER.strip('/')}/add-export-ledger-to-excel-task/"
    return requests.post(url, headers=headers, json={'repo_id': repo_id, 'parent_dir': parent_dir})


def query_task(task_id):
    url = f"{SEAFEVENTS_IO_SERVER.strip('/')}/query-task/"
    return requests.get(url, headers=headers, params={'task_id': task_id})

