"""Read-only whiteboard gateway for sdoc share links.

Targets are restricted by the share creator's permissions, not by sdoc JSON.
"""
import json
import logging
import posixpath
import time
import uuid
from urllib.parse import unquote, urlencode, urlsplit, parse_qs

import jwt
import requests
from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.http import Http404, JsonResponse, StreamingHttpResponse
from django.shortcuts import render
from django.urls import reverse
from django.views.decorators.cache import never_cache
from seaserv import seafile_api

from seahub.exdraw.settings import EXDRAW_IMAGES_DIR, FILE_TYPE_MIMETYPE_MAPPING
from seahub.share.models import FileShare, check_share_link_common, check_share_link_access_by_scope
from seahub.tags.models import FileUUIDMap
from seahub.utils import get_file_type_and_ext, get_service_url, gen_inner_file_get_url
from seahub.utils.file_types import SEADOC, EXCALIDRAW
from seahub.utils.repo import parse_repo_perm

logger = logging.getLogger(__name__)
MAX_IMAGE_BYTES = 50 * 1024 * 1024


def canonical_uuid(value):
    try:
        return str(uuid.UUID(value))
    except (ValueError, TypeError, AttributeError):
        raise Http404


def normalized_path(path):
    if not isinstance(path, str) or not path.startswith('/') or '\x00' in path or '\\' in path:
        raise PermissionDenied
    return posixpath.normpath('/' + path.lstrip('/'))


def resource(repo_id, path):
    """Return an existing unencrypted file, without generating a public URL."""
    repo = seafile_api.get_repo(repo_id)
    if not repo or repo.encrypted:
        raise PermissionDenied
    path = normalized_path(path)
    file_id = seafile_api.get_file_id_by_path(repo_id, path)
    if not file_id:
        raise Http404
    return repo, path, file_id


def origin_location(repo, path):
    if repo.is_virtual:
        return repo.origin_repo_id, normalized_path(posixpath.join(repo.origin_path, path.lstrip('/')))
    return repo.repo_id, path


def creator_can_read(repo, path, username, allow_share=True):
    """Check the named creator, including a virtual subfolder permission view."""
    permission = seafile_api.check_permission_by_path(repo.repo_id, path, username)
    if not permission:
        converted = seafile_api.convert_repo_path(repo.repo_id, path, username, bool(repo.org_id and repo.org_id > 0))
        if converted:
            view = json.loads(converted)
            view_repo = seafile_api.get_repo(view['repo_id'])
            view_path = normalized_path(view['path'])
            if not view_repo or view_repo.encrypted:
                raise PermissionDenied
            if origin_location(view_repo, view_path) != origin_location(repo, path):
                raise PermissionDenied
            permission = seafile_api.check_permission_by_path(view_repo.repo_id, view_path, username)
    if not permission:
        raise PermissionDenied
    perms = parse_repo_perm(permission)
    if not perms.can_preview or (allow_share and (not perms.can_download or not perms.can_generate_share_link)):
        raise PermissionDenied


def uuid_resource(file_uuid, expected_type):
    mapping = FileUUIDMap.objects.get_fileuuidmap_by_uuid(canonical_uuid(file_uuid))
    if not mapping or mapping.is_dir or get_file_type_and_ext(mapping.filename)[0] != expected_type:
        raise Http404
    repo, path, file_id = resource(mapping.repo_id, posixpath.join(mapping.parent_path, mapping.filename))
    return mapping, repo, path, file_id


def authorize_share(request, share_token, sdoc_uuid, file_uuid):
    if getattr(settings, 'SHARE_LINK_LOGIN_REQUIRED', False) and not request.user.is_authenticated:
        raise PermissionDenied
    share = FileShare.objects.get_valid_file_link_by_token(share_token)
    if not share or share.is_expired():
        raise PermissionDenied
    if not check_share_link_access_by_scope(request, share):
        raise PermissionDenied
    if not check_share_link_common(request, share)[0]:
        raise PermissionDenied

    unused, parent_repo, parent_path, unused_id = uuid_resource(sdoc_uuid, SEADOC)
    shared_repo = seafile_api.get_repo(share.repo_id)
    if not shared_repo or shared_repo.encrypted or shared_repo.org_id != parent_repo.org_id:
        raise PermissionDenied
    shared_origin, shared_path = origin_location(shared_repo, normalized_path(share.path))
    parent_origin, actual_path = origin_location(parent_repo, parent_path)
    if shared_origin != parent_origin:
        raise PermissionDenied
    if share.s_type == 'f':
        if actual_path != shared_path:
            raise PermissionDenied
    elif share.s_type == 'd':
        if not actual_path.startswith(shared_path.rstrip('/') + '/'):
            raise PermissionDenied
    else:
        raise PermissionDenied
    creator_can_read(shared_repo, normalized_path(share.path), share.username, allow_share=False)
    creator_can_read(parent_repo, parent_path, share.username, allow_share=False)

    mapping, repo, path, file_id = uuid_resource(file_uuid, EXCALIDRAW)
    if repo.org_id != parent_repo.org_id:
        raise PermissionDenied
    creator_can_read(repo, path, share.username)
    return share, mapping, repo, path, file_id


