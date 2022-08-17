# -*- coding: utf-8 -*-
import logging

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication

from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.share.utils import is_repo_admin, normalize_custom_permission_name
from seahub.utils.repo import get_repo_owner
from seahub.share.models import CustomSharePermissions
from seahub.views import check_folder_permission

logger = logging.getLogger(__name__)


class CustomSharePermissionsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id):
        """List custom share permissions
        """
        # permission check
        if not check_folder_permission(request, repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # main
        try:
            permission_query = CustomSharePermissions.objects.get_permissions_by_repo_id(repo_id)
            permission_list = [item.to_dict() for item in permission_query]
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'permission_list': permission_list})

    def post(self, request, repo_id):
        """Add a custom share permission
        """
        username = request.user.username
        # argument check
        permission = request.data.get('permission', None)
        if not permission:
            error_msg = 'permission invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        permission_name = request.data.get('permission_name', None)
        if not permission_name:
            error_msg = 'permission_name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        description = request.data.get('description', '')

        # permission check
        if not is_repo_admin(username, repo_id):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # main
        try:
            permission_obj = CustomSharePermissions.objects.add_permission(
                repo_id, permission_name, description, permission)
            res = permission_obj.to_dict()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'permission': res})


class CustomSharePermissionView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id, permission_id):
        """get a custom share permission
        """
        # permission check
        if not check_folder_permission(request, repo_id, '/'):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # main
        try:
            permission_obj = CustomSharePermissions.objects.get(id=permission_id)
        except CustomSharePermissions.DoesNotExist:
            error_msg = 'Permission %s not found.' % permission_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        res = permission_obj.to_dict()
        return Response({'permission': res})

    def put(self, request, repo_id, permission_id):
        """Update a custom share permission
        """
        username = request.user.username
        # argument check
        permission = request.data.get('permission', None)
        if not permission:
            error_msg = 'permission invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        permission_name = request.data.get('permission_name', None)
        if not permission_name:
            error_msg = 'permission_name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        description = request.data.get('description', '')

        # permission check
        if not is_repo_admin(username, repo_id):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            permission_obj = CustomSharePermissions.objects.get(id=permission_id)
            if not permission_obj:
                return api_error(status.HTTP_404_NOT_FOUND, 'Permission %s not found.' % permission_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # main
        try:
            permission_obj.name = permission_name
            permission_obj.description = description
            permission_obj.permission = permission
            permission_obj.save()
            res = permission_obj.to_dict()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'permission': res})

    def delete(self, request, repo_id, permission_id):
        """Delete a custom share permission
        """
        username = request.user.username

        # permission check
        if not is_repo_admin(username, repo_id):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            permission_obj = CustomSharePermissions.objects.get(id=permission_id)
        except CustomSharePermissions.DoesNotExist:
            error_msg = 'Permission %s not found.' % permission_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # delete related repo share
        permission = normalize_custom_permission_name(permission_id)
        repo_owner = get_repo_owner(request, repo_id)
        share_items = seafile_api.list_repo_shared_to(repo_owner, repo_id)
        for share in share_items:
            if share.perm == permission:
                seafile_api.remove_share(repo_id, repo_owner, share.user)

        # delete custom permission
        permission_obj.delete()

        return Response({'success': True})
