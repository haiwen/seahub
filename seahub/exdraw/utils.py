import os
import jwt
import json
import time
import logging
import posixpath

from seaserv import seafile_api

from seahub.constants import PERMISSION_INVISIBLE
from seahub.exdraw.settings import EXDRAW_IMAGES_DIR
from seahub.tags.models import FileUUIDMap
from seahub.settings import EXCALIDRAW_PRIVATE_KEY
from seahub.utils import normalize_file_path, gen_file_get_url, gen_file_upload_url, gen_inner_file_get_url
from seahub.utils.auth import AUTHORIZATION_PREFIX
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.avatar.templatetags.avatar_tags import api_avatar_url
from seahub.utils import uuid_str_to_36_chars
from seahub.views import check_folder_permission

logger = logging.getLogger(__name__)


def gen_exdraw_access_token(file_uuid, filename, username, permission='rw'):
    name = email2nickname(username)
    url, is_default, date_uploaded = api_avatar_url(username)
    access_token = jwt.encode({
        'file_uuid': file_uuid,
        'filename': filename,
        'username': username,
        'name': name,
        'avatar_url': url,
        'permission': permission,
        'exp': int(time.time()) + 86400 * 3,  # 3 days
    },
        EXCALIDRAW_PRIVATE_KEY,
        algorithm='HS256'
    )
    return access_token


def is_valid_exdraw_access_token(auth, file_uuid, return_payload=False):
    """
    can decode a valid jwt payload
    """
    is_valid, payload = False, None
    if not auth or auth[0].lower() not in AUTHORIZATION_PREFIX or len(auth) != 2:
        return (is_valid, payload) if return_payload else is_valid

    token = auth[1]
    if not token or not file_uuid:
        return (is_valid, payload) if return_payload else is_valid

    try:
        payload = jwt.decode(token, EXCALIDRAW_PRIVATE_KEY, algorithms=['HS256'])
    except Exception as e:
        logger.error('Failed to decode jwt: %s' % e)
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


def get_exdraw_file_uuid(repo, path):
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


def get_exdraw_upload_link(uuid_map, last_modify_user=''):
    repo_id = uuid_map.repo_id
    parent_path = uuid_map.parent_path

    obj_id = json.dumps({'online_office_update': True, 'parent_dir': parent_path})
    token = seafile_api.get_fileserver_access_token(
        repo_id, obj_id, 'update', last_modify_user, use_onetime=True)
    if not token:
        return None
    upload_link = gen_file_upload_url(token, 'update-api')
    return upload_link


def get_exdraw_download_link(uuid_map, is_inner=False):
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

    if is_inner:
        download_link = gen_inner_file_get_url(token, filename)
    else:
        download_link = gen_file_get_url(token, filename)

    return download_link

def gen_exdraw_image_parent_path(file_uuid, repo_id, username):
    parent_path = EXDRAW_IMAGES_DIR + file_uuid + '/'
    dir_id = seafile_api.get_dir_id_by_path(repo_id, parent_path)
    if not dir_id:
        seafile_api.mkdir_with_parents(repo_id, '/', parent_path[1:], username)
    return parent_path

def get_exdraw_asset_upload_link(repo_id, parent_path, username):
    obj_id = json.dumps({'parent_dir': parent_path})
    token = seafile_api.get_fileserver_access_token(
        repo_id, obj_id, 'upload-link', username, use_onetime=False)
    if not token:
        return None
    upload_link = gen_file_upload_url(token, 'upload-api')
    upload_link = upload_link + '?replace=1'
    return upload_link

def get_exdraw_asset_download_link(repo_id, parent_path, filename, username):
    file_path = posixpath.join(parent_path, filename)
    obj_id = seafile_api.get_file_id_by_path(repo_id, file_path)
    if not obj_id:
        return None
    token = seafile_api.get_fileserver_access_token(
        repo_id, obj_id, 'view', username, use_onetime=False)
    if not token:
        return None
    download_link = gen_file_get_url(token, filename)
    return download_link
