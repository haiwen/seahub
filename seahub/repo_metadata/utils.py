import jwt
import time
import requests
import json
import random
from urllib.parse import urljoin
from datetime import datetime

from seahub.settings import SECRET_KEY, SEAFEVENTS_SERVER_URL
from seahub.views import check_folder_permission
from seahub.utils.timeutils import datetime_to_isoformat_timestr

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


def extract_file_details(params):
    payload = {'exp': int(time.time()) + 300, }
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    headers = {"Authorization": "Token %s" % token}
    url = urljoin(SEAFEVENTS_SERVER_URL, '/extract-file-details')
    resp = requests.post(url, json=params, headers=headers, timeout=30)
    return json.loads(resp.content)['details']


def recognize_faces(params):
    payload = {'exp': int(time.time()) + 300, }
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    headers = {"Authorization": "Token %s" % token}
    url = urljoin(SEAFEVENTS_SERVER_URL, '/recognize-faces')
    resp = requests.post(url, json=params, headers=headers, timeout=30)
    return resp


def update_people_cover_photo(params):
    payload = {'exp': int(time.time()) + 300, }
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    headers = {"Authorization": "Token %s" % token}
    url = urljoin(SEAFEVENTS_SERVER_URL, '/update-people-cover-photo')
    resp = requests.post(url, json=params, headers=headers, timeout=30)
    return json.loads(resp.content)

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

def gen_unique_tag_name(tag_name, exist_tags, counter=1):
    new_name = f'{tag_name}({counter})'
    if new_name not in exist_tags:
        return new_name
    return gen_unique_tag_name(tag_name, exist_tags, counter + 1)

def get_face_columns():
    from seafevents.repo_metadata.constants import FACES_TABLE
    columns = [
        FACES_TABLE.columns.vector.to_dict(),
        FACES_TABLE.columns.name.to_dict(),
    ]

    return columns


def get_table_by_name(metadata_server_api, table_name):
    metadata = metadata_server_api.get_metadata()
    tables = metadata.get('tables', [])
    table = next((table for table in tables if table['name'] == table_name), None)
    return table


def get_unmodifiable_columns():
    from seafevents.repo_metadata.constants import METADATA_TABLE
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
    from seafevents.repo_metadata.constants import METADATA_TABLE, METADATA_TABLE_SYS_COLUMNS

    # delete base to prevent dirty data caused by last failure
    metadata_server_api.delete_base()
    metadata_server_api.create_base()

    # init sys column
    sys_columns = METADATA_TABLE_SYS_COLUMNS
    metadata_server_api.add_columns(METADATA_TABLE.id, sys_columns)


def init_faces(metadata_server_api):
    from seafevents.repo_metadata.constants import METADATA_TABLE, FACES_TABLE

    remove_faces_table(metadata_server_api)
    resp = metadata_server_api.create_table(FACES_TABLE.name)
    face_table_id = resp['id']

    # add face vector column
    metadata_server_api.add_columns(METADATA_TABLE.id, [METADATA_TABLE.columns.face_vectors.to_dict()])

    # init faces column
    face_columns = get_face_columns()
    metadata_server_api.add_columns(face_table_id, face_columns)

    # add face link column
    metadata_server_api.add_link_columns(FACES_TABLE.face_link_id, METADATA_TABLE.id, face_table_id, {
        "key": METADATA_TABLE.columns.face_links.key,
        "name": METADATA_TABLE.columns.face_links.name,
        "display_column_key": FACES_TABLE.columns.name.key
    }, {
        "key": FACES_TABLE.columns.photo_links.key,
        "name": FACES_TABLE.columns.photo_links.name,
        "display_column_key": METADATA_TABLE.columns.obj_id.key
    })

    metadata_server_api.add_link_columns(FACES_TABLE.excluded_face_link_id, METADATA_TABLE.id, face_table_id, {
        "key": METADATA_TABLE.columns.excluded_face_links.key,
        "name": METADATA_TABLE.columns.excluded_face_links.name,
        "display_column_key": FACES_TABLE.columns.name.key
    }, {
        "key": FACES_TABLE.columns.excluded_photo_links.key,
        "name": FACES_TABLE.columns.excluded_photo_links.name,
        "display_column_key": METADATA_TABLE.columns.obj_id.key
    })

    metadata_server_api.add_link_columns(FACES_TABLE.included_face_link_id, METADATA_TABLE.id, face_table_id, {
        "key": METADATA_TABLE.columns.included_face_links.key,
        "name": METADATA_TABLE.columns.included_face_links.name,
        "display_column_key": FACES_TABLE.columns.name.key
    }, {
        "key": FACES_TABLE.columns.included_photo_links.key,
        "name": FACES_TABLE.columns.included_photo_links.name,
        "display_column_key": METADATA_TABLE.columns.obj_id.key
    })


def remove_faces_table(metadata_server_api):
    from seafevents.repo_metadata.constants import METADATA_TABLE, FACES_TABLE
    metadata = metadata_server_api.get_metadata()

    tables = metadata.get('tables', [])
    for table in tables:
        if table['name'] == FACES_TABLE.name:
            metadata_server_api.delete_table(table['id'], True)
        elif table['name'] == METADATA_TABLE.name:
            columns = table.get('columns', [])
            for column in columns:
                if column['key'] in [
                    METADATA_TABLE.columns.face_vectors.key,
                    METADATA_TABLE.columns.face_links.key,
                    METADATA_TABLE.columns.excluded_face_links.key,
                    METADATA_TABLE.columns.included_face_links.key
                ]:
                    metadata_server_api.delete_column(table['id'], column['key'], True)


