# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

import seaserv
from seaserv import seafile_api, ccnet_api

from seahub.api2.utils import api_error
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.profile.models import Profile
from seahub.utils import is_org_context
from seahub.base.templatetags.seahub_tags import email2nickname

logger = logging.getLogger(__name__)

class SharedFolders(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, format=None):
        """ List all shared out folders.

        Permission checking:
        1. all authenticated user can perform this action.
        """

        shared_repos = []
        username = request.user.username

        try:
            if is_org_context(request):
                org_id = request.user.org.org_id
                shared_repos += seafile_api.get_org_share_out_repo_list(org_id, username, -1, -1)
                shared_repos += seaserv.seafserv_threaded_rpc.get_org_group_repos_by_owner(org_id, username)
            else:
                shared_repos += seafile_api.get_share_out_repo_list(username, -1, -1)
                shared_repos += seafile_api.get_group_repos_by_owner(username)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        returned_result = []
        shared_repos.sort(lambda x, y: cmp(x.repo_name, y.repo_name))
        for repo in shared_repos:
            if not repo.is_virtual:
                    continue

            result = {}
            result['repo_id'] = repo.origin_repo_id
            result['repo_name'] = repo.origin_repo_name
            result['path'] = repo.origin_path
            result['folder_name'] = repo.name
            result['share_type'] = repo.share_type
            result['share_permission'] = repo.permission

            if repo.share_type == 'personal':
                result['user_name'] = email2nickname(repo.user)
                result['user_email'] = repo.user
                result['contact_email'] = Profile.objects.get_contact_email_by_user(repo.user)

            if repo.share_type == 'group':
                group = ccnet_api.get_group(repo.group_id)

                if not group:
                    if is_org_context(request):
                        seafile_api.org_unshare_subdir_for_group(org_id,
                                repo.repo_id, repo.origin_path, username, repo.group_id)
                    else:
                        seafile_api.unshare_subdir_for_group(
                                repo.repo_id, repo.origin_path, username, repo.group_id)
                    continue

                result['group_id'] = repo.group_id
                result['group_name'] = group.group_name

            returned_result.append(result)

        return Response(returned_result)
