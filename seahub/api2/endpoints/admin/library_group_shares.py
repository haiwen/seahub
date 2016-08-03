# Copyright (c) 2012-2016 Seafile Ltd.
import logging
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from seaserv import seafile_api, ccnet_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

logger = logging.getLogger(__name__)

def get_library_group_share_info(share_item):

    group_id = share_item.group_id
    group = ccnet_api.get_group(group_id)

    result = {}
    result['group_id'] = group_id
    result['group_name'] = group.group_name
    result['permission'] = share_item.perm
    result['repo_id'] = share_item.repo_id

    return result


class AdminLibraryGroupShares(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def get(self, request, repo_id):
        """ List all group shares of a repo

        Permission checking:
        1. admin user.
        """

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # current `request.user.username` is admin user,
        # so need to identify the repo owner specifically.
        repo_owner = seafile_api.get_repo_owner(repo_id)
        try:
            share_items = seafile_api.list_repo_shared_group_by_user(repo_owner, repo_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        result = []
        for share_item in share_items:
            share_item_info = get_library_group_share_info(share_item)
            result.append(share_item_info)

        return Response(result)

    def post(self, request, repo_id):
        """ Admin share a library to group.

        Permission checking:
        1. admin user.
        """

        # argument check
        permission = request.data.get('permission', None)
        if not permission or permission not in ('r', 'rw'):
            error_msg = 'permission invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        result = {}
        result['failed'] = []
        result['success'] = []
        group_ids = request.data.getlist('group_id')

        # current `request.user.username` is admin user,
        # so need to identify the repo owner specifically.
        repo_owner = seafile_api.get_repo_owner(repo_id)

        for group_id in group_ids:
            try:
                group_id = int(group_id)
            except ValueError as e:
                logger.error(e)
                result['failed'].append({
                    'group_id': group_id,
                    'error_msg': 'group_id %s invalid.' % group_id
                    })

                continue

            group = ccnet_api.get_group(group_id)
            if not group:
                result['failed'].append({
                    'group_id': group_id,
                    'error_msg': 'Group %s not found' % group_id
                    })

                continue

            try:
                seafile_api.set_group_repo(repo_id, group_id, repo_owner, permission)
            except Exception as e:
                logger.error(e)
                result['failed'].append({
                    "group_id": group_id,
                    'error_msg': 'Internal Server Error'
                    })

                continue

            result['success'].append({
                "group_id": group_id,
                "group_name": group.group_name,
                "permission": permission,
                "repo_id": repo_id,
            })

        return Response(result)

class AdminLibraryGroupShare(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def put(self, request, repo_id, format=None):
        """ Update library group share permission.

        Permission checking:
        1. admin user.
        """

        # argument check
        permission = request.data.get('permission', None)
        if not permission or permission not in ('r', 'rw'):
            error_msg = 'permission invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        group_id = request.data.get('group_id', None)

        try:
            group_id = int(group_id)
        except ValueError:
            error_msg = 'group_id %s invalid.' % group_id
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        group = ccnet_api.get_group(group_id)
        if not group:
            error_msg = 'Group %s not found' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            seafile_api.set_group_repo_permission(group_id, repo_id, permission)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        result = {}
        result['group_id'] = group_id
        result['group_name'] = group.group_name
        result['permission'] = permission
        result['repo_id'] = repo_id

        return Response(result)

    def delete(self, request, repo_id, format=None):
        """ Delete library group share permission.

        Permission checking:
        1. admin user.
        """

        # argument check
        permission = request.data.get('permission', None)
        if not permission or permission not in ('r', 'rw'):
            error_msg = 'permission invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        group_id = request.data.get('group_id')
        try:
            group_id = int(group_id)
        except ValueError:
            return api_error(status.HTTP_400_BAD_REQUEST, 'group_id %s invalid' % group_id)

        # current `request.user.username` is admin user,
        # so need to identify the repo owner specifically.
        repo_owner = seafile_api.get_repo_owner(repo_id)

        try:
            seafile_api.unset_group_repo(repo_id, group_id, repo_owner)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
