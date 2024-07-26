import jwt
import time
import requests
import json
import random
from urllib.parse import urljoin

from seahub.settings import SECRET_KEY, SEAFEVENTS_SERVER_URL


def add_init_metadata_task(params):
    payload = {'exp': int(time.time()) + 300, }
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    headers = {"Authorization": "Token %s" % token}
    url = urljoin(SEAFEVENTS_SERVER_URL, '/add-init-metadata-task')
    resp = requests.get(url, params=params, headers=headers)
    return json.loads(resp.content)['task_id']


def generator_base64_code(length=4):
    possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz0123456789'
    ids = random.sample(possible, length)
    return ''.join(ids)


def gen_unique_id(id_set, length=4):
    _id = generator_base64_code(length)

    while True:
        if _id not in id_set:
            return _id
        _id = generator_base64_code(length)


def init_metadata(metadata_server_api):
    from seafevents.repo_metadata.utils import METADATA_TABLE

    # delete base to prevent dirty data caused by last failure
    metadata_server_api.delete_base()
    metadata_server_api.create_base()

    # init sys column
    metadata_server_api.add_column(METADATA_TABLE.id, METADATA_TABLE.columns.file_creator.to_dict())
    metadata_server_api.add_column(METADATA_TABLE.id, METADATA_TABLE.columns.file_ctime.to_dict())
    metadata_server_api.add_column(METADATA_TABLE.id, METADATA_TABLE.columns.file_modifier.to_dict())
    metadata_server_api.add_column(METADATA_TABLE.id, METADATA_TABLE.columns.file_mtime.to_dict())
    metadata_server_api.add_column(METADATA_TABLE.id, METADATA_TABLE.columns.parent_dir.to_dict())
    metadata_server_api.add_column(METADATA_TABLE.id, METADATA_TABLE.columns.file_name.to_dict())
    metadata_server_api.add_column(METADATA_TABLE.id, METADATA_TABLE.columns.is_dir.to_dict())
    metadata_server_api.add_column(METADATA_TABLE.id, METADATA_TABLE.columns.file_type.to_dict())
    metadata_server_api.add_column(METADATA_TABLE.id, METADATA_TABLE.columns.location.to_dict())
