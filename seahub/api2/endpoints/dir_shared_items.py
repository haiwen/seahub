import logging
import json
import os

from django.http import HttpResponse
from pysearpc import SearpcError
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
import seaserv
from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.permissions import IsRepoAccessible
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.base.accounts import User
from seahub.share.signals import share_repo_to_user_successful, \
    share_repo_to_group_successful
from seahub.utils import (is_org_context, is_valid_username,
                          send_perm_audit_msg)


logger = logging.getLogger(__name__)
json_content_type = 'application/json; charset=utf-8'

class DirSharedItemsEndpoint(APIView):
    """Support uniform interface(list, share, unshare, modify) for sharing
    library/folder to users/groups.
    """
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, IsRepoAccessible)
    throttle_classes = (UserRateThrottle, )

    def list_user_shared_items(self, request, repo_id, path):
        username = request.user.username
        if path == '/':
            share_items = seafile_api.list_repo_shared_to(username, repo_id)
        else:
            share_items = seafile_api.get_shared_users_for_subdir(repo_id,
                                                                  path, username)
        ret = []
        for item in share_items:
            ret.append({
                "share_type": "user",
                "user_info": {
                    "name": item.user,
                    "nickname": email2nickname(item.user),
                },
                "permission": item.perm,
            })
        return ret

    def list_group_shared_items(self, request, repo_id, path):
        username = request.user.username
        if path == '/':
            share_items = seafile_api.list_repo_shared_group_by_user(username, repo_id)
        else:
            share_items = seafile_api.get_shared_groups_for_subdir(repo_id,
                                                                   path, username)
        ret = []
        for item in share_items:
            ret.append({
                "share_type": "group",
                "group_info": {
                    "id": item.group_id,
                    "name": seaserv.get_group(item.group_id).group_name,
                },
                "permission": item.perm,
            })
        return ret

    def handle_shared_to_args(self, request):
        share_type = request.GET.get('share_type', None)
        shared_to_user = False
        shared_to_group = False
        if share_type:
            for e in share_type.split(','):
                e = e.strip()
                if e not in ['user', 'group']:
                    continue
                if e == 'user':
                    shared_to_user = True
                if e == 'group':
                    shared_to_group = True
        else:
            shared_to_user = True
            shared_to_group = True

        return (shared_to_user, shared_to_group)

    def get_sub_repo_by_path(self, request, repo, path):
        if path == '/':
            raise Exception("Invalid path")

        # get or create sub repo
        username = request.user.username
        if is_org_context(request):
            org_id = request.user.org.org_id
            sub_repo = seaserv.seafserv_threaded_rpc.get_org_virtual_repo(
                org_id, repo.id, path, username)
        else:
            sub_repo = seafile_api.get_virtual_repo(repo.id, path, username)

        return sub_repo

    def get_or_create_sub_repo_by_path(self, request, repo, path):
        username = request.user.username
        sub_repo = self.get_sub_repo_by_path(request, repo, path)
        if not sub_repo:
            name = os.path.basename(path)
            # create a sub-lib,
            # use name as 'repo_name' & 'repo_desc' for sub_repo
            if is_org_context(request):
                org_id = request.user.org.org_id
                sub_repo_id = seaserv.seafserv_threaded_rpc.create_org_virtual_repo(
                    org_id, repo.id, path, name, name, username)
            else:
                sub_repo_id = seafile_api.create_virtual_repo(repo.id, path,
                                                              name, name, username)
            sub_repo = seafile_api.get_repo(sub_repo_id)

        return sub_repo

    def get_repo_owner(self, request, repo_id):
        if is_org_context(request):
            return seafile_api.get_org_repo_owner(repo_id)
        else:
            return seafile_api.get_repo_owner(repo_id)

    def get(self, request, repo_id, format=None):
        """List shared items(shared to users/groups) for a folder/library.
        """
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library %s not found.' % repo_id)

        shared_to_user, shared_to_group = self.handle_shared_to_args(request)

        path = request.GET.get('p', '/')
        if seafile_api.get_dir_id_by_path(repo.id, path) is None:
            return api_error(status.HTTP_404_NOT_FOUND, 'Folder %s not found.' % path)

        ret = []
        if shared_to_user:
            ret += self.list_user_shared_items(request, repo_id, path)

        if shared_to_group:
            ret += self.list_group_shared_items(request, repo_id, path)

        return HttpResponse(json.dumps(ret), status=200,
                            content_type=json_content_type)

    def post(self, request, repo_id, format=None):
        """Update shared item permission.
        """
        username = request.user.username
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library %s not found.' % repo_id)

        path = request.GET.get('p', '/')
        if seafile_api.get_dir_id_by_path(repo.id, path) is None:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Directory not found.')

        if username != self.get_repo_owner(request, repo_id):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        shared_to_user, shared_to_group = self.handle_shared_to_args(request)

        permission = request.data.get('permission', 'r')
        if permission not in ['r', 'rw']:
            return api_error(status.HTTP_400_BAD_REQUEST, 'permission invalid.')

        path = request.GET.get('p', '/')
        if seafile_api.get_dir_id_by_path(repo.id, path) is None:
            return api_error(status.HTTP_404_NOT_FOUND, 'Folder %s not found.' % path)

        if path == '/':
            shared_repo = repo
        else:
            try:
                sub_repo = self.get_sub_repo_by_path(request, repo, path)
                if sub_repo:
                    shared_repo = sub_repo
                else:
                    # unlikely to happen
                    return api_error(status.HTTP_404_NOT_FOUND, 'Failed to get sub repo')
            except SearpcError as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        if shared_to_user:
            shared_to = request.GET.get('username')
            if shared_to is None or not is_valid_username(shared_to):
                return api_error(status.HTTP_400_BAD_REQUEST, 'Email %s invalid.' % shared_to)

            try:
                User.objects.get(email=shared_to)
            except User.DoesNotExist:
                return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid user, should be registered')

            if is_org_context(request):
                org_id = request.user.org.org_id
                seaserv.seafserv_threaded_rpc.org_set_share_permission(
                    org_id, shared_repo.id, username, shared_to, permission)
            else:
                seafile_api.set_share_permission(shared_repo.id, username,
                                                 shared_to, permission)

            send_perm_audit_msg('modify-repo-perm', username, shared_to,
                                repo_id, path, permission)

        if shared_to_group:
            gid = request.GET.get('group_id')
            try:
                gid = int(gid)
            except ValueError:
                return api_error(status.HTTP_400_BAD_REQUEST, 'group_id %s invalid.' % gid)
            group = seaserv.get_group(gid)
            if not group:
                return api_error(status.HTTP_404_NOT_FOUND, 'Group %s not found.' % gid)

            if is_org_context(request):
                org_id = request.user.org.org_id
                seaserv.seafserv_threaded_rpc.set_org_group_repo_permission(
                    org_id, gid, shared_repo.id, permission)
            else:
                seafile_api.set_group_repo_permission(gid, shared_repo.id,
                                                      permission)

            send_perm_audit_msg('modify-repo-perm', username, gid,
                                repo_id, path, permission)

        return HttpResponse(json.dumps({'success': True}), status=200,
                            content_type=json_content_type)

    def put(self, request, repo_id, format=None):
        username = request.user.username
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library %s not found.' % repo_id)

        path = request.GET.get('p', '/')
        if seafile_api.get_dir_id_by_path(repo.id, path) is None:
            return api_error(status.HTTP_404_NOT_FOUND, 'Folder %s not found.' % path)

        if username != self.get_repo_owner(request, repo_id):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        if path != '/':
            try:
                sub_repo = self.get_or_create_sub_repo_by_path(request, repo, path)
            except SearpcError as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Failed to get sub repo.')
        else:
            sub_repo = None

        share_type = request.data.get('share_type')
        if share_type != 'user' and share_type != 'group':
            return api_error(status.HTTP_400_BAD_REQUEST, 'share_type invalid.')

        permission = request.data.get('permission', 'r')
        if permission not in ['r', 'rw']:
            return api_error(status.HTTP_400_BAD_REQUEST, 'permission invalid.')

        shared_repo = repo if path == '/' else sub_repo
        result = {}
        result['failed'] = []
        result['success'] = []

        if share_type == 'user':
            share_to_users = request.data.getlist('username')
            for to_user in share_to_users:
                if not is_valid_username(to_user):
                    result['failed'].append({
                        'email': to_user,
                        'error_msg': 'username invalid.'
                        })
                    continue

                try:
                    User.objects.get(email=to_user)
                except User.DoesNotExist:
                    result['failed'].append({
                        'email': to_user,
                        'error_msg': 'User %s not found.' % to_user
                        })
                    continue

                try:
                    if is_org_context(request):
                        org_id = request.user.org.org_id
                        seaserv.seafserv_threaded_rpc.org_add_share(
                            org_id, shared_repo.id, username, to_user,
                            permission)
                    else:
                        seafile_api.share_repo(shared_repo.id, username,
                                               to_user, permission)

                    # send a signal when sharing repo successful
                    share_repo_to_user_successful.send(sender=None,
                                                       from_user=username,
                                                       to_user=to_user,
                                                       repo=shared_repo)
                    result['success'].append({
                        "share_type": "user",
                        "user_info": {
                            "name": to_user,
                            "nickname": email2nickname(to_user),
                        },
                        "permission": permission
                    })

                    send_perm_audit_msg('add-repo-perm', username, to_user,
                                        repo_id, path, permission)
                except SearpcError as e:
                    logger.error(e)
                    result['failed'].append({
                        'email': to_user,
                        'error_msg': 'Internal Server Error'
                        })
                    continue

        if share_type == 'group':
            group_ids = request.data.getlist('group_id')
            for gid in group_ids:
                try:
                    gid = int(gid)
                except ValueError:
                    return api_error(status.HTTP_400_BAD_REQUEST, 'group_id %s invalid.' % gid)
                group = seaserv.get_group(gid)
                if not group:
                    return api_error(status.HTTP_404_NOT_FOUND, 'Group %s not found' % gid)

                try:
                    if is_org_context(request):
                        org_id = request.user.org.org_id
                        seafile_api.add_org_group_repo(shared_repo.repo_id,
                                                       org_id, gid, username,
                                                       permission)
                    else:
                        seafile_api.set_group_repo(shared_repo.repo_id, gid,
                                                   username, permission)

                    share_repo_to_group_successful.send(sender=None,
                        from_user=username, group_id=gid, repo=shared_repo)

                    result['success'].append({
                        "share_type": "group",
                        "group_info": {
                            "id": gid,
                            "name": group.group_name,
                        },
                        "permission": permission
                    })

                    send_perm_audit_msg('add-repo-perm', username, gid,
                                        repo_id, path, permission)
                except SearpcError as e:
                    logger.error(e)
                    result['failed'].append({
                        'group_name': group.group_name,
                        'error_msg': 'Internal Server Error'
                        })
                    continue

        return HttpResponse(json.dumps(result),
            status=200, content_type=json_content_type)

    def delete(self, request, repo_id, format=None):
        username = request.user.username
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library %s not found.' % repo_id)

        path = request.GET.get('p', '/')
        if seafile_api.get_dir_id_by_path(repo.id, path) is None:
            return api_error(status.HTTP_404_NOT_FOUND, 'Folder %s not found.' % path)

        if username != self.get_repo_owner(request, repo_id):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        shared_to_user, shared_to_group = self.handle_shared_to_args(request)

        if path == '/':
            shared_repo = repo
        else:
            try:
                sub_repo = self.get_sub_repo_by_path(request, repo, path)
                if sub_repo:
                    shared_repo = sub_repo
                else:
                    return api_error(status.HTTP_404_NOT_FOUND, 'Sub-library not found.')
            except SearpcError as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Failed to get sub-library.')

        if shared_to_user:
            shared_to = request.GET.get('username')
            if shared_to is None or not is_valid_username(shared_to):
                return api_error(status.HTTP_400_BAD_REQUEST, 'Email %s invalid.' % shared_to)

            try:
                User.objects.get(email=shared_to)
            except User.DoesNotExist:
                return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid user, should be registered')

            if is_org_context(request):
                org_id = request.user.org.org_id
                seaserv.seafserv_threaded_rpc.org_remove_share(
                    org_id, shared_repo.id, username, shared_to)
            else:
                seaserv.remove_share(shared_repo.id, username, shared_to)

            permission = seafile_api.check_permission_by_path(repo.id, path,
                                                              shared_to)
            send_perm_audit_msg('delete-repo-perm', username, shared_to,
                                repo_id, path, permission)

        if shared_to_group:
            group_id = request.GET.get('group_id')
            try:
                group_id = int(group_id)
            except ValueError:
                return api_error(status.HTTP_400_BAD_REQUEST, 'group_id %s invalid' % group_id)

            # hacky way to get group repo permission
            permission = ''
            for e in seafile_api.list_repo_shared_group_by_user(username, shared_repo.id):
                if e.group_id == group_id:
                    permission = e.perm
                    break

            if is_org_context(request):
                org_id = request.user.org.org_id
                seaserv.del_org_group_repo(shared_repo.id, org_id, group_id)
            else:
                seafile_api.unset_group_repo(shared_repo.id, group_id, username)

            send_perm_audit_msg('delete-repo-perm', username, group_id,
                                repo_id, path, permission)

        return HttpResponse(json.dumps({'success': True}), status=200,
                            content_type=json_content_type)
