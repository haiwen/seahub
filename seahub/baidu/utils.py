import os
import jwt
import time
import uuid
import logging
import posixpath

from seahub.tags.models import FileUUIDMap
from seahub.settings import SECRET_KEY
from seahub.utils import normalize_file_path
from seahub.utils.auth import AUTHORIZATION_PREFIX
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.avatar.templatetags.avatar_tags import api_avatar_url

logger = logging.getLogger(__name__)

# 使用 SECRET_KEY 作为百度网盘 JWT 的签名密钥
# 在生产环境中，建议使用独立的密钥
BAIDU_PRIVATE_KEY = SECRET_KEY


def uuid_str_to_32_chars(file_uuid):
    """Convert UUID string to 32 characters format"""
    if len(file_uuid) == 36:
        return uuid.UUID(file_uuid).hex
    else:
        return file_uuid


def uuid_str_to_36_chars(file_uuid):
    """Convert UUID string to 36 characters format"""
    if len(file_uuid) == 32:
        return str(uuid.UUID(file_uuid))
    else:
        return file_uuid


def gen_baidu_access_token(
    file_uuid, filename, username, permission="rw", operation="sync"
):
    """
    Generate JWT access token for Baidu Netdisk integration

    Args:
        file_uuid: File UUID in Seafile
        filename: File name
        username: User name
        permission: Permission level (r/rw)
        operation: Operation type (sync/upload/download)

    Returns:
        JWT token string
    """
    name = email2nickname(username)
    url, is_default, date_uploaded = api_avatar_url(username)

    access_token = jwt.encode(
        {
            "file_uuid": file_uuid,
            "filename": filename,
            "username": username,
            "name": name,
            "avatar_url": url,
            "permission": permission,
            "operation": operation,
            "service": "baidu_netdisk",
            "exp": int(time.time()) + 86400 * 3,  # 3 days expiration
        },
        BAIDU_PRIVATE_KEY,
        algorithm="HS256",
    )
    return access_token


def is_valid_baidu_access_token(auth, file_uuid, return_payload=False):
    """
    Validate Baidu Netdisk access token

    Args:
        auth: Authorization header split result
        file_uuid: File UUID to validate against
        return_payload: Whether to return payload

    Returns:
        bool or (bool, dict) if return_payload=True
    """
    is_valid, payload = False, None

    if not auth or auth[0].lower() not in AUTHORIZATION_PREFIX or len(auth) != 2:
        return (is_valid, payload) if return_payload else is_valid

    token = auth[1]
    if not token or not file_uuid:
        return (is_valid, payload) if return_payload else is_valid

    try:
        payload = jwt.decode(token, BAIDU_PRIVATE_KEY, algorithms=["HS256"])
    except Exception as e:
        logger.error("Failed to decode Baidu JWT: %s" % e)
        is_valid = False
    else:
        file_uuid_in_payload = payload.get("file_uuid")
        service_in_payload = payload.get("service")

        if not file_uuid_in_payload:
            is_valid = False
        elif service_in_payload != "baidu_netdisk":
            is_valid = False
        elif uuid_str_to_36_chars(file_uuid_in_payload) != uuid_str_to_36_chars(
            file_uuid
        ):
            is_valid = False
        else:
            is_valid = True

    if return_payload:
        return is_valid, payload
    return is_valid


def get_baidu_file_uuid(repo, path):
    """
    Get or create file UUID for Baidu Netdisk integration

    Args:
        repo: Seafile repository object
        path: File path in repository

    Returns:
        File UUID string
    """
    path = normalize_file_path(path)
    parent_dir = os.path.dirname(path)
    filename = os.path.basename(path)

    if repo.is_virtual:
        repo_id = repo.origin_repo_id
        path = posixpath.join(repo.origin_path, path.strip("/"))
        path = normalize_file_path(path)
        parent_dir = os.path.dirname(path)
        filename = os.path.basename(path)
    else:
        repo_id = repo.id

    uuid_map = FileUUIDMap.objects.get_or_create_fileuuidmap(
        repo_id, parent_dir, filename, is_dir=False
    )
    return str(uuid_map.uuid)
