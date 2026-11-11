import posixpath
import json
from types import SimpleNamespace


def get_share_upload_access(request, share, file_path):
    """Capture the verified sharing context inside the signed document JWT."""
    from seahub.share.models import get_share_link_password_version
    from django.utils.crypto import salted_hmac

    return {
        'token': share.token,
        'path': file_path,
        'password_version': get_share_link_password_version(share),
        'scope_version': salted_hmac('document-share-scope', json.dumps(
            [share.user_scope, share.authed_details]), algorithm='sha256').hexdigest(),
        'username': request.user.username if request.user.is_authenticated else '',
        'email': request.session.get('link_authed_email_%s' % share.token),
    }


def can_upload_document_asset(payload, uuid_map, get_document_uuid):
    """Recheck current authority instead of trusting a stale JWT's rw claim."""
    from seaserv import seafile_api
    from seahub.settings import SHARE_LINK_LOGIN_REQUIRED
    from seahub.share.models import FileShare, get_share_link_password_version, check_share_link_access_by_scope
    from seahub.utils.repo import parse_repo_perm
    from django.utils.crypto import salted_hmac, constant_time_compare

    if payload.get('permission') != 'rw':
        return False
    path = posixpath.join(uuid_map.parent_path, uuid_map.filename)
    if not seafile_api.get_file_id_by_path(uuid_map.repo_id, path):
        return False
    # A repository-wide read-only state must also override share edit rights.
    if seafile_api.get_repo_status(uuid_map.repo_id) == 1:
        return False
    access = payload.get('share_access')
    if access is None:
        username = payload.get('username')
        if not username:
            return False
        permission = seafile_api.check_permission_by_path(uuid_map.repo_id, path, username)
        return bool(permission and parse_repo_perm(permission).can_edit_on_web)
    if not isinstance(access, dict):
        return False
    share = FileShare.objects.get_valid_file_link_by_token(access.get('token'))
    if not share or not share.get_permissions().get('can_edit'):
        return False
    password_version = access.get('password_version')
    if not isinstance(password_version, str) or not constant_time_compare(
            password_version, get_share_link_password_version(share)):
        return False
    scope_version = salted_hmac('document-share-scope', json.dumps(
        [share.user_scope, share.authed_details]), algorithm='sha256').hexdigest()
    if access.get('scope_version') != scope_version:
        return False
    username = access.get('username') or ''
    if SHARE_LINK_LOGIN_REQUIRED and not username:
        return False
    request = SimpleNamespace(user=SimpleNamespace(username=username), session={
        'link_authed_email_%s' % share.token: access.get('email')})
    if not check_share_link_access_by_scope(request, share):
        return False
    shared_path = access.get('path')
    if not isinstance(shared_path, str) or not shared_path.startswith('/'):
        return False
    shared_path = posixpath.normpath(shared_path)
    if share.is_dir_share_link():
        root = posixpath.normpath(share.path)
        if posixpath.commonpath([root, shared_path]) != root:
            return False
    elif shared_path != posixpath.normpath(share.path):
        return False
    repo = seafile_api.get_repo(share.repo_id)
    if not repo or not seafile_api.get_file_id_by_path(share.repo_id, shared_path):
        return False
    return get_document_uuid(repo, shared_path) == payload.get('file_uuid')


def secure_svg_response(response):
    response['Content-Security-Policy'] = "sandbox; default-src 'none'; style-src 'unsafe-inline'"
    response['X-Content-Type-Options'] = 'nosniff'
    return response


def is_valid_asset_filename(filename):
    """Only accept a single, unambiguous attachment filename."""
    return (isinstance(filename, str) and bool(filename)
            and filename not in ('.', '..')
            and not any(char in filename for char in ('/', '\\', '%'))
            and not any(ord(char) < 32 or ord(char) == 127 for char in filename))


def get_asset_path(parent_path, filename):
    if not is_valid_asset_filename(filename):
        return None
    parent_path = posixpath.normpath(parent_path)
    path = posixpath.normpath(posixpath.join(parent_path, filename))
    if posixpath.dirname(path) != parent_path:
        return None
    return path
