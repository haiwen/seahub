# -*- coding: utf-8 -*-

import logging

from rest_framework.views import APIView
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.response import Response
import seaserv
from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, get_user_common_info
from seahub.dtable.models import Workspaces, DTables
from seahub.dtable.utils import check_dtable_permission, list_dtable_related_users
from seahub.utils import normalize_file_path
from seahub.api2.endpoints.dtable import FILE_TYPE

logger = logging.getLogger(__name__)


class DTableRelatedUsersView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, workspace_id, name):
        """list dtable related users
        """
        table_name = name
        table_file_name = table_name + FILE_TYPE

        # resource check
        workspace = Workspaces.objects.get_workspace_by_id(workspace_id)
        if not workspace:
            error_msg = 'Workspace %s not found.' % workspace_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if '@seafile_group' in workspace.owner:
            group_id = workspace.owner.split('@')[0]
            group = seaserv.get_group(group_id)
            if not group:
                error_msg = 'Group %s not found.' % group_id
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_id = workspace.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        dtable = DTables.objects.get_dtable(workspace, table_name)
        if not dtable:
            error_msg = 'dtable %s not found.' % table_name
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        table_path = normalize_file_path(table_file_name)
        table_file_id = seafile_api.get_file_id_by_path(repo_id, table_path)
        if not table_file_id:
            error_msg = 'file %s not found.' % table_file_name
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not check_dtable_permission(username, workspace, dtable):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # main
        user_list = list()

        try:
            email_list = list_dtable_related_users(workspace, dtable)

            for email in email_list:
                user_info = get_user_common_info(email)
                user_list.append(user_info)
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'user_list': user_list})
