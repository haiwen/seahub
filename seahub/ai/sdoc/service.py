import json
import logging
import os
import posixpath

from django.urls import reverse
from seaserv import seafile_api

from seahub.settings import ENABLE_SEADOC
from seahub.seadoc.utils import get_seadoc_file_uuid
from seahub.utils import check_filename_with_rename, is_valid_dirent_name, mkstemp
from seahub.utils.repo import parse_repo_perm
from seahub.views import check_folder_permission

from .compiler import compile_sdoc
from .schema import SCHEMA_VERSION, SdocArtifactError, normalize_sdoc_request
from .validator import validate_sdoc


DEFAULT_DIRECTORY = '/AI Generated/'
logger = logging.getLogger(__name__)


def _can_create(request, repo_id, path):
    permission = check_folder_permission(request, repo_id, path)
    return bool(permission and parse_repo_perm(permission).can_create)


def _normalize_directory(path):
    if not isinstance(path, str) or '\x00' in path:
        raise SdocArtifactError('invalid_directory')
    path = path.strip().replace('\\', '/')
    parts = [part for part in path.split('/') if part]
    if not path or '..' in parts:
        raise SdocArtifactError('invalid_directory')
    if not parts:
        return '/'
    return '/' + '/'.join(parts) + '/'


def _resolve_directory(request, repo_id, requested_directory, username):
    if requested_directory is not None:
        directory = _normalize_directory(requested_directory)
        if seafile_api.get_dir_id_by_path(repo_id, directory) is None:
            raise SdocArtifactError('directory_not_found')
        if not _can_create(request, repo_id, directory):
            raise SdocArtifactError('permission_denied')
        return directory

    directory = DEFAULT_DIRECTORY
    directory_id = seafile_api.get_dir_id_by_path(repo_id, directory)
    if directory_id is None:
        if not _can_create(request, repo_id, '/'):
            raise SdocArtifactError('default_directory_unavailable')
        try:
            seafile_api.mkdir_with_parents(repo_id, '/', directory.strip('/'), username)
        except Exception:
            if seafile_api.get_dir_id_by_path(repo_id, directory) is None:
                raise SdocArtifactError('default_directory_unavailable')
        directory_id = seafile_api.get_dir_id_by_path(repo_id, directory)
        if directory_id is None:
            raise SdocArtifactError('default_directory_unavailable')
    if not _can_create(request, repo_id, directory):
        raise SdocArtifactError('default_directory_unavailable')
    return directory


def _normalize_file_name(raw_file_name):
    file_name = os.path.basename(raw_file_name.strip().replace('\\', '/'))
    if not file_name.lower().endswith('.sdoc'):
        file_name += '.sdoc'
    if file_name == '.sdoc' or not is_valid_dirent_name(file_name):
        raise SdocArtifactError('invalid_file_name')
    return file_name


def _plain_title(title):
    return ''.join(child['text'] for child in title['children'])


def _failed(error_code, file_name=None):
    result = {
        'type': 'sdoc',
        'schema_version': SCHEMA_VERSION,
        'status': 'failed',
        'error_code': error_code,
    }
    if file_name:
        result['name'] = file_name
    return result


def create_sdoc(draft, repo_id, request, username):
    if not ENABLE_SEADOC:
        return _failed('sdoc_not_enabled')

    file_name = None
    created_file_name = None
    directory = None
    tmp_file = None
    try:
        normalized = normalize_sdoc_request(draft)
        file_name = _normalize_file_name(normalized['file_name'])
        directory = _resolve_directory(request, repo_id, normalized.get('requested_directory'), username)
        file_name = check_filename_with_rename(repo_id, directory, file_name)
        content = validate_sdoc(compile_sdoc(normalized, username))

        fd, tmp_file = mkstemp()
        try:
            os.write(fd, json.dumps(content, ensure_ascii=False).encode('utf-8'))
        finally:
            os.close(fd)
        try:
            seafile_api.post_file(repo_id, tmp_file, directory, file_name, username)
        except Exception as error:
            logger.error('Failed to write AI generated SDoc %s: %s', file_name, error)
            raise SdocArtifactError('write_failed')

        created_file_name = file_name
        file_path = posixpath.join(directory, file_name)
        repo = seafile_api.get_repo(repo_id)
        doc_uuid = get_seadoc_file_uuid(repo, file_path)
        result = {
            'type': 'sdoc',
            'schema_version': SCHEMA_VERSION,
            'status': 'created',
            'name': file_name,
            'path': file_path,
            'repo_id': repo_id,
            'doc_uuid': doc_uuid,
            'url': reverse('view_lib_file', args=[repo_id, file_path]),
            'title': _plain_title(normalized['title']),
        }
        if normalized.get('summary'):
            result['summary'] = normalized['summary']
        return result
    except SdocArtifactError as error:
        error_code = error.code
    except ValueError as error:
        error_code = str(error) if str(error) else 'invalid_artifact'
    except Exception as error:
        logger.exception('Failed to create AI generated SDoc: %s', error)
        error_code = 'create_failed'
    finally:
        if tmp_file:
            try:
                os.remove(tmp_file)
            except OSError:
                pass

    if created_file_name and directory:
        try:
            seafile_api.del_file(repo_id, directory, json.dumps([created_file_name]), username)
        except Exception as error:
            logger.error('Failed to clean up AI generated SDoc %s: %s', created_file_name, error)
    return _failed(error_code, file_name)
