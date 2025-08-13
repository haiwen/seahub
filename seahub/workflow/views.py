# views.py
import json
from django.shortcuts import get_object_or_404
from django.http import JsonResponse

from fsspec.core import logger
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle

from seahub.workflow.models import Workflow
from seahub.repo_metadata.models import RepoMetadata
from seahub.api2.utils import api_error
from seaserv import seafile_api



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
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        # check does the repo have opened metadata manage
        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is enabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        username = request.user.username
        try:
            data = request.data
            if not data.get('name'):
                return api_error(status.HTTP_400_BAD_REQUEST, 'Workflow name is required')
            
            workflow = Workflow.objects.create(
                name=data['name'],
                repo_id=repo_id,
                graph=data.get('graph'),
                trigger_from=data.get('trigger_from'),
                created_by=username,
                is_valid=data.get('is_valid', True)
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

        try:
            workflow = Workflow.objects.filter(repo_id=repo_id, id=workflow_id).first()
            return Response(workflow.to_dict())
        except Exception as e:
            return api_error(status.HTTP_400_BAD_REQUEST, str(e))
    
    def put(self, request, repo_id, workflow_id):
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        # check does the repo have opened metadata manage
        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is enabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
            
        username = request.user.username
        try:
            workflow = Workflow.objects.get(id=workflow_id)
        except Workflow.DoesNotExist:
            error_msg = "Workflow not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            data = request.data
            print(data,'---data')
            workflow_name = data.get('name')
            graph = data.get('graph')
            workflow.updated_by = username
            workflow.graph = graph
            workflow.name = workflow_name
            workflow.trigger_from = data.get('trigger_from')
            if 'is_valid' in data:
                workflow.is_valid = bool(data.get('is_valid'))
            workflow.save()
            return Response(workflow.to_dict())
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_400_BAD_REQUEST, str(e))
    
    def delete(self, request, repo_id, workflow_id):
        repo = seafile_api.get_repo(repo_id)
        print(repo_id, workflow_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        # check does the repo have opened metadata manage
        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is enabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        try:
            workflow = Workflow.objects.filter(repo_id=repo_id, id=workflow_id).first()
            workflow.delete()
            return Response({'success': True})
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_400_BAD_REQUEST, str(e))


class WorkflowValidateView(APIView):
    """验证工作流"""
    
    def post(self, request, workflow_id):
        workflow = get_object_or_404(Workflow, id=workflow_id)
        is_valid, message = workflow.validate_graph()
        
        return JsonResponse({
            'is_valid': is_valid,
            'message': message
        })
