import os
import jwt
import json
import time
import uuid
import logging
import posixpath

from seaserv import seafile_api

from seahub.tags.models import FileUUIDMap
from seahub.settings import SEADOC_PRIVATE_KEY
from seahub.utils import normalize_file_path, gen_file_get_url, gen_file_upload_url
from seahub.views import check_folder_permission
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.avatar.templatetags.avatar_tags import api_avatar_url
from seahub.seadoc.models import SeadocRevision

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


def gen_seadoc_access_token(file_uuid, filename, username, permission='rw'):
    name = email2nickname(username)
    url, is_default, date_uploaded = api_avatar_url(username, 72)
    access_token = jwt.encode({
        'file_uuid': file_uuid,
        'filename': filename,
        'username': username,
        'name': name,
        'avatar_url': url,
        'permission': permission,
        'exp': int(time.time()) + 86400 * 3,  # 3 days
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


def get_seadoc_file_uuid(repo, path):
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


def get_seadoc_upload_link(uuid_map, last_modify_user=''):
    repo_id = uuid_map.repo_id
    parent_path = uuid_map.parent_path

    obj_id = json.dumps({'parent_dir': parent_path})
    token = seafile_api.get_fileserver_access_token(
        repo_id, obj_id, 'update', last_modify_user, use_onetime=True)
    if not token:
        return None
    upload_link = gen_file_upload_url(token, 'update-api')
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
    
    download_link = gen_file_get_url(token, filename)
    return download_link


def gen_seadoc_image_parent_path(file_uuid, repo_id, username):
    parent_path = '/images/sdoc/' + file_uuid + '/'
    dir_id = seafile_api.get_dir_id_by_path(repo_id, parent_path)
    if not dir_id:
        seafile_api.mkdir_with_parents(repo_id, '/', parent_path[1:], username)
    return parent_path


def get_seadoc_asset_upload_link(repo_id, parent_path, username):
    obj_id = json.dumps({'parent_dir': parent_path})
    token = seafile_api.get_fileserver_access_token(
        repo_id, obj_id, 'upload-link', username, use_onetime=True)
    if not token:
        return None
    upload_link = gen_file_upload_url(token, 'upload-api')
    upload_link = upload_link + '?replace=1'
    return upload_link


def get_seadoc_asset_download_link(repo_id, parent_path, filename, username):
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


def can_access_seadoc_asset(request, repo_id, path, file_uuid):
    # login user
    if request.user.username and check_folder_permission(request, repo_id, path):
        return True
    # share link
    seadoc_share_session = request.session.get('seadoc_share_session')
    if seadoc_share_session and seadoc_share_session.get('file_uuid') == file_uuid:
        return True

    return False

def is_seadoc_revision(doc_uuid, revision=None):
    info = {}
    if not revision:
        revision = SeadocRevision.objects.get_by_doc_uuid(doc_uuid)
    if revision:
        info = {'is_sdoc_revision': True}
        revision_info = revision.to_dict()
        info['revision_id'] = revision_info['revision_id']
        info['origin_doc_uuid'] = revision_info['origin_doc_uuid']
        info['origin_parent_path'] = revision_info['origin_parent_path']
        info['origin_filename'] = revision_info['origin_filename']
        info['origin_file_path'] = revision_info['origin_file_path']
        info['origin_file_version'] = revision_info['origin_file_version']
        info['publish_file_version'] = revision_info['publish_file_version']
        info['publisher'] = revision_info['publisher']
        info['publisher_nickname'] = revision_info['publisher_nickname']
        info['is_published'] = revision_info['is_published']
        info['revision_created_at'] = revision_info['created_at']
        info['revision_updated_at'] = revision_info['updated_at']
    else:
        info = {'is_sdoc_revision': False}
    return info

def gen_path_link(path, repo_name):
    """
    Generate navigate paths and links in repo page.

    """
    if path and path[-1] != '/':
        path += '/'

    paths = []
    links = []
    if path and path != '/':
        paths = path[1:-1].split('/')
        i = 1
        for name in paths:
            link = '/' + '/'.join(paths[:i])
            i = i + 1
            links.append(link)
    if repo_name:
        paths.insert(0, repo_name)
        links.insert(0, '/')

    zipped = list(zip(paths, links))

    return zipped


def copy_sdoc_images_to_different_repo(src_repo_id, src_path, dst_repo_id, dst_path, username, is_async=True):
    src_repo = seafile_api.get_repo(src_repo_id)
    src_file_uuid = get_seadoc_file_uuid(src_repo, src_path)
    src_image_parent_path = '/images/sdoc/' + src_file_uuid + '/'
    src_dir_id = seafile_api.get_dir_id_by_path(src_repo_id, src_image_parent_path)
    if not src_dir_id:
        return
    dst_repo = seafile_api.get_repo(dst_repo_id)
    dst_file_uuid = get_seadoc_file_uuid(dst_repo, dst_path)
    dst_image_parent_path = gen_seadoc_image_parent_path(
        dst_file_uuid, dst_repo_id, username=username)
    image_dirents = seafile_api.list_dir_by_path(src_repo_id, src_image_parent_path)
    image_names = [item.obj_name for item in image_dirents]

    if is_async:
        need_progress=1
        synchronous=0
    else:
        need_progress=0
        synchronous=1
    seafile_api.copy_file(
        src_repo_id, src_image_parent_path,
        json.dumps(image_names),
        dst_repo_id, dst_image_parent_path,
        json.dumps(image_names),
        username=username,
        need_progress=need_progress, synchronous=synchronous,
    )
    return


def move_sdoc_images_to_different_repo(src_repo_id, src_path, dst_repo_id, dst_path, username, is_async=True):
    src_repo = seafile_api.get_repo(src_repo_id)
    src_file_uuid = get_seadoc_file_uuid(src_repo, src_path)
    src_image_parent_path = '/images/sdoc/' + src_file_uuid + '/'
    src_dir_id = seafile_api.get_dir_id_by_path(src_repo_id, src_image_parent_path)
    if not src_dir_id:
        return
    dst_repo = seafile_api.get_repo(dst_repo_id)
    dst_file_uuid = get_seadoc_file_uuid(dst_repo, dst_path)
    dst_image_parent_path = gen_seadoc_image_parent_path(
        dst_file_uuid, dst_repo_id, username=username)
    image_dirents = seafile_api.list_dir_by_path(src_repo_id, src_image_parent_path)
    image_names = [item.obj_name for item in image_dirents]

    if is_async:
        need_progress=1
        synchronous=0
    else:
        need_progress=0
        synchronous=1
    seafile_api.move_file(
        src_repo_id, src_image_parent_path,
        json.dumps(image_names),
        dst_repo_id, dst_image_parent_path,
        json.dumps(image_names),
        replace=False, username=username,
        need_progress=need_progress, synchronous=synchronous,
    )
    return