def server_read(share, mapping):
    key = settings.EXCALIDRAW_PRIVATE_KEY
    if not key:
        raise RuntimeError('Whiteboard signing key is not configured')
    now = int(time.time())
    payload = {
        'iss': 'seahub', 'aud': 'sdoc-server-shared-exdraw',
        'purpose': 'shared-exdraw-read', 'share_id': share.pk,
        'shared_by': share.username, 'file_uuid': str(mapping.uuid),
        'filename': mapping.filename, 'permission': 'r', 'operation': 'read_scene',
        'iat': now, 'exp': now + 60,
    }
    token = jwt.encode(payload, key, algorithm='HS256')
    url = '%s/api/internal/v1/shared-exdraw/%s/scene/' % (
        settings.EXCALIDRAW_SERVER_URL.rstrip('/'), mapping.uuid)
    response = requests.get(url, headers={'Authorization': 'Bearer ' + token},
                            timeout=30, allow_redirects=False)
    try:
        if response.status_code == 404:
            raise Http404
        if response.status_code != 200:
            raise RuntimeError('Shared whiteboard upstream rejected request')
        data = response.json()
        if not isinstance(data, dict):
            raise ValueError('Invalid scene response')
        return data
    finally:
        response.close()


def library_image_location(data_url):
    if not isinstance(data_url, str):
        raise PermissionDenied
    service = urlsplit(get_service_url().rstrip('/'))
    image = urlsplit(data_url)
    prefix = '%s/lib/' % service.path
    if (image.scheme != service.scheme or image.netloc != service.netloc or
            not image.path.startswith(prefix) or parse_qs(image.query).get('raw') != ['1']):
        raise PermissionDenied
    parts = image.path[len(prefix):].split('/file/', 1)
    if len(parts) != 2:
        raise PermissionDenied
    return canonical_uuid(parts[0]), normalized_path('/' + unquote(parts[1]))


def image_selector(element):
    """Keep the existing filename / library path image addressing convention."""
    if element.get('dataURL'):
        unused, path = library_image_location(element['dataURL'])
        return {'path': path}
    filename = element.get('filename')
    if (not isinstance(filename, str) or not filename or filename != posixpath.basename(filename) or
            '\\' in filename or '\x00' in filename):
        raise PermissionDenied
    return {'filename': filename}


def referenced_image(scene, selector):
    matches = []
    for element in scene.get('elements', []):
        if not isinstance(element, dict) or element.get('type') != 'image' or element.get('isDeleted'):
            continue
        try:
            if image_selector(element) == selector:
                matches.append(element)
        except (PermissionDenied, Http404, ValueError):
            continue
    if not matches:
        raise PermissionDenied
    # A path without a repo parameter must never choose between different sources.
    sources = {(element.get('filename'), element.get('dataURL')) for element in matches}
    if len(sources) != 1:
        raise PermissionDenied
    return matches[0]


def image_resource(descriptor, mapping, repo, username):
    data_url = descriptor.get('dataURL')
    if data_url:
        repo_id, path = library_image_location(data_url)
        image_repo, path, file_id = resource(repo_id, path)
        if origin_location(image_repo, path)[0] != origin_location(repo, '/')[0] or image_repo.org_id != repo.org_id:
            raise PermissionDenied
        creator_can_read(image_repo, path, username)
    else:
        filename = descriptor.get('filename')
        if (not isinstance(filename, str) or not filename or filename != posixpath.basename(filename) or
                '\\' in filename or '\x00' in filename):
            raise PermissionDenied
        path = EXDRAW_IMAGES_DIR + str(mapping.uuid) + '/' + filename
        image_repo, path, file_id = resource(repo.repo_id, path)
    extension = posixpath.splitext(path)[1].lstrip('.').lower()
    content_type = FILE_TYPE_MIMETYPE_MAPPING.get(extension)
    if not content_type:
        raise PermissionDenied
    return image_repo, path, file_id, content_type