# tag
def get_tag_columns(table_id):
    from seafevents.repo_metadata.constants import TAGS_TABLE
    columns = [
        TAGS_TABLE.columns.name.to_dict(),
        TAGS_TABLE.columns.color.to_dict(),
    ]

    return columns


def init_tag_file_links_column(metadata_server_api, tag_table_id):
    from seafevents.repo_metadata.constants import METADATA_TABLE, TAGS_TABLE

    file_link_id = TAGS_TABLE.file_link_id
    table_id = METADATA_TABLE.id
    other_table_id = tag_table_id
    table_column = {
        'key': METADATA_TABLE.columns.tags.key,
        'name': METADATA_TABLE.columns.tags.name,
        'display_column_key': TAGS_TABLE.columns.name.name,
    }
    other_table_column = {
        'key': TAGS_TABLE.columns.file_links.key,
        'name': TAGS_TABLE.columns.file_links.name,
        'display_column_key': TAGS_TABLE.columns.id.key,
    }
    metadata_server_api.add_link_columns(file_link_id, table_id, other_table_id, table_column, other_table_column)


def init_tag_self_link_columns(metadata_server_api, tag_table_id):
    from seafevents.repo_metadata.constants import TAGS_TABLE
    link_id = TAGS_TABLE.self_link_id
    table_id = tag_table_id
    other_table_id = tag_table_id

    # as parent tags which is_linked_back is false
    table_column = {
        'key': TAGS_TABLE.columns.parent_links.key,
        'name': TAGS_TABLE.columns.parent_links.name,
        'display_column_key': TAGS_TABLE.columns.id.key,
    }

    # as sub tags which is_linked_back is true
    other_table_column = {
        'key': TAGS_TABLE.columns.sub_links.key,
        'name': TAGS_TABLE.columns.sub_links.name,
        'display_column_key': TAGS_TABLE.columns.id.key,
    }
    metadata_server_api.add_link_columns(link_id, table_id, other_table_id, table_column, other_table_column)


def init_tags(metadata_server_api):
    from seafevents.repo_metadata.constants import METADATA_TABLE, TAGS_TABLE

    remove_tags_table(metadata_server_api)
    resp = metadata_server_api.create_table(TAGS_TABLE.name)

    table_id = resp['id']

    # init columns
    tag_columns = get_tag_columns(table_id)
    metadata_server_api.add_columns(table_id, tag_columns)

    # init link columns
    init_tag_file_links_column(metadata_server_api, table_id)
    init_tag_self_link_columns(metadata_server_api, table_id)


def remove_tags_table(metadata_server_api):
    from seafevents.repo_metadata.constants import METADATA_TABLE, TAGS_TABLE
    metadata = metadata_server_api.get_metadata()

    tables = metadata.get('tables', [])
    for table in tables:
        if table['name'] == TAGS_TABLE.name:
            metadata_server_api.delete_table(table['id'], True)
        elif table['name'] == METADATA_TABLE.name:
            columns = table.get('columns', [])
            for column in columns:
                if column['key'] in [METADATA_TABLE.columns.tags.key]:
                    metadata_server_api.delete_column(table['id'], column['key'], True)


# ocr
def init_ocr(metadata_server_api):
    from seafevents.repo_metadata.constants import METADATA_TABLE

    remove_ocr_column(metadata_server_api)

    # init ocr column
    columns = [
        METADATA_TABLE.columns.ocr.to_dict(),
    ]
    metadata_server_api.add_columns(METADATA_TABLE.id, columns)


def remove_ocr_column(metadata_server_api):
    from seafevents.repo_metadata.constants import METADATA_TABLE
    metadata = metadata_server_api.get_metadata()

    tables = metadata.get('tables', [])
    for table in tables:
        if table['name'] == METADATA_TABLE.name:
            columns = table.get('columns', [])
            for column in columns:
                if column['key'] == METADATA_TABLE.columns.ocr.key:
                    metadata_server_api.delete_column(table['id'], METADATA_TABLE.columns.ocr.key, True)


def get_file_download_token(repo_id, file_id, username):
    return seafile_api.get_fileserver_access_token(repo_id, file_id, 'download', username, use_onetime=True)


def can_read_metadata(request, repo_id):
    permission = check_folder_permission(request, repo_id, '/')
    if permission:
        return True
    return False


def get_column_valid_value(column, value):
    from seafevents.repo_metadata.constants import PropertyTypes
    if value and column['type'] == PropertyTypes.DATE:
        column_data = column.get('data', {})
        format = column_data.get('format', 'YYYY-MM-DD')
        saved_format = '%Y-%m-%d'
        if 'HH:mm:ss' in format:
            saved_format = '%Y-%m-%d %H:%M:%S'
        elif 'HH:mm' in format:
            saved_format = '%Y-%m-%d %H:%M'

        datetime_obj = datetime.strptime(value, saved_format)
        return datetime_to_isoformat_timestr(datetime_obj)

    if column['type'] == PropertyTypes.SINGLE_SELECT and not value:
        return None

    return value


def get_update_record(update={}, columns=[], unmodifiable_column_names=[]):
    if not update:
        return None

    update_record = {}
    for column_name, value in update.items():
        if column_name not in unmodifiable_column_names:
            try:
                column = next(column for column in columns if column['name'] == column_name)
                valid_value = get_column_valid_value(column, value)
                update_record[column_name] = valid_value
            except Exception as e:
                pass

    return update_record
