# Copyright (c) 2012-2019 Seafile Ltd.
# -*- coding: utf-8 -*-
import logging

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.utils.repo import is_repo_admin
from seahub.constants import PERMISSION_READ_WRITE
from seahub.repo_auto_delete.models import RepoAutoDelete

logger = logging.getLogger(__name__)


class RepoAutoDeleteView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id):
        """
        Get auto del days of a repo

        perm: rw, r, cloud-edit, preview
        """

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        perm = seafile_api.check_permission(repo_id, request.user.username)
        if not perm:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            repo_auto_delete = RepoAutoDelete.objects.get(repo_id=repo_id)
        except RepoAutoDelete.DoesNotExist:
            return Response({'auto_delete_days': 0})

        return Response({'auto_delete_days':repo_auto_delete.days})

    def put(self, request, repo_id):
        """
        Set auto del days of a repo

        perm: repo admin
        """

        auto_delete_days = request.data.get('auto_delete_days')
        if not auto_delete_days:
            error_msg = 'auto_delete_days invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            auto_delete_days = int(auto_delete_days)
        except Exception as e:
            error_msg = 'auto_del_days %s invalid.' % auto_delete_days
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if auto_delete_days < 0:
            error_msg = 'auto_del_days %s invalid.' % auto_delete_days
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        username = request.user.username
        if not is_repo_admin(username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            repo_auto_delete, _ = RepoAutoDelete.objects.update_or_create(repo_id=repo_id, defaults={'days':auto_delete_days})
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error.')

        return Response({'auto_delete_days':repo_auto_delete.days})