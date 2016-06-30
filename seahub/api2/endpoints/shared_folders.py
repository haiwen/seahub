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
                #shared_repos += seaserv.seafserv_threaded_rpc.list_org_inner_pub_repos_by_owner(org_id, username)
            else:
                shared_repos += seafile_api.get_share_out_repo_list(username, -1, -1)
                shared_repos += seafile_api.get_group_repos_by_owner(username)
                #if not request.cloud_mode:
                    #shared_repos += seaserv.list_inner_pub_repos_by_owner(username)
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
            result['path'] = repo.origin_path
            result['folder_name'] = repo.name
            result['share_type'] = repo.share_type
            result['share_permission'] = repo.permission

            if repo.share_type == 'personal':
                result['user_name'] = email2nickname(repo.user)
                result['user_email'] = repo.user

            if repo.share_type == 'group':
                group = ccnet_api.get_group(repo.group_id)
                result['group_id'] = repo.group_id
                result['group_name'] = group.group_name

            returned_result.append(result)

        return Response(returned_result)
