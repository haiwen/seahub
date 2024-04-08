# Copyright (c) 2012-2019 Seafile Ltd.
# encoding: utf-8

import logging

from django.utils.translation import gettext as _
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error
from seaserv import seafile_api
from seahub.utils.repo import is_repo_owner, get_repo_owner
from seahub.group.utils import is_group_admin
from seahub.api2.endpoints.group_owned_libraries import get_group_id_by_repo_owner

logger = logging.getLogger(__name__)


class RepoCommitRevertView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, repo_id, commit_id, format=None):
        """ revert commit in repo history

        Permission checking:
        1. only repo owner can perform this action.
        """
        username = request.user.username

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        commit = seafile_api.get_commit(repo.id, repo.version, commit_id)
        if not commit:
            error_msg = 'Commit %s not found.' % commit_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        has_perm = is_repo_owner(request, repo.id, username)
        if not has_perm:
            repo_owner = get_repo_owner(request, repo_id)
            # department admin
            if '@seafile_group' in repo_owner:
                group_id = get_group_id_by_repo_owner(repo_owner)
                has_perm = is_group_admin(group_id, username)
        if not has_perm:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # main
        if repo.encrypted:
            ret = seafile_api.is_password_set(repo_id, username)
            is_decrypted = False if ret == 0 else True

            if not is_decrypted:
                error_msg = _('This library has not been decrypted.')
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            seafile_api.revert_repo(repo_id, commit_id, username)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
