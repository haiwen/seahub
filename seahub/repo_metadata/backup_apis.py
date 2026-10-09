from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from seaserv import seafile_api
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.endpoints.utils import add_metadata_backup_export_task, add_metadata_backup_import_task, \
    get_metadata_backup_task, add_metadata_backup_restore_task, download_metadata_backup
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.repo_metadata.models import RepoMetadata
from seahub.settings import METADATA_BACKUP_FILE_SIZE_LIMIT
from seahub.utils.repo import is_repo_admin


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
        response = add_metadata_backup_export_task(
            repo_id, repo.name, request.user.username, METADATA_BACKUP_FILE_SIZE_LIMIT
        )
        try:
            data = response.json()
        except ValueError:
            data = {}
        finally:
            response.close()
        if response.status_code < 200 or response.status_code >= 300:
            code = response.status_code if response.status_code < 500 else status.HTTP_500_INTERNAL_SERVER_ERROR
            return api_error(code, data.get('error_msg') or data.get('error') or 'Metadata backup operation failed.')
        return Response(data, status=response.status_code)


class MetadataBackupImport(MetadataBackupBase):

    def post(self, request, repo_id):
        _, error = self.check_access(request, repo_id)
        if error:
            return error
        source = request.FILES.get('file')
        if not source or not source.name.lower().endswith('.xlsx'):
            return api_error(status.HTTP_400_BAD_REQUEST, 'An .xlsx metadata backup is required.')
        if source.size > METADATA_BACKUP_FILE_SIZE_LIMIT:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Metadata backup file is too large.')
        response = add_metadata_backup_import_task(
            repo_id, request.user.username, source, METADATA_BACKUP_FILE_SIZE_LIMIT
        )
        try:
            data = response.json()
        except ValueError:
            data = {}
        finally:
            response.close()
        if response.status_code < 200 or response.status_code >= 300:
            code = response.status_code if response.status_code < 500 else status.HTTP_500_INTERNAL_SERVER_ERROR
            return api_error(code, data.get('error_msg') or data.get('error') or 'Metadata backup operation failed.')
        return Response(data, status=response.status_code)


class MetadataBackupTask(MetadataBackupBase):

    def get(self, request, repo_id, task_id):
        _, error = self.check_access(request, repo_id)
        if error:
            return error
        response = get_metadata_backup_task(task_id, repo_id, request.user.username)
        try:
            data = response.json()
        except ValueError:
            data = {}
        finally:
            response.close()
        if response.status_code < 200 or response.status_code >= 300:
            code = response.status_code if response.status_code < 500 else status.HTTP_500_INTERNAL_SERVER_ERROR
            return api_error(code, data.get('error_msg') or data.get('error') or 'Metadata backup operation failed.')
        return Response(data, status=response.status_code)


class MetadataBackupRestore(MetadataBackupBase):

    def post(self, request, repo_id, task_id):
        _, error = self.check_access(request, repo_id)
        if error:
            return error
        response = add_metadata_backup_restore_task(task_id, repo_id, request.user.username)
        try:
            data = response.json()
        except ValueError:
            data = {}
        finally:
            response.close()
        if response.status_code < 200 or response.status_code >= 300:
            code = response.status_code if response.status_code < 500 else status.HTTP_500_INTERNAL_SERVER_ERROR
            return api_error(code, data.get('error_msg') or data.get('error') or 'Metadata backup operation failed.')
        return Response(data, status=response.status_code)


class MetadataBackupDownload(MetadataBackupBase):

    def get(self, request, repo_id, task_id):
        _, error = self.check_access(request, repo_id)
        if error:
            return error
        upstream = download_metadata_backup(task_id, repo_id, request.user.username)
        if upstream.status_code < 200 or upstream.status_code >= 300:
            try:
                data = upstream.json()
            except ValueError:
                data = {}
            finally:
                upstream.close()
            code = upstream.status_code if upstream.status_code < 500 else status.HTTP_500_INTERNAL_SERVER_ERROR
            return api_error(code, data.get('error_msg') or data.get('error') or 'Metadata backup operation failed.')

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
