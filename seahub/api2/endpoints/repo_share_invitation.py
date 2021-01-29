# Copyright (c) 2012-2019 Seafile Ltd.
import logging

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.permissions import CanInviteGuest
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.invitations.models import RepoShareInvitation
from seahub.constants import PERMISSION_READ, PERMISSION_READ_WRITE
from seahub.share.utils import is_repo_admin
from seahub.utils import is_org_context

logger = logging.getLogger(__name__)
json_content_type = 'application/json; charset=utf-8'


class RepoShareInvitationView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, CanInviteGuest)
    throttle_classes = (UserRateThrottle, )

    def put(self, request, repo_id, format=None):
        """ Update permission in repo share invitation.
        """
        # argument check
        path = request.data.get('path', None)
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'path invalid.')

        token = request.data.get('token', None)
        if not token:
            return api_error(status.HTTP_400_BAD_REQUEST, 'token invalid.')

        permission = request.data.get('permission', PERMISSION_READ)
        if permission not in (PERMISSION_READ, PERMISSION_READ_WRITE):
            return api_error(status.HTTP_400_BAD_REQUEST, 'permission invalid.')

        # recourse check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library %s not found.' % repo_id)

        if seafile_api.get_dir_id_by_path(repo.id, path) is None:
            return api_error(status.HTTP_404_NOT_FOUND, 'Folder %s not found.' % path)

        # permission check
        username = request.user.username
        if is_org_context(request):
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)

        if username != repo_owner and not is_repo_admin(username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # mian
        try:
            shared_obj = RepoShareInvitation.objects.get_by_token_and_path(
                token=token, repo_id=repo_id, path=path
            )
            if not shared_obj:
                error_msg = 'repo share invitation not found.'
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)
            if shared_obj.permission == permission:
                error_msg = 'repo share invitation already has %s premission.' % permission
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            shared_obj.permission = permission
            shared_obj.save()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})

    def delete(self, request, repo_id, format=None):
        """ Delete repo share invitation.
        """
        # argument check
        path = request.data.get('path', None)
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'path invalid.')

        token = request.data.get('token', None)
        if not token:
            return api_error(status.HTTP_400_BAD_REQUEST, 'token invalid.')

        # recourse check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library %s not found.' % repo_id)

        if seafile_api.get_dir_id_by_path(repo.id, path) is None:
            return api_error(status.HTTP_404_NOT_FOUND, 'Folder %s not found.' % path)

        # permission check
        username = request.user.username
        if is_org_context(request):
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)

        if username != repo_owner and not is_repo_admin(username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # mian
        try:
            shared_obj = RepoShareInvitation.objects.get_by_token_and_path(
                token=token, repo_id=repo_id, path=path
            )
            if not shared_obj:
                error_msg = 'repo share invitation not found.'
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            shared_obj.delete()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