def image_stream(repo, path, file_id, content_type, username):
    if seafile_api.get_file_size(repo.store_id, repo.version, file_id) > MAX_IMAGE_BYTES:
        raise ValueError('Image too large')
    token = seafile_api.get_fileserver_access_token(repo.repo_id, file_id, 'view', username, use_onetime=True)
    if not token:
        raise RuntimeError('Image access unavailable')
    url = gen_inner_file_get_url(token, posixpath.basename(path))
    upstream = requests.get(url, stream=True, timeout=30, allow_redirects=False)
    if upstream.status_code != 200:
        upstream.close()
        raise RuntimeError('Image upstream unavailable')
    try:
        if int(upstream.headers.get('Content-Length', 0)) > MAX_IMAGE_BYTES:
            raise ValueError('Image too large')
    except ValueError:
        upstream.close()
        raise

    def chunks():
        size = 0
        try:
            for chunk in upstream.iter_content(64 * 1024):
                size += len(chunk)
                if size > MAX_IMAGE_BYTES:
                    raise ValueError('Image exceeded size limit')
                yield chunk
        finally:
            upstream.close()

    response = StreamingHttpResponse(chunks(), content_type=content_type)
    response._resource_closers.append(upstream.close)
    return response


@never_cache
def shared_whiteboard(request, share_token, sdoc_uuid, file_uuid, action):
    try:
        share, mapping, repo, path, file_id = authorize_share(request, share_token, sdoc_uuid, file_uuid)
        base = reverse('shared_sdoc_whiteboard', kwargs={
            'share_token': share_token, 'sdoc_uuid': sdoc_uuid, 'file_uuid': file_uuid, 'action': 'scene',
        })
        if action == 'preview':
            response = render(request, 'shared_file_view_react.html', {
                'repo': repo, 'file_name': mapping.filename, 'file_size': 0,
                'filetype': EXCALIDRAW, 'fileext': 'exdraw', 'file_uuid': str(mapping.uuid),
                'file_perm': 'r', 'permissions': {'can_edit': False, 'can_download': False},
                'shared_exdraw_scene_url': base,
            })
        elif action == 'scene':
            scene = server_read(share, mapping)
            if not isinstance(scene.get('elements'), list):
                raise ValueError('Invalid scene')
            images = {}
            image_sources = {}
            image_base = reverse('shared_sdoc_whiteboard_image', kwargs={
                'share_token': share_token, 'sdoc_uuid': sdoc_uuid, 'file_uuid': file_uuid,
            })
            for element in scene['elements']:
                if not isinstance(element, dict) or element.get('type') != 'image' or element.get('isDeleted'):
                    continue
                file_key = element.get('fileId')
                if not isinstance(file_key, str) or not file_key:
                    raise ValueError('Invalid image element')
                source = (element.get('filename'), element.get('dataURL'))
                if file_key in image_sources and image_sources[file_key] != source:
                    raise ValueError('Ambiguous image file ID')
                image_sources[file_key] = source
                try:
                    selector = image_selector(element)
                    images.setdefault(file_key, {'url': image_base + '?' + urlencode(selector)})
                except (PermissionDenied, Http404, ValueError):
                    pass  # An unsupported image must not prevent the rest of the scene loading.
                # Never provide a legacy raw URL as a client-side fallback.
                element.pop('dataURL', None)
            response = JsonResponse({'scene': scene, 'images': images, 'capabilities': {'can_edit': False}})
        elif action == 'image':
            filename = request.GET.get('filename')
            image_path = request.GET.get('path')
            if bool(filename) == bool(image_path):
                raise PermissionDenied
            if filename:
                # Uploaded images are board attachments, as in the original download API.
                # Authorization above applies to the board; image_resource fixes the directory.
                descriptor = {'filename': filename}
            else:
                selector = {'path': normalized_path(image_path)}
                scene = server_read(share, mapping)
                if not isinstance(scene.get('elements'), list):
                    raise ValueError('Invalid scene')
                descriptor = referenced_image(scene, selector)
            image_repo, image_path, image_id, content_type = image_resource(descriptor, mapping, repo, share.username)
            response = image_stream(image_repo, image_path, image_id, content_type, share.username)
        else:
            raise Http404
    except (PermissionDenied, Http404):
        response = JsonResponse({'error_code': 'permission_denied'}, status=403)
    except Exception:
        # Do not log upstream URLs or exception bodies: they may contain credentials.
        logger.error('Shared whiteboard gateway request failed', extra={'operation': action})
        response = JsonResponse({'error_code': 'upstream_unavailable'}, status=502)
    response['Cache-Control'] = 'private, no-store'
    response['X-Content-Type-Options'] = 'nosniff'
    response['Referrer-Policy'] = 'no-referrer'
    return response
