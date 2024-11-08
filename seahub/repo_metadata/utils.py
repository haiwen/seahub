import jwt
import time
import requests
import json
import random
from urllib.parse import urljoin

from seahub.settings import SECRET_KEY, SEAFEVENTS_SERVER_URL
from seahub.views import check_folder_permission

from seaserv import seafile_api

FACES_SAVE_PATH = '_Internal/Faces'


def add_init_metadata_task(params):
    payload = {'exp': int(time.time()) + 300, }
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    headers = {"Authorization": "Token %s" % token}
    url = urljoin(SEAFEVENTS_SERVER_URL, '/add-init-metadata-task')
    resp = requests.get(url, params=params, headers=headers)
    return json.loads(resp.content)['task_id']


def add_init_face_recognition_task(params):
    payload = {'exp': int(time.time()) + 300, }
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    headers = {"Authorization": "Token %s" % token}
    url = urljoin(SEAFEVENTS_SERVER_URL, '/add-init-face-recognition-task')
    resp = requests.get(url, params=params, headers=headers)
    return json.loads(resp.content)['task_id']


def get_someone_similar_faces(faces, metadata_server_api):
    from seafevents.repo_metadata.utils import METADATA_TABLE, FACES_TABLE
    sql = f'SELECT `{METADATA_TABLE.columns.id.name}`, `{METADATA_TABLE.columns.parent_dir.name}`, `{METADATA_TABLE.columns.file_name.name}` FROM `{METADATA_TABLE.name}` WHERE `{METADATA_TABLE.columns.id.name}` IN ('
    parameters = []
    query_result = []
    for face in faces:
        link_row_ids = [item['row_id'] for item in face.get(FACES_TABLE.columns.photo_links.name, [])]
        if not link_row_ids:
            continue
        link_row_id = link_row_ids[0]
        sql += '?, '
        parameters.append(link_row_id)
        if len(parameters) >= 10000:
            sql = sql.rstrip(', ') + ');'
            results = metadata_server_api.query_rows(sql, parameters).get('results', [])
            query_result.extend(results)
            sql = f'SELECT `{METADATA_TABLE.columns.id.name}`, `{METADATA_TABLE.columns.parent_dir.name}`, `{METADATA_TABLE.columns.file_name.name}` FROM `{METADATA_TABLE.name}` WHERE `{METADATA_TABLE.columns.id.name}` IN ('
            parameters = []

    if parameters:
        sql = sql.rstrip(', ') + ');'
        results = metadata_server_api.query_rows(sql, parameters).get('results', [])
        query_result.extend(results)

    return query_result


def extract_file_details(params):
    payload = {'exp': int(time.time()) + 300, }
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    headers = {"Authorization": "Token %s" % token}
    url = urljoin(SEAFEVENTS_SERVER_URL, '/extract-file-details')
    resp = requests.post(url, json=params, headers=headers, timeout=30)
    return json.loads(resp.content)['details']


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


def get_sys_columns():
    from seafevents.repo_metadata.utils import METADATA_TABLE
    columns = [
        METADATA_TABLE.columns.file_creator.to_dict(),
        METADATA_TABLE.columns.file_ctime.to_dict(),
        METADATA_TABLE.columns.file_modifier.to_dict(),
        METADATA_TABLE.columns.file_mtime.to_dict(),
        METADATA_TABLE.columns.parent_dir.to_dict(),
        METADATA_TABLE.columns.file_name.to_dict(),
        METADATA_TABLE.columns.is_dir.to_dict(),
        METADATA_TABLE.columns.file_type.to_dict(),
        METADATA_TABLE.columns.location.to_dict(),
        METADATA_TABLE.columns.obj_id.to_dict(),
        METADATA_TABLE.columns.size.to_dict(),
        METADATA_TABLE.columns.suffix.to_dict(),
        METADATA_TABLE.columns.file_details.to_dict(),
        METADATA_TABLE.columns.description.to_dict(),
    ]

    return columns


