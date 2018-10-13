# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error

from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email
from seahub.utils.repo import get_repo_owner, is_repo_admin, \
        repo_has_been_shared_out
from seahub.views import check_folder_permission

from seaserv import seafile_api

logger = logging.getLogger(__name__)

class RepoView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id):
        """ Return repo info

        Permission checking:
        1. all authenticated user can perform this action.
        """

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        permission = check_folder_permission(request, repo_id, '/')
        if permission is None:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.user.username
        repo_owner = get_repo_owner(request, repo_id)

        try:
            has_been_shared_out = repo_has_been_shared_out(request, repo_id)
        except Exception as e:
            has_been_shared_out = False
            logger.error(e)

        result = {
            "repo_id": repo.id,
            "repo_name": repo.name,

            "owner_email": repo_owner,
            "owner_name": email2nickname(repo_owner),
            "owner_contact_email": email2contact_email(repo_owner),

            "size": repo.size,
            "encrypted": repo.encrypted,
            "file_count": repo.file_count,
            "permission": permission,
            "no_quota": True if seafile_api.check_quota(repo_id) < 0 else False,
            "is_admin": is_repo_admin(username, repo_id),
            "is_virtual": repo.is_virtual,
            "has_been_shared_out": has_been_shared_out,
        }

        return Response(result)
