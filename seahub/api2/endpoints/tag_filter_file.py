# _*_ coding:utf-8 _*_
import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.repo_tags.models import RepoTags
from seahub.utils.file_tags import get_tagged_files
from seahub.api2.utils import api_error
from seahub.views import check_folder_permission

from seaserv import seafile_api

logger = logging.getLogger(__name__)


class TaggedFilesView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id, repo_tag_id):
        """list tagged files by repo tag
        """
        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_tag = RepoTags.objects.get_repo_tag_by_id(repo_tag_id)
        if not repo_tag:
            error_msg = 'repo_tag %s not found.' % repo_tag_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not check_folder_permission(request, repo_id, '/'):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # get tagged files dict
        tagged_files = get_tagged_files(repo, repo_tag_id)

        return Response(tagged_files, status=status.HTTP_200_OK)
