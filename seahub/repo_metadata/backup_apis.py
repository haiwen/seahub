import time
from urllib.parse import urljoin

import jwt
import requests
from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from seaserv import seafile_api
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.repo_metadata.models import RepoMetadata
from seahub.settings import SEAFEVENTS_SERVER_URL, SECRET_KEY
from seahub.utils.repo import is_repo_admin


MAX_BACKUP_FILE_SIZE = 100 * 1024 * 1024


class MetadataBackupBase(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def check_access(self, request, repo_id):
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return None, api_error(status.HTTP_404_NOT_FOUND, 'Library not found.')
        if not is_repo_admin(request.user.username, repo_id):
            return None, api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')
        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            return None, api_error(status.HTTP_409_CONFLICT, 'Metadata is not enabled.')
        return repo, None


class MetadataBackupExport(MetadataBackupBase):

    def post(self, request, repo_id):
        repo, error = self.check_access(request, repo_id)
        if error:
            return error
        response = _seafevents_request('post', '/metadata-backup/export', json={
            'repo_id': repo_id,
            'repo_name': repo.name,
            'username': request.user.username,
        })
        return _json_response(response)


class MetadataBackupImport(MetadataBackupBase):

    def post(self, request, repo_id):
        _, error = self.check_access(request, repo_id)
        if error:
            return error
        source = request.FILES.get('file')
        if not source or not source.name.lower().endswith('.xlsx'):
            return api_error(status.HTTP_400_BAD_REQUEST, 'An .xlsx metadata backup is required.')
        if source.size > MAX_BACKUP_FILE_SIZE:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Metadata backup file is too large.')
        response = _seafevents_request(
            'post', '/metadata-backup/import',
            data={'repo_id': repo_id, 'username': request.user.username},
            files={'file': (source.name, source.file, source.content_type)},
            timeout=300,
        )
        return _json_response(response)


class MetadataBackupTask(MetadataBackupBase):

    def get(self, request, repo_id, task_id):
        _, error = self.check_access(request, repo_id)
        if error:
            return error
        response = _seafevents_request('get', '/metadata-backup/status', params={
            'repo_id': repo_id,
            'username': request.user.username,
            'task_id': task_id,
        })
        return _json_response(response)


class MetadataBackupRestore(MetadataBackupBase):

    def post(self, request, repo_id, task_id):
        _, error = self.check_access(request, repo_id)
        if error:
            return error
        response = _seafevents_request('post', '/metadata-backup/restore', json={
            'repo_id': repo_id,
            'username': request.user.username,
            'task_id': task_id,
        })
        return _json_response(response)


class MetadataBackupDownload(MetadataBackupBase):

    def get(self, request, repo_id, task_id):
        _, error = self.check_access(request, repo_id)
        if error:
            return error
        upstream = _seafevents_request('get', '/metadata-backup/download', params={
            'repo_id': repo_id,
            'username': request.user.username,
            'task_id': task_id,
        }, stream=True, timeout=300)
        if upstream.status_code < 200 or upstream.status_code >= 300:
            return _json_response(upstream)

        def stream():
            try:
                yield from upstream.iter_content(64 * 1024)
            finally:
                upstream.close()

        response = StreamingHttpResponse(
            stream(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        if upstream.headers.get('Content-Disposition'):
            response['Content-Disposition'] = upstream.headers['Content-Disposition']
        if upstream.headers.get('Content-Length'):
            response['Content-Length'] = upstream.headers['Content-Length']
        return response


def _seafevents_request(method, path, timeout=30, **kwargs):
    token = jwt.encode({'exp': int(time.time()) + 300}, SECRET_KEY, algorithm='HS256')
    headers = kwargs.pop('headers', {})
    headers['Authorization'] = f'Token {token}'
    return requests.request(
        method, urljoin(SEAFEVENTS_SERVER_URL, path),
        headers=headers, timeout=timeout, **kwargs
    )


def _json_response(response):
    try:
        try:
            data = response.json()
        except ValueError:
            data = {}
        if response.status_code < 200 or response.status_code >= 300:
            message = data.get('error_msg') or data.get('error') or 'Metadata backup operation failed.'
            code = response.status_code if response.status_code < 500 else status.HTTP_500_INTERNAL_SERVER_ERROR
            return api_error(code, message)
        return Response(data, status=response.status_code)
    finally:
        response.close()
