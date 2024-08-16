# Copyright (c) 2012-2019 Seafile Ltd.
# -*- coding: utf-8 -*-
import logging
import json

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from seaserv import seafile_api, ccnet_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, get_user_common_info
from seahub.utils import is_org_context
from seahub.views import check_folder_permission
from seahub.utils.repo import get_related_users_by_repo

logger = logging.getLogger(__name__)


class RepoRelatedUsersView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id, format=None):
        """List all users who can view this library.

        Not support public repo
        """
        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not check_folder_permission(request, repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # org check
        org_id = None
        if is_org_context(request):
            org_id = request.user.org.org_id

        # main
        user_list = list()

        try:
            related_user_list = get_related_users_by_repo(repo_id, org_id)
            email_list_json = json.dumps(related_user_list)
            user_obj_list = ccnet_api.get_emailusers_in_list('DB', email_list_json)
            
            for user_obj in user_obj_list:
                if user_obj.is_active and '@seafile_group' not in user_obj.email:
                    user_info = get_user_common_info(user_obj.email)
                    user_list.append(user_info)
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'user_list': user_list})
