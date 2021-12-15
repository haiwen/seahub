# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
import seaserv
from seaserv import seafile_api, ccnet_api

from seahub.utils import is_org_context
from seahub.group.utils import group_id_to_name
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.api2.endpoints.group_owned_libraries import get_group_id_by_repo_owner
from seahub.base.templatetags.seahub_tags import email2nickname

logger = logging.getLogger(__name__)


def get_group_repo_info(repo):
    result = {}
    result['repo_id'] = repo.repo_id
    result['name'] = repo.repo_name
    result['size'] = repo.size
    result['shared_by'] = repo.user

    if '@seafile_group' in repo.user:
        group_id = get_group_id_by_repo_owner(repo.user)
        group_name = group_id_to_name(group_id)
        result['shared_by_name'] = group_name
    else:
        result['shared_by_name'] = email2nickname(repo.user)

    result['permission'] = repo.permission
    result['group_id'] = repo.group_id
    result['encrypted'] = repo.encrypted

    return result


class AdminGroupLibraries(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def get(self, request, group_id, format=None):
        """ List all group repos

        Permission checking:
        1. only admin can perform this action.
        """

        if not request.user.admin_permissions.can_manage_group():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        group_id = int(group_id)
        group = ccnet_api.get_group(group_id)
        if not group:
            error_msg = 'Group %d not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if is_org_context(request):
            org_id = request.user.org.org_id
            repos = seafile_api.get_org_group_repos(org_id, group_id)
        else:
            org_id = ccnet_api.get_org_id_by_group(group_id)
            if org_id != -1:
                repos = seafile_api.get_org_group_repos(org_id, group_id)
            else:
                repos = seafile_api.get_repos_by_group(group_id)

        group_repos_info = []
        for repo in repos:
            repo_info = get_group_repo_info(repo)
            group_repos_info.append(repo_info)

        group_libraries = {
            'group_id': group_id,
            'group_name': group.group_name,
            'libraries': group_repos_info
        }

        return Response(group_libraries)


class AdminGroupLibrary(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def delete(self, request, group_id, repo_id, format=None):
        """ Unshare repo from group

        Permission checking:
        1. only admin can perform this action.
        """

        if not request.user.admin_permissions.can_manage_group():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        group_id = int(group_id)
        group = ccnet_api.get_group(group_id)
        if not group:
            error_msg = 'Group %d not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            if is_org_context(request):
                org_id = request.user.org.org_id
                seaserv.del_org_group_repo(repo_id, org_id, group_id)
            else:
                repo_owner = seafile_api.get_repo_owner(repo_id)
                seafile_api.unset_group_repo(repo_id, group_id, repo_owner)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
