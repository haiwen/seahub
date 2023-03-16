import os
import jwt
import json
import time
import uuid
import logging
import posixpath

from seaserv import seafile_api

from seahub.tags.models import FileUUIDMap
from seahub.settings import SEADOC_SERVER_URL, SEADOC_PRIVATE_KEY, SEADOC_USE_INNER_SEAF_SERVER
from seahub.utils import normalize_dir_path, normalize_file_path, \
    gen_inner_file_get_url, gen_inner_file_upload_url, gen_file_get_url, gen_file_upload_url

logger = logging.getLogger(__name__)


def uuid_str_to_32_chars(file_uuid):
    if len(file_uuid) == 36:
        return uuid.UUID(file_uuid).hex
    else:
        return file_uuid


def uuid_str_to_36_chars(file_uuid):
    if len(file_uuid) == 32:
        return str(uuid.UUID(file_uuid))
    else:
        return file_uuid


def gen_seadoc_access_token(file_uuid, username, permission='rw'):
    access_token = jwt.encode({
        'file_uuid': file_uuid,
        'username': username,
        'permission': permission,
        'exp': int(time.time()) + 3 * 24 * 60 * 60,  # 3 days
    },
        SEADOC_PRIVATE_KEY,
        algorithm='HS256'
    )
    return access_token


def is_valid_seadoc_access_token(auth, file_uuid, return_payload=False):
    """
    can decode a valid jwt payload
    """
    is_valid, payload = False, None
    if not auth or auth[0].lower() != 'token' or len(auth) != 2:
        return (is_valid, payload) if return_payload else is_valid

    token = auth[1]
    if not token or not file_uuid:
        return (is_valid, payload) if return_payload else is_valid

    try:
        payload = jwt.decode(token, SEADOC_PRIVATE_KEY, algorithms=['HS256'])
    except:
        is_valid = False
    else:
        file_uuid_in_payload = payload.get('file_uuid')

        if not file_uuid_in_payload:
            is_valid = False
        elif uuid_str_to_36_chars(file_uuid_in_payload) != uuid_str_to_36_chars(file_uuid):
            is_valid = False
        else:
            is_valid = True

    if return_payload:
        return is_valid, payload
    return is_valid


def get_seadoc_file_uuid(repo, parent_dir, filename):
    repo_id = repo.repo_id
    if repo.is_virtual:
        repo_id = repo.origin_repo_id
        path = posixpath.join(repo.origin_path, path.strip('/'))

        path = normalize_file_path(path)
        parent_dir = os.path.dirname(path)
        filename = os.path.basename(path)

    uuid_map = FileUUIDMap.objects.get_or_create_fileuuidmap(
        repo_id, parent_dir, filename, is_dir=False)

    file_uuid = str(uuid_map.uuid)  # 36 chars str
    return file_uuid


def get_seadoc_upload_link(uuid_map):
    repo_id = uuid_map.repo_id
    parent_path = uuid_map.parent_path

    obj_id = json.dumps({'parent_dir': parent_path})
    token = seafile_api.get_fileserver_access_token(
        repo_id, obj_id, 'upload', '', use_onetime=True)
    if not token:
        return None
    if SEADOC_USE_INNER_SEAF_SERVER:
        upload_link = gen_inner_file_upload_url(
            token, 'upload-api', replace=True)
    else:
        upload_link = gen_file_upload_url(
            token, 'upload-api', replace=True)
    return upload_link


def get_seadoc_download_link(uuid_map):
    repo_id = uuid_map.repo_id
    parent_path = uuid_map.parent_path
    filename = uuid_map.filename
    file_path = posixpath.join(parent_path, filename)

    obj_id = seafile_api.get_file_id_by_path(repo_id, file_path)
    if not obj_id:
        return None
    token = seafile_api.get_fileserver_access_token(
        repo_id, obj_id, 'view', '', use_onetime=False)
    if not token:
        return None
    if SEADOC_USE_INNER_SEAF_SERVER:
        download_link = gen_inner_file_get_url(token, filename)
    else:
        download_link = gen_file_get_url(token, filename)
    return download_link


def rename_seadoc_file():
    return


def batch_move_seadoc_files():
    return
