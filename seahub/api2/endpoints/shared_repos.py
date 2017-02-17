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
from seahub.utils import is_org_context, is_valid_username, send_perm_audit_msg
from seahub.base.templatetags.seahub_tags import email2nickname

logger = logging.getLogger(__name__)

class SharedRepos(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, format=None):
        """ List all shared out repos.

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
                shared_repos += seaserv.seafserv_threaded_rpc.list_org_inner_pub_repos_by_owner(org_id, username)
            else:
                shared_repos += seafile_api.get_share_out_repo_list(username, -1, -1)
                shared_repos += seafile_api.get_group_repos_by_owner(username)
                if not request.cloud_mode:
                    shared_repos += seafile_api.list_inner_pub_repos_by_owner(username)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        returned_result = []
        shared_repos.sort(lambda x, y: cmp(x.repo_name, y.repo_name))
        for repo in shared_repos:
            if repo.is_virtual:
                    continue

            result = {}
            result['repo_id'] = repo.repo_id
            result['repo_name'] = repo.repo_name
            result['share_type'] = repo.share_type
            result['share_permission'] = repo.permission

            if repo.share_type == 'personal':
                result['user_name'] = email2nickname(repo.user)
                result['user_email'] = repo.user
                result['contact_email'] = Profile.objects.get_contact_email_by_user(repo.user)

            if repo.share_type == 'group':
                group = ccnet_api.get_group(repo.group_id)
                result['group_id'] = repo.group_id
                result['group_name'] = group.group_name

            returned_result.append(result)

        return Response(returned_result)


class SharedRepo(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def put(self, request, repo_id, format=None):
        """ Update permission of a shared repo.

        Permission checking:
        1. Only repo owner can update.
        """

        # argument check
        permission = request.data.get('permission', None)
        if permission not in ['r', 'rw']:
            error_msg = 'permission invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        share_type = request.data.get('share_type', None)
        if not share_type:
            error_msg = 'share_type invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if share_type not in ('personal', 'group', 'public'):
            error_msg = "share_type can only be 'personal' or 'group' or 'public'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # recourse check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if is_org_context(request):
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)

        if username != repo_owner:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # update share permission
        if share_type == 'personal':
            shared_to = request.data.get('user', None)
            if not shared_to or not is_valid_username(shared_to):
                error_msg = 'user invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            try:
                if is_org_context(request):
                    org_id = request.user.org.org_id
                    seaserv.seafserv_threaded_rpc.org_set_share_permission(
                            org_id, repo_id, username, shared_to, permission)
                else:
                    seafile_api.set_share_permission(repo_id,
                            username, shared_to, permission)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            send_perm_audit_msg('modify-repo-perm', username,
                shared_to, repo_id, '/', permission)

        if share_type == 'group':
            group_id = request.data.get('group_id', None)
            if not group_id:
                error_msg = 'group_id invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            try:
                group_id = int(group_id)
            except ValueError:
                error_msg = 'group_id must be integer.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            group = ccnet_api.get_group(group_id)
            if not group:
                error_msg = 'Group %s not found.' % group_id
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            try:
                if is_org_context(request):
                    org_id = request.user.org.org_id
                    seaserv.seafserv_threaded_rpc.set_org_group_repo_permission(
                            org_id, group_id, repo_id, permission)
                else:
                    seafile_api.set_group_repo_permission(
                            group_id, repo_id, permission)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            send_perm_audit_msg('modify-repo-perm', username,
                    group_id, repo_id, '/', permission)

        if share_type == 'public':
            try:
                if is_org_context(request):
                    org_id = request.user.org.org_id
                    seaserv.seafserv_threaded_rpc.set_org_inner_pub_repo(
                            org_id, repo_id, permission)
                else:
                    seafile_api.add_inner_pub_repo(repo_id, permission)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            send_perm_audit_msg('modify-repo-perm', username,
                    'all', repo_id, '/', permission)

        return Response({'success': True})

    def delete(self, request, repo_id, format=None):
        """ Unshare a repo.

        Permission checking:
        1. Only repo owner can unshare a library.
        """

        # argument check
        share_type = request.GET.get('share_type', None)
        if not share_type:
            error_msg = 'share_type invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if share_type not in ('personal', 'group', 'public'):
            error_msg = "share_type can only be 'personal' or 'group' or 'public'."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library %s not found.' % repo_id)

        # permission check
        username = request.user.username
        if is_org_context(request):
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)

        if username != repo_owner:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # delete share
        org_id = None
        if is_org_context(request):
            org_id = request.user.org.org_id

        if share_type == 'personal':
            user = request.GET.get('user', None)
            if not user or not is_valid_username(user):
                error_msg = 'user invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            # if user not found, permission will be None
            permission = seafile_api.check_permission_by_path(
                    repo_id, '/', user)

            try:
                if org_id:
                    seafile_api.org_remove_share(org_id, repo_id,
                                                 username, user)
                else:
                    seafile_api.remove_share(repo_id, username, user)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            send_perm_audit_msg('delete-repo-perm', username, user,
                    repo_id, '/', permission)

        if share_type == 'group':
            group_id = request.GET.get('group_id', None)
            if not group_id:
                error_msg = 'group_id invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            try:
                group_id = int(group_id)
            except ValueError:
                error_msg = 'group_id must be integer.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            # hacky way to get group repo permission
            permission = ''
            if org_id:
                for e in seafile_api.list_org_repo_shared_group(
                        org_id, username, repo_id):
                    if e.group_id == group_id:
                        permission = e.perm
                        break
            else:
                for e in seafile_api.list_repo_shared_group_by_user(username, repo_id):
                    if e.group_id == group_id:
                        permission = e.perm
                        break

            try:
                if org_id:
                    seaserv.del_org_group_repo(repo_id, org_id, group_id)
                else:
                    seafile_api.unset_group_repo(repo_id, group_id, username)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            send_perm_audit_msg('delete-repo-perm', username, group_id,
                                repo_id, '/', permission)

        if share_type == 'public':
            pub_repos = []
            if org_id:
                pub_repos = seaserv.list_org_inner_pub_repos(org_id, username)

            if not request.cloud_mode:
                pub_repos = seaserv.list_inner_pub_repos(username)

            try:
                if org_id:
                    seaserv.seafserv_threaded_rpc.unset_org_inner_pub_repo(org_id, repo_id)
                else:
                    seafile_api.remove_inner_pub_repo(repo_id)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            permission = ''
            for repo in pub_repos:
                if repo.repo_id == repo_id:
                    permission = repo.permission
                    break

            if permission:
                send_perm_audit_msg('delete-repo-perm', username, 'all', repo_id, '/', permission)

        return Response({'success': True})