def get_link_column(face_table_id):
    from seafevents.repo_metadata.utils import METADATA_TABLE, FACES_TABLE
    columns = [
        METADATA_TABLE.columns.face_vectors.to_dict(),
        METADATA_TABLE.columns.face_links.to_dict({
            'link_id': FACES_TABLE.link_id,
            'table_id': METADATA_TABLE.id,
            'other_table_id': face_table_id,
            'display_column_key': FACES_TABLE.columns.name.key,
        }),
    ]

    return columns


def get_face_columns(face_table_id):
    from seafevents.repo_metadata.utils import METADATA_TABLE, FACES_TABLE
    columns = [
        FACES_TABLE.columns.photo_links.to_dict({
            'link_id': FACES_TABLE.link_id,
            'table_id': METADATA_TABLE.id,
            'other_table_id': face_table_id,
            'display_column_key': METADATA_TABLE.columns.obj_id.key,
        }),
        FACES_TABLE.columns.vector.to_dict(),
        FACES_TABLE.columns.name.to_dict(),
    ]

    return columns


def get_unmodifiable_columns():
    from seafevents.repo_metadata.utils import METADATA_TABLE
    columns = [
        METADATA_TABLE.columns.file_creator.to_dict(),
        METADATA_TABLE.columns.file_ctime.to_dict(),
        METADATA_TABLE.columns.file_modifier.to_dict(),
        METADATA_TABLE.columns.file_mtime.to_dict(),
        METADATA_TABLE.columns.parent_dir.to_dict(),
        METADATA_TABLE.columns.file_name.to_dict(),
        METADATA_TABLE.columns.is_dir.to_dict(),
        METADATA_TABLE.columns.file_type.to_dict(),
        METADATA_TABLE.columns.location.to_dict(),
        METADATA_TABLE.columns.obj_id.to_dict(),
        METADATA_TABLE.columns.size.to_dict(),
        METADATA_TABLE.columns.suffix.to_dict(),
        METADATA_TABLE.columns.file_details.to_dict(),
    ]

    return columns


def init_metadata(metadata_server_api):
    from seafevents.repo_metadata.utils import METADATA_TABLE

    # delete base to prevent dirty data caused by last failure
    metadata_server_api.delete_base()
    metadata_server_api.create_base()

    # init sys column
    sys_columns = get_sys_columns()
    metadata_server_api.add_columns(METADATA_TABLE.id, sys_columns)


def init_faces(metadata_server_api):
    from seafevents.repo_metadata.utils import METADATA_TABLE, FACES_TABLE

    remove_faces_table(metadata_server_api)
    resp = metadata_server_api.create_table(FACES_TABLE.name)

    # init link column
    link_column = get_link_column(resp['id'])
    metadata_server_api.add_columns(METADATA_TABLE.id, link_column)

    # init face column
    face_columns = get_face_columns(resp['id'])
    metadata_server_api.add_columns(resp['id'], face_columns)


def remove_faces_table(metadata_server_api):
    from seafevents.repo_metadata.utils import METADATA_TABLE, FACES_TABLE
    metadata = metadata_server_api.get_metadata()

    tables = metadata.get('tables', [])
    for table in tables:
        if table['name'] == FACES_TABLE.name:
            metadata_server_api.delete_table(table['id'])
        elif table['name'] == METADATA_TABLE.name:
            columns = table.get('columns', [])
            for column in columns:
                if column['key'] in [METADATA_TABLE.columns.face_vectors.key, METADATA_TABLE.columns.face_links.key]:
                    metadata_server_api.delete_column(table['id'], column['key'])


def get_file_download_token(repo_id, file_id, username):
    return seafile_api.get_fileserver_access_token(repo_id, file_id, 'download', username, use_onetime=True)


def can_read_metadata(request, repo_id):
    permission = check_folder_permission(request, repo_id, '/')
    if permission:
        return True
    return False
