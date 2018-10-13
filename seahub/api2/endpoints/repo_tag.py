# _*_ coding:utf-8 _*_
import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.permissions import IsRepoOwner
from seahub.repo_tag.models import RepoTags, Tags
from seahub.api2.utils import api_error
from seahub.views import check_folder_permission

from seaserv import seafile_api

logger = logging.getLogger(__name__)


class RepoTagsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, IsRepoOwner)
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id):

        # argument check
        try:
            repo = seafile_api.get_repo(repo_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # resource check
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if check_folder_permission(request, repo_id, '/') is None:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        tag_set = []
        for repo_tag in RepoTags.objects.get_all_by_repo_id(repo_id):
            tag_set.append(repo_tag.to_dict())

        return Response({"tag_set": tag_set}, status=status.HTTP_200_OK)

    def post(self, request, repo_id):

        # argument check
        tag_name = request.data.get('tag_name')
        if not tag_name:
            error_msg = 'tag_name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        tag_color = request.data.get('tag_color')
        if not tag_color:
            error_msg = 'tag_color invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        try:
            repo = seafile_api.get_repo(repo_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if check_folder_permission(request, repo_id, '/') is None:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        repo_tag, created = RepoTags.objects.create_repo_tag(repo_id, tag_name, tag_color)

        return Response({"repo_tag": repo_tag.to_dict()}, status=status.HTTP_201_CREATED)

    def put(self, request, repo_id):
        # argument check
        tag_id = request.GET.get('id')
        repo_tag = RepoTags.objects.get(pk=tag_id)
        if not repo_tag:
            error_msg = 'repo_tag not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        tag_name = request.data.get('tag_name')
        if not tag_name:
            error_msg = 'tag_name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        tag_color = request.data.get('tag_color')
        if not tag_color:
            error_msg = 'tag_color invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        try:
            repo = seafile_api.get_repo(repo_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if check_folder_permission(request, repo_id, '/') is None:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        old_tag_name = repo_tag.to_dict()['tag_name']
        tag = Tags.objects.get(name=old_tag_name)
        tag.name, tag.color = tag_name, tag_color
        tag.save()
        repo_tag = RepoTags.objects.get(pk=tag_id)

        return Response({"repo_tag": repo_tag.to_dict()}, status=status.HTTP_200_OK)

    def delete(self, request, repo_id):
        # argument check
        tag_id = request.GET.get('id')
        repo_tag = RepoTags.objects.get(pk=tag_id)
        if not repo_tag:
            error_msg = 'Repotag not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # resource check
        try:
            repo = seafile_api.get_repo(repo_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if check_folder_permission(request, repo_id, '/') is None:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        RepoTags.objects.delete_repo_tag(tag_id)
        return Response({"success": "true"}, status=status.HTTP_200_OK)
