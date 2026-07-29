import jwt
import time
import requests
import json
import random
import posixpath
import stat
from urllib.parse import urljoin
from datetime import datetime

from seahub.settings import SECRET_KEY, SEAFEVENTS_SERVER_URL
from seahub.views import check_folder_permission
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.constants import PERMISSION_INVISIBLE

from seaserv import seafile_api

FACES_SAVE_PATH = '_Internal/Faces'

AI_SUMMARY_METADATA_QUERY_BATCH_SIZE = 500

# fake metadata for metadata views of repo without metadata enabled, to avoid frontend error. 
# The metadata is not real and only used for display.
FAKE_METADATA = [
        {
            "key": "_id",
            "name": "_id",
            "type": "text",
            "data": None
        },
        
        {
            "key": "_last_modifier",
            "name": "_last_modifier",
            "type": "text",
            "data": None
        },
        {
            "key": "_mtime",
            "name": "_mtime",
            "type": "date",
            "data": None
        },
        
        {
            "key": "_file_modifier",
            "name": "_file_modifier",
            "type": "text",
            "data": None
        },
        {
            "key": "_file_mtime",
            "name": "_file_mtime",
            "type": "date",
            "data": None
        },
        {
            "key": "_parent_dir",
            "name": "_parent_dir",
            "type": "text",
            "data": None
        },
        {
            "key": "_name",
            "name": "_name",
            "type": "text",
            "data": None
        },
        {
            "key": "_is_dir",
            "name": "_is_dir",
            "type": "checkbox",
            "data": None
        },

        {
            "key": "_obj_id",
            "name": "_obj_id",
            "type": "text",
            "data": None
        },
        {
            "key": "_size",
            "name": "_size",
            "type": "number",
            "data": None
        },
        {
            "key": "_suffix",
            "name": "_suffix",
            "type": "text",
            "data": None
        },
         
    ]


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


def add_init_ai_summary_task(params):
    payload = {'exp': int(time.time()) + 300, }
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    headers = {"Authorization": "Token %s" % token}
    url = urljoin(SEAFEVENTS_SERVER_URL, '/add-init-ai-summary-task')
    resp = requests.get(url, params=params, headers=headers)
    return json.loads(resp.content).get('task_id')


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


def init_ai_summary(metadata_server_api):
    from seafevents.repo_metadata.constants import METADATA_TABLE

    columns = metadata_server_api.list_columns(METADATA_TABLE.id).get('columns', [])
    column_keys = {column.get('key') for column in columns}
    ai_summary_columns = []

    for column in [METADATA_TABLE.columns.ai_summary, METADATA_TABLE.columns.ai_summary_mtime]:
        if column.key not in column_keys:
            ai_summary_columns.append(column.to_dict())

    if ai_summary_columns:
        metadata_server_api.add_columns(METADATA_TABLE.id, ai_summary_columns)


def remove_ai_summary(metadata_server_api):
    from seafevents.repo_metadata.constants import METADATA_TABLE

    columns = metadata_server_api.list_columns(METADATA_TABLE.id).get('columns', [])
    for column in columns:
        if column.get('key') in [
            METADATA_TABLE.columns.ai_summary.key,
            METADATA_TABLE.columns.ai_summary_mtime.key,
        ]:
            metadata_server_api.delete_column(METADATA_TABLE.id, column['key'], True)


def _list_files_for_ai_summary(repo_id, username, path):
    files = []
    pending_paths = [path]

    while pending_paths:
        current_path = pending_paths.pop()
        dir_id = seafile_api.get_dir_id_by_path(repo_id, current_path)
        if not dir_id:
            if current_path == path:
                return None
            continue

        dirents = seafile_api.list_dir_with_perm(repo_id, current_path, dir_id, username, -1, -1)
        for dirent in dirents:
            if dirent.permission == PERMISSION_INVISIBLE:
                continue

            if current_path == '/' and dirent.obj_name in ('_Internal', 'images'):
                continue

            entry_path = posixpath.join(current_path, dirent.obj_name)
            if stat.S_ISDIR(dirent.mode):
                pending_paths.append(entry_path)
                continue

            files.append({
                'file_id': dirent.obj_id,
                'file_name': dirent.obj_name,
                'path': entry_path,
            })

    return files


