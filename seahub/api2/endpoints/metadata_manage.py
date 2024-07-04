import logging
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from seahub.api2.utils import api_error, to_python_boolean
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.repo_metadata.models import RepoMetadata
from seahub.views import check_folder_permission
from seahub.repo_metadata.utils import add_init_metadata_task
from seahub.repo_metadata.metadata_server_api import MetadataServerAPI, list_metadata_records

from seaserv import seafile_api


logger = logging.getLogger(__name__)


class MetadataManage(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id):
        """
            check the repo has enabled the metadata manage or not
        """ 
        # recource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        permission = check_folder_permission(request, repo_id, '/')
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        try:
            record = RepoMetadata.objects.filter(repo_id=repo_id).first()
            if record and record.enabled:
                is_enabled = True
            else:
                is_enabled = False
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        
        return Response({'enabled': is_enabled})

    def put(self, request, repo_id):
        """
            enable a new repo's metadata manage
        """

        # check dose the repo have opened metadata manage
        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if record and record.enabled:
            error_msg = f'The metadata module is enabled for repo {repo_id}.'
            return api_error(status.HTTP_409_CONFLICT, error_msg)

        # recource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        permission = check_folder_permission(request, repo_id, '/')
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        params = {
            'repo_id': repo_id,
            'username': request.user.username
        }

        try:
            task_id = add_init_metadata_task(params=params)
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'task_id': task_id})

    def delete(self, request, repo_id):
        """
            remove a repo's metadata manage
        """

        # recource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        permission = check_folder_permission(request, repo_id, '/')
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        # check dose the repo have opened metadata manage
        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled:
            error_msg = f'The repo {repo_id} has disabledd the metadata manage.'
            return api_error(status.HTTP_409_CONFLICT, error_msg)
       
        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)
        try:
            metadata_server_api.delete_base()
        except ConnectionError as err:
            logger.error(err)
            status_code, reason = err
            return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, f'error from metadata server with code {status_code}: {reason}')
        except Exception as err:
            logger.error(err)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
            
        try:
            record.enabled = False
            record.save()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        
        return Response({'success': True})
        
class MetadataRecords(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id):
        """
            fetch a metadata results
            request body:
                parent_dir: optional, if not specify, search from all dirs
                name: optional, if not specify, search from all objects
                page: optional, the current page
                per_page: optional, if use page, default is 25
                is_dir: optional, True or False
                order_by: list with string, like ['`parent_dir` ASC']
        """
        
        #args check
        parent_dir = request.GET.get('parent_dir')
        name = request.GET.get('name')
        start = request.GET.get('start', 0)
        limit = request.GET.get('limit', 100)
        is_dir = request.GET.get('is_dir')
        order_by = request.GET.get('order_by')

        try:
            start = int(start)
            limit = int(limit)
        except:
            start = 0
            limit = 1000

        if start < 0:
            error_msg = 'start invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        if limit < 0:
            error_msg = 'limit invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if is_dir:
            try:
                is_dir = to_python_boolean(is_dir)
            except:
                error_msg = 'is_dir is invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        # metadata enable check
        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        permission = check_folder_permission(request, repo_id, '/')
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        try:
            results = list_metadata_records(repo_id, request.user.username, parent_dir, name, is_dir, start, limit, order_by)
        except ConnectionError as err:
            logger.error(err)
            status_code, reason = err
            return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, f'error from metadata server with code {status_code}: {reason}')
        except Exception as err:
            logger.error(err)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        
        return Response(results)
