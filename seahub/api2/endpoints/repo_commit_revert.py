# Copyright (c) 2012-2019 Seafile Ltd.
# encoding: utf-8

import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error
from seahub.views import check_folder_permission
from seaserv import seafile_api
from seahub.utils.repo import is_repo_owner
from seahub.constants import PERMISSION_READ_WRITE

logger = logging.getLogger(__name__)


class RepoCommitRevertView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, repo_id, commit_id, format=None):
        """ revert commit in repo history

        Permission checking:
        1. all authenticated user can perform this action.
        """
        username = request.user.username

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        commit = seafile_api.get_commit(repo.id, repo.version, commit_id)
        if not commit:
            error_msg = 'Commit %s not found.' % commit
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if check_folder_permission(request, repo_id, '/') != PERMISSION_READ_WRITE or \
                not is_repo_owner(request, repo_id, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # main
        if repo.encrypted:
            ret = seafile_api.is_password_set(repo_id, username)
            is_decrypted = False if ret == 0 else True

            if not is_decrypted:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        seafile_api.revert_repo(repo_id, commit_id, username)

        return Response({'success': True})
