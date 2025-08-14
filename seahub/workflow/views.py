import json
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.workflow.models import Workflow
from seahub.workflow.utils import check_graph
from seahub.repo_metadata.models import RepoMetadata
from seahub.repo_metadata.utils import can_read_metadata
from seahub.api2.utils import api_error

from seaserv import seafile_api


logger = logging.getLogger(__name__)

class WorkflowsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )
    
    def get(self, request, repo_id):
        """
        List all workflows for a repository.
        """
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # check does the repo have opened metadata manage
        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is enabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not can_read_metadata(request, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        try:
            workflows = Workflow.objects.filter(repo_id=repo_id)
        except Exception as e:
            return api_error(status.HTTP_400_BAD_REQUEST, str(e))

        data = {
            'total': workflows.count(),
            'workflows': [wf.to_dict() for wf in workflows]
        }
        return Response(data)
    
    def post(self, request, repo_id):
        data = request.data
        workflow_name = data.get('name')
        graph = data.get('graph')
        trigger_from = data.get('trigger_from')

        if not workflow_name:
            error_msg = 'Invalid workflow_name.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        if not trigger_from:
            error_msg = 'Invalid trigger_from.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        if not graph:
            error_msg = 'Invalid graph.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        # check does the repo have opened metadata manage
        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is enabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        if not can_read_metadata(request, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.user.username
        try:
            json_graph = json.loads(graph)
            is_valid, _ = check_graph(json_graph)
            workflow = Workflow.objects.create(
                name = workflow_name,
                repo_id = repo_id,
                graph = graph,
                trigger_from = trigger_from,
                created_by = username,
                is_valid = is_valid
            )
            return Response(workflow.to_dict())
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)


class WorkflowDetailView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )
    
    def get(self, request, repo_id, workflow_id):
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        # check does the repo have opened metadata manage
        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is enabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not can_read_metadata(request, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            workflow = Workflow.objects.filter(repo_id=repo_id, id=workflow_id).first()
            return Response(workflow.to_dict())
        except Exception as e:
            return api_error(status.HTTP_400_BAD_REQUEST, str(e))
    
    def put(self, request, repo_id, workflow_id):
        data = request.data
        graph = data.get('graph')
        workflow_name = data.get('name')
        if not workflow_name:
            error_msg = 'Invalid workflow_name.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        if not graph:
            error_msg = 'Invalid graph.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is enabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        if not can_read_metadata(request, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.user.username
        try:
            workflow = Workflow.objects.get(id=workflow_id)
        except Workflow.DoesNotExist:
            error_msg = "Workflow not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            json_graph = json.loads(graph)
            is_valid, _ = check_graph(json_graph)
            workflow.updated_by = username
            workflow.graph = graph
            workflow.name = workflow_name
            workflow.trigger_from = data.get('trigger_from')
            workflow.is_valid = is_valid
            workflow.save()
            return Response(workflow.to_dict())
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_400_BAD_REQUEST, str(e))
    
    def delete(self, request, repo_id, workflow_id):
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        # check does the repo have opened metadata manage
        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is enabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        if not can_read_metadata(request, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            workflow = Workflow.objects.filter(repo_id=repo_id, id=workflow_id).first()
            workflow.delete()
            return Response({'success': True})
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_400_BAD_REQUEST, str(e))
