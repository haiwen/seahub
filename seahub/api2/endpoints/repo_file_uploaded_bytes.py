# Copyright (c) 2012-2016 Seafile Ltd.
import logging
import posixpath

import dateutil.parser

from rest_framework.authentication import SessionAuthentication
from rest_framework.exceptions import APIException, NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle

from seahub.settings import ENABLE_RESUMABLE_FILEUPLOAD
from seahub.utils.repo import parse_repo_perm
from seahub.views import check_folder_permission

logger = logging.getLogger(__name__)
json_content_type = 'application/json; charset=utf-8'


def resolve_upload_path(parent_dir, path):
    if any('\x00' in value or '\\' in value or '..' in value.split('/')
           for value in (parent_dir, path)):
        return None

    parent_dir = posixpath.normpath('/' + parent_dir.lstrip('/'))
    target = posixpath.normpath('/' + posixpath.join(parent_dir, path).lstrip('/'))
    if posixpath.commonpath((parent_dir, target)) == parent_dir:
        return target
    return None


def get_file_uploaded_bytes(request, repo_id, parent_dir, can_upload):
    """Return the offset for a file under a writable upload directory."""
    parent_dir = resolve_upload_path('/', parent_dir) if parent_dir else None
    if not parent_dir:
        raise ValidationError({'error_msg': 'parent_dir invalid.'})

    file_name = request.GET.get('file_name', '')
    file_path = resolve_upload_path(parent_dir, file_name)
    if not file_path or file_path == parent_dir or posixpath.basename(file_name) in ('', '.'):
        raise ValidationError({'error_msg': 'file_name invalid.'})

    file_mtime = request.GET.get('file_mtime')
    last_modify = 0
    if file_mtime:
        try:
            mtime = dateutil.parser.isoparse(file_mtime)
            if mtime.tzinfo is None:
                raise ValueError('Timezone is required.')
            last_modify = int(mtime.timestamp())
        except (TypeError, ValueError, OverflowError):
            error_msg = 'file_mtime invalid, should be ISO 8601 format with timezone.'
            raise ValidationError({'error_msg': error_msg})

    if not can_upload(parent_dir) or not seafile_api.get_dir_id_by_path(repo_id, parent_dir):
        raise NotFound({'error_msg': 'Not found.'})

    # Resumable uploads can have staged bytes before creating their subdirectories.
    directory = parent_dir
    for part in posixpath.relpath(file_path, parent_dir).split('/')[:-1]:
        subdirectory = posixpath.join(directory, part)
        if not seafile_api.get_dir_id_by_path(repo_id, subdirectory):
            break
        directory = subdirectory
    if directory != parent_dir and not can_upload(directory):
        raise NotFound({'error_msg': 'Not found.'})

    try:
        return seafile_api.get_upload_tmp_file_offset(repo_id, file_path, last_modify)
    except Exception as e:
        logger.error(e)
        raise APIException({'error_msg': 'Internal Server Error'}) from e


class RepoFileUploadedBytesView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id):
        def can_upload(directory):
            permission = check_folder_permission(request, repo_id, directory)
            return permission and parse_repo_perm(permission).can_upload

        uploaded_bytes = get_file_uploaded_bytes(request, repo_id, request.GET.get('parent_dir'), can_upload)
        response = Response({'uploadedBytes': uploaded_bytes})
        if ENABLE_RESUMABLE_FILEUPLOAD:
            response['Accept-Ranges'] = 'bytes'
        return response