def _get_ai_summary_metadata_by_obj_ids(repo_id, username, obj_ids, metadata_table):
    if not obj_ids:
        return {}

    from seahub.repo_metadata.metadata_server_api import MetadataServerAPI

    metadata_server_api = MetadataServerAPI(repo_id, username)
    rows = []
    for start in range(0, len(obj_ids), AI_SUMMARY_METADATA_QUERY_BATCH_SIZE):
        obj_id_batch = obj_ids[start:start + AI_SUMMARY_METADATA_QUERY_BATCH_SIZE]
        sql = (
            f'SELECT `{metadata_table.columns.obj_id.name}`, '
            f'`{metadata_table.columns.ai_summary.name}`, '
            f'`{metadata_table.columns.ai_summary_mtime.name}` '
            f'FROM `{metadata_table.name}` '
            f'WHERE `{metadata_table.columns.obj_id.name}` IN ({", ".join(["?"] * len(obj_id_batch))});'
        )
        rows.extend(metadata_server_api.query_rows(sql, obj_id_batch).get('results', []))

    return {
        row.get(metadata_table.columns.obj_id.name): row
        for row in rows
        if row.get(metadata_table.columns.obj_id.name)
    }


def _is_ai_summary_mtime_valid(ai_summary_mtime):
    if not isinstance(ai_summary_mtime, str) or not ai_summary_mtime:
        return False
    try:
        datetime.fromisoformat(ai_summary_mtime.replace('Z', '+00:00'))
        return True
    except (TypeError, ValueError):
        return False


def list_file_summaries(repo_id, username, path):
    from seahub.repo_metadata.models import RepoMetadata

    files = _list_files_for_ai_summary(repo_id, username, path)
    if files is None:
        return None

    metadata_by_obj_id = {}
    metadata_table = None
    metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
    if metadata and metadata.enabled and metadata.summary_enabled:
        from seafevents.repo_metadata.constants import METADATA_TABLE

        metadata_table = METADATA_TABLE
        metadata_by_obj_id = _get_ai_summary_metadata_by_obj_ids(
            repo_id, username, [file_info['file_id'] for file_info in files], metadata_table)

    results = []
    uncomparable_files = []
    stats = {
        'requested_path': path,
        'returned_file_count': len(files),
        'valid_summary_count': 0,
        'summary_missing_count': 0,
        'summary_empty_count': 0,
        'summary_mtime_invalid_count': 0,
    }
    for file_info in files:
        metadata = metadata_by_obj_id.get(file_info['file_id'])
        if not metadata:
            stats['summary_missing_count'] += 1
            uncomparable_files.append({**file_info, 'reason': 'ai_summary_missing'})
            continue

        ai_summary = metadata.get(metadata_table.columns.ai_summary.name)
        if not isinstance(ai_summary, str) or not ai_summary.strip():
            stats['summary_empty_count'] += 1
            uncomparable_files.append({**file_info, 'reason': 'ai_summary_empty'})
            continue

        ai_summary_mtime = metadata.get(metadata_table.columns.ai_summary_mtime.name)
        if not _is_ai_summary_mtime_valid(ai_summary_mtime):
            stats['summary_mtime_invalid_count'] += 1
            uncomparable_files.append({**file_info, 'reason': 'ai_summary_mtime_invalid'})
            continue

        results.append({
            **file_info,
            'ai_summary': ai_summary.strip(),
            'ai_summary_mtime': ai_summary_mtime,
        })
        stats['valid_summary_count'] += 1

    return {
        'files': results,
        'uncomparable_files': uncomparable_files,
        'traversal_stats': stats,
    }


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
