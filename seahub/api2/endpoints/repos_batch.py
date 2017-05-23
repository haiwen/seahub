# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from pysearpc import SearpcError
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
import seaserv
from seaserv import seafile_api, ccnet_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.base.accounts import User
from seahub.share.signals import share_repo_to_user_successful, \
    share_repo_to_group_successful
from seahub.utils import (is_org_context, send_perm_audit_msg)

logger = logging.getLogger(__name__)

class ReposBatchView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get_repo_shared_to_users(self, request, repo_id):
        username = request.user.username

        if is_org_context(request):
            org_id = request.user.org.org_id
            share_items = seafile_api.list_org_repo_shared_to(org_id, username, repo_id)
        else:
            share_items = seafile_api.list_repo_shared_to(username, repo_id)

        ret = []
        for item in share_items:
            ret.append(item.user)

        return ret

    def has_shared_to_user(self, request, repo_id, username):
        users = self.get_repo_shared_to_users(request, repo_id)

        has_shared = False
        if username in users:
            has_shared = True

        return has_shared

    def get_repo_shared_to_groups(self, request, repo_id):
        username = request.user.username
        if is_org_context(request):
            org_id = request.user.org.org_id
            share_items = seafile_api.list_org_repo_shared_group(org_id,
                    username, repo_id)
        else:
            share_items = seafile_api.list_repo_shared_group_by_user(
                    username, repo_id)

        ret = []
        for item in share_items:
            ret.append(item.group_id)

        return ret

    def has_shared_to_group(self, request, repo_id, group_id):
        group_ids = self.get_repo_shared_to_groups(request, repo_id)

        has_shared = False
        if group_id in group_ids:
            has_shared = True

        return has_shared

    def post(self, request):

        # argument check
        operation = request.data.get('operation')

        # operation could be `share`, `delete`, `transfer`
        # we now only use `share`
        if not operation or operation not in ('share'):
            error_msg = 'operation invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        result = {}
        result['failed'] = []
        result['success'] = []

        username = request.user.username
        repo_id_list = request.data.getlist('repo_id')
        valid_repo_id_list = []

        # filter out invalid repo id
        for repo_id in repo_id_list:

            if not seafile_api.get_repo(repo_id):
                result['failed'].append({
                    'repo_id': repo_id,
                    'error_msg': 'Library %s not found.' % repo_id
                })
                continue

            if is_org_context(request):
                org_id = request.user.org.org_id
                org_repo_owner = seafile_api.get_org_repo_owner(repo_id)
                if not username == org_repo_owner:
                    result['failed'].append({
                        'repo_id': repo_id,
                        'error_msg': 'Permission denied.'
                    })
                    continue
            else:
                if not seafile_api.is_repo_owner(username, repo_id):
                    result['failed'].append({
                        'repo_id': repo_id,
                        'error_msg': 'Permission denied.'
                    })
                    continue

            valid_repo_id_list.append(repo_id)

        # share repo
        if operation == 'share':

            share_type = request.data.get('share_type')
            if share_type != 'user' and share_type != 'group':
                error_msg = 'share_type invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            permission = request.data.get('permission', 'rw')
            if permission not in ('r', 'rw'):
                error_msg = 'permission invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            # share repo to user
            if share_type == 'user':
                to_username = request.data.get('username', None)
                if not to_username:
                    error_msg = 'username invalid.'
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

                try:
                    User.objects.get(email=to_username)
                except User.DoesNotExist:
                    error_msg = 'User %s not found.' % to_username
                    return api_error(status.HTTP_404_NOT_FOUND, error_msg)

                # check if to_user is an org user
                try:
                    org_of_to_user = ccnet_api.get_orgs_by_user(to_username)
                except Exception as e:
                    logger.debug(e)
                    org_of_to_user = []

                if is_org_context(request):
                    org_id = request.user.org.org_id
                    org_name = request.user.org.org_name
                    if len(org_of_to_user) == 0 or org_id != org_of_to_user[0].org_id:
                        error_msg = 'User %s is not member of organization %s.' \
                                % (to_username, org_name)
                        return api_error(status.HTTP_403_FORBIDDEN, error_msg)
                else:
                    if len(org_of_to_user) >= 1:
                        error_msg = 'User %s is member of organization %s.' \
                                % (to_username, org_of_to_user[0].org_name)
                        return api_error(status.HTTP_403_FORBIDDEN, error_msg)

                for repo_id in valid_repo_id_list:
                    if self.has_shared_to_user(request, repo_id, to_username):
                        result['failed'].append({
                            'repo_id': repo_id,
                            'error_msg': 'This item has been shared to %s.' % to_username
                            })
                        continue

                    try:
                        if is_org_context(request):
                            org_id = request.user.org.org_id
                            seaserv.seafserv_threaded_rpc.org_add_share(org_id,
                                    repo_id, username, to_username, permission)
                        else:
                            seafile_api.share_repo(
                                    repo_id, username, to_username, permission)

                        # send a signal when sharing repo successful
                        repo = seafile_api.get_repo(repo_id)
                        share_repo_to_user_successful.send(sender=None,
                                from_user=username, to_user=to_username, repo=repo)

                        result['success'].append({
                            "repo_id": repo_id,
                            "username": to_username,
                            "permission": permission
                        })

                        send_perm_audit_msg('add-repo-perm', username, to_username,
                                            repo_id, '/', permission)
                    except Exception as e:
                        logger.error(e)
                        result['failed'].append({
                            'repo_id': repo_id,
                            'error_msg': 'Internal Server Error'
                            })

            # share repo to group
            if share_type == 'group':
                to_group_id = request.data.get('group_id', None)
                if not to_group_id:
                    error_msg = 'group_id invalid.'
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

                try:
                    to_group_id = int(to_group_id)
                except ValueError:
                    error_msg = 'group_id invalid.'
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

                group = ccnet_api.get_group(to_group_id)
                if not group:
                    error_msg = 'Group %s not found.' % to_group_id
                    return api_error(status.HTTP_404_NOT_FOUND, error_msg)

                group_name = group.group_name
                if not ccnet_api.is_group_user(to_group_id, username):
                    error_msg = 'User %s is not member of group %s.' % (username, group_name)
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)

                for repo_id in valid_repo_id_list:
                    if self.has_shared_to_group(request, repo_id, to_group_id):
                        result['failed'].append({
                            'repo_id': repo_id,
                            'error_msg': 'This item has been shared to %s.' % group_name
                            })
                        continue

                    try:
                        if is_org_context(request):
                            org_id = request.user.org.org_id
                            seafile_api.add_org_group_repo(
                                    repo_id, org_id, to_group_id, username, permission)
                        else:
                            seafile_api.set_group_repo(
                                    repo_id, to_group_id, username, permission)

                        # send a signal when sharing repo successful
                        repo = seafile_api.get_repo(repo_id)
                        share_repo_to_group_successful.send(sender=None,
                                from_user=username, group_id=to_group_id, repo=repo)

                        result['success'].append({
                            "repo_id": repo_id,
                            "group_id": to_group_id,
                            "group_name": group_name,
                            "permission": permission
                        })

                        send_perm_audit_msg('add-repo-perm', username, to_group_id,
                                            repo_id, '/', permission)

                    except SearpcError as e:
                        logger.error(e)
                        result['failed'].append({
                            'repo_id': repo_id,
                            'error_msg': 'Internal Server Error'
                            })

        return Response(result)
