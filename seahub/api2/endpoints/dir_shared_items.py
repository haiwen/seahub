# Copyright (c) 2012-2016 Seafile Ltd.
import logging
import json

from django.http import HttpResponse
from pysearpc import SearpcError
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from django.utils.translation import gettext as _

import seaserv
from seaserv import seafile_api, ccnet_api
from constance import config

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.permissions import IsRepoAccessible
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.api2.endpoints.utils import is_org_user

from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email
from seahub.base.accounts import User
from seahub.group.utils import is_group_member, is_group_admin
from seahub.share.models import ExtraSharePermission, ExtraGroupsSharePermission
from seahub.share.utils import is_repo_admin, share_dir_to_user, \
        share_dir_to_group, update_user_dir_permission, \
        update_group_dir_permission, check_user_share_out_permission, \
        check_group_share_out_permission, normalize_custom_permission_name
from seahub.utils import (is_org_context, is_valid_username,
                          send_perm_audit_msg, SeafileDB)
from seahub.share.signals import share_repo_to_user_successful, share_repo_to_group_successful, \
    change_repo_perm_successful, delete_repo_perm_successful
from seahub.constants import PERMISSION_READ, PERMISSION_READ_WRITE, \
        PERMISSION_ADMIN
from seahub.utils.repo import get_available_repo_perms
from seahub.avatar.templatetags.avatar_tags import api_avatar_url
from seahub.settings import ENABLE_SHARE_TO_DEPARTMENT


logger = logging.getLogger(__name__)
json_content_type = 'application/json; charset=utf-8'


class DirSharedItemsEndpoint(APIView):
    """Support uniform interface(list, share, unshare, modify) for sharing
    library/folder to users/groups.
    """
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, IsRepoAccessible)
    throttle_classes = (UserRateThrottle,)

    def list_user_shared_items(self, request, repo_id, path):

        if is_org_context(request):
            # when calling seafile API to share authority related functions, change the uesrname to repo owner.
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
            org_id = request.user.org.org_id
            if path == '/':
                share_items = seafile_api.list_org_repo_shared_to(org_id,
                                                                  repo_owner,
                                                                  repo_id)
            else:
                share_items = seafile_api.get_org_shared_users_for_subdir(org_id,
                                                                          repo_id,
                                                                          path,
                                                                          repo_owner)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)
            if path == '/':
                share_items = seafile_api.list_repo_shared_to(repo_owner, repo_id)
            else:
                share_items = seafile_api.get_shared_users_for_subdir(repo_id,
                                                                      path, repo_owner)

        # change is_admin to True if user is repo admin.
        admin_users = ExtraSharePermission.objects.get_admin_users_by_repo(repo_id)
        ret = []
        for item in share_items:
            avatar_url, is_default, date_uploaded = api_avatar_url(item.user)
            ret.append({
                "share_type": "user",
                "user_info": {
                    "name": item.user,
                    "nickname": email2nickname(item.user),
                    "contact_email": email2contact_email(item.user),
                    "avatar_url": avatar_url,
                },
                "permission": item.perm,
                "is_admin": item.user in admin_users
            })
        return ret

    def list_group_shared_items(self, request, repo_id, path):
        if is_org_context(request):
            # when calling seafile API to share authority related functions, change the uesrname to repo owner.
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
            org_id = request.user.org.org_id
            if path == '/':
                share_items = seafile_api.list_org_repo_shared_group(org_id,
                                                                     repo_owner,
                                                                     repo_id)
            else:
                share_items = seafile_api.get_org_shared_groups_for_subdir(org_id,
                                                                           repo_id,
                                                                           path,
                                                                           repo_owner)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)
            if path == '/':
                share_items = seafile_api.list_repo_shared_group_by_user(repo_owner, repo_id)
            else:
                share_items = seafile_api.get_shared_groups_for_subdir(repo_id,
                                                                       path, repo_owner)
        ret = []
        # change is_admin to True if user in admin groups.
        admin_groups = ExtraGroupsSharePermission.objects.get_admin_groups_by_repo(repo_id)
        for item in share_items:

            if '@seafile_group' in repo_owner and \
                    repo_owner.split('@')[0] == str(item.group_id):
                continue

            group_id = item.group_id
            group = ccnet_api.get_group(group_id)
            if not group:
                if is_org_context(request):
                    if path == '/':
                        seafile_api.del_org_group_repo(repo_id, org_id, group_id)
                    else:
                        seafile_api.org_unshare_subdir_for_group(
                                org_id, repo_id, path, repo_owner, group_id)
                else:
                    if path == '/':
                        seafile_api.unset_group_repo(repo_id, group_id, repo_owner)
                    else:
                        seafile_api.unshare_subdir_for_group(repo_id, path,
                                                             repo_owner, group_id)
                continue

            ret.append({
                "share_type": "group",
                "group_info": {
                    "id": group_id,
                    "name": group.group_name,
                },
                "permission": item.perm,
                "is_admin": group_id in admin_groups,
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

    def get_repo_owner(self, request, repo_id):
        if is_org_context(request):
            return seafile_api.get_org_repo_owner(repo_id)
        else:
            return seafile_api.get_repo_owner(repo_id)

    def has_shared_to_user(self, request, repo_id, path, username):
        items = self.list_user_shared_items(request, repo_id, path)

        has_shared = False
        for item in items:
            if username == item['user_info']['name']:
                has_shared = True
                break

        return has_shared

    def has_shared_to_group(self, request, repo_id, path, group_id):
        items = self.list_group_shared_items(request, repo_id, path)

        has_shared = False
        for item in items:
            if group_id == item['group_info']['id']:
                has_shared = True
                break

        return has_shared

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
        if not request.user.permissions.can_share_repo():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        username = request.user.username
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library %s not found.' % repo_id)

        path = request.GET.get('p', '/')
        if seafile_api.get_dir_id_by_path(repo.id, path) is None:
            return api_error(status.HTTP_404_NOT_FOUND, 'Folder %s not found.' % path)

        permission = request.data.get('permission', PERMISSION_READ)
        if permission not in get_available_repo_perms():
            permission = normalize_custom_permission_name(permission)
            if not permission:
                return api_error(status.HTTP_400_BAD_REQUEST, 'permission invalid.')

        repo_owner = self.get_repo_owner(request, repo_id)
        if repo_owner != username and not is_repo_admin(username, repo_id):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        shared_to_user, shared_to_group = self.handle_shared_to_args(request)
        if shared_to_user:
            shared_to = request.GET.get('username')
            if shared_to is None or not is_valid_username(shared_to):
                return api_error(status.HTTP_400_BAD_REQUEST, 'Email %s invalid.' % shared_to)

            try:
                User.objects.get(email=shared_to)
            except User.DoesNotExist:
                return api_error(status.HTTP_400_BAD_REQUEST, 'Invalid user, should be registered')

            if is_org_context(request):
                # when calling seafile API to share authority related functions, change the uesrname to repo owner.
                repo_owner = seafile_api.get_org_repo_owner(repo_id)
                org_id = request.user.org.org_id

                update_user_dir_permission(repo_id, path, repo_owner, shared_to, permission, org_id)
            else:
                repo_owner = seafile_api.get_repo_owner(repo_id)

                update_user_dir_permission(repo_id, path, repo_owner, shared_to, permission)

            org_id = None
            if is_org_context(request):
                org_id = request.user.org.org_id
            change_repo_perm_successful.send(
                sender=None,
                from_user=username,
                to_user=shared_to,
                repo=repo,
                path=path,
                permission=permission,
                org_id=org_id
            )

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
                # when calling seafile API to share authority related functions, change the uesrname to repo owner.
                repo_owner = seafile_api.get_org_repo_owner(repo_id)
                org_id = request.user.org.org_id

                update_group_dir_permission(repo_id, path, repo_owner, gid, permission, org_id)
            else:
                repo_owner = seafile_api.get_repo_owner(repo_id)

                update_group_dir_permission(repo_id, path, repo_owner, gid, permission, None)

            send_perm_audit_msg('modify-repo-perm', username, gid,
                                repo_id, path, permission)

        return HttpResponse(json.dumps({'success': True}), status=200,
                            content_type=json_content_type)

    def put(self, request, repo_id, format=None):

        if not request.user.permissions.can_share_repo():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        username = request.user.username
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library %s not found.' % repo_id)

        path = request.GET.get('p', '/')
        if seafile_api.get_dir_id_by_path(repo.id, path) is None:
            return api_error(status.HTTP_404_NOT_FOUND, 'Folder %s not found.' % path)

        if repo.encrypted and path != '/':
            return api_error(status.HTTP_400_BAD_REQUEST, 'Folder invalid.')

        share_type = request.data.get('share_type')
        if share_type != 'user' and share_type != 'group':
            return api_error(status.HTTP_400_BAD_REQUEST, 'share_type invalid.')

        repo_owner = self.get_repo_owner(request, repo_id)
        if repo_owner != username and not is_repo_admin(username, repo_id):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        permission = request.data.get('permission', PERMISSION_READ)
        if permission not in get_available_repo_perms():
            permission = normalize_custom_permission_name(permission)
            if not permission:
                return api_error(status.HTTP_400_BAD_REQUEST, 'permission invalid.')

        result = {}
        result['failed'] = []
        result['success'] = []

        if share_type == 'user':
            share_to_users = request.data.getlist('username')
            for to_user in share_to_users:
                if not is_valid_username(to_user):
                    result['failed'].append({
                        'email': to_user,
                        'error_msg': _('username invalid.')
                        })
                    continue

                try:
                    User.objects.get(email=to_user)
                except User.DoesNotExist:
                    result['failed'].append({
                        'email': to_user,
                        'error_msg': _('User %s not found.') % to_user
                        })
                    continue

                if self.has_shared_to_user(request, repo_id, path, to_user):
                    result['failed'].append({
                        'email': to_user,
                        'error_msg': _('This item has been shared to %s.') % email2nickname(to_user)
                        })
                    continue

                try:
                    org_id = None
                    if is_org_context(request):
                        org_id = request.user.org.org_id

                        if not is_org_user(to_user, int(org_id)):
                            org_name = request.user.org.org_name
                            error_msg = f'User {to_user} is not member of organization {org_name}.'

                            result['failed'].append({
                                'email': to_user,
                                'error_msg': error_msg
                            })
                            continue

                        # when calling seafile API to share authority related functions,
                        # change the uesrname to repo owner.
                        repo_owner = seafile_api.get_org_repo_owner(repo_id)
                        # can't share to owner
                        if to_user == repo_owner:
                            error_msg = "Library can not be shared to owner"
                            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

                        share_dir_to_user(repo, path, repo_owner, username, to_user, permission, org_id)
                    else:
                        if is_org_user(to_user):
                            error_msg = 'User %s is a member of organization.' % to_user
                            result['failed'].append({
                                'email': to_user,
                                'error_msg': error_msg
                            })
                            continue

                        repo_owner = seafile_api.get_repo_owner(repo_id)
                        # can't share to owner
                        if to_user == repo_owner:
                            error_msg = "Library can not be shared to owner"
                            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

                        share_dir_to_user(repo, path, repo_owner, username, to_user, permission, None)

                    avatar_url, is_default, date_uploaded = api_avatar_url(to_user)
                    result['success'].append({
                        "share_type": "user",
                        "user_info": {
                            "name": to_user,
                            "nickname": email2nickname(to_user),
                            "contact_email": email2contact_email(to_user),
                            "avatar_url": avatar_url,
                        },
                        "permission": PERMISSION_READ_WRITE if permission == PERMISSION_ADMIN else permission,
                        "is_admin": permission == PERMISSION_ADMIN
                    })

                    # send a signal when sharing repo successful
                    share_repo_to_user_successful.send(sender=None, from_user=username,
                                                       to_user=to_user, repo=repo,
                                                       path=path, org_id=org_id)

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
                    result['failed'].append({
                        'error_msg': 'group_id %s invalid.' % gid
                        })
                    continue

                group = ccnet_api.get_group(gid)
                if not group:
                    result['failed'].append({
                        'error_msg': 'Group %s not found' % gid
                        })
                    continue

                if not config.ENABLE_SHARE_TO_ALL_GROUPS and \
                        not is_group_member(gid, username):
                    result['failed'].append({
                        'group_name': group.group_name,
                        'error_msg': 'Permission denied.'
                        })
                    continue

                # is sharing repo to department
                if group.parent_group_id != 0:

                    if not ENABLE_SHARE_TO_DEPARTMENT or \
                            ENABLE_SHARE_TO_DEPARTMENT and not is_group_admin(gid, username):
                        result['failed'].append({
                            'group_name': group.group_name,
                            'error_msg': 'Permission denied.'
                            })
                        continue

                if self.has_shared_to_group(request, repo_id, path, gid):
                    result['failed'].append({
                        'group_name': group.group_name,
                        'error_msg': _('This item has been shared to %s.') % group.group_name
                        })
                    continue

                try:
                    org_id = None
                    if is_org_context(request):
                        # when calling seafile API to share authority related functions,
                        # change the uesrname to repo owner.
                        repo_owner = seafile_api.get_org_repo_owner(repo_id)
                        org_id = request.user.org.org_id

                        share_dir_to_group(repo, path, repo_owner, username, gid, permission, org_id)
                    else:
                        repo_owner = seafile_api.get_repo_owner(repo_id)

                        share_dir_to_group(repo, path, repo_owner, username, gid, permission, None)

                    result['success'].append({
                        "share_type": "group",
                        "group_info": {
                            "id": gid,
                            "name": group.group_name,
                        },
                        "permission": PERMISSION_READ_WRITE if permission == PERMISSION_ADMIN else permission,
                        "is_admin": permission == PERMISSION_ADMIN
                    })

                    share_repo_to_group_successful.send(sender=None,
                                                        from_user=username,
                                                        group_id=gid, repo=repo,
                                                        path=path, org_id=org_id)

                    send_perm_audit_msg('add-repo-perm', username, gid,
                                        repo_id, path, permission)
                except SearpcError as e:
                    logger.error(e)
                    result['failed'].append({
                        'group_name': group.group_name,
                        'error_msg': 'Internal Server Error'
                        })
                    continue
                    
        seafile_db = SeafileDB()
        virtual_repo_id = seafile_db.get_virtual_repo_id(repo_id, path)
        result['virtual_repo_id'] = virtual_repo_id

        return HttpResponse(json.dumps(result),
                            status=200,
                            content_type=json_content_type)

    def delete(self, request, repo_id, format=None):

        if not request.user.permissions.can_share_repo():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        username = request.user.username
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library %s not found.' % repo_id)

        path = request.GET.get('p', '/')
        if seafile_api.get_dir_id_by_path(repo.id, path) is None:
            return api_error(status.HTTP_404_NOT_FOUND, 'Folder %s not found.' % path)

        repo_owner = self.get_repo_owner(request, repo_id)
        if repo_owner != username and not is_repo_admin(username, repo_id):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        shared_to_user, shared_to_group = self.handle_shared_to_args(request)
        if shared_to_user:
            shared_to = request.GET.get('username')
            if shared_to is None or not is_valid_username(shared_to):
                return api_error(status.HTTP_400_BAD_REQUEST, 'Email %s invalid.' % shared_to)

            permission = check_user_share_out_permission(repo_id, path, shared_to, is_org_context(request))

            if is_org_context(request):
                # when calling seafile API to share authority related functions, change the uesrname to repo owner.
                org_id = request.user.org.org_id
                if path == '/':
                    seaserv.seafserv_threaded_rpc.org_remove_share(
                            org_id, repo_id, repo_owner, shared_to)
                else:
                    seafile_api.org_unshare_subdir_for_user(
                            org_id, repo_id, path, repo_owner, shared_to)

            else:
                if path == '/':
                    seaserv.remove_share(repo_id, repo_owner, shared_to)
                else:
                    seafile_api.unshare_subdir_for_user(
                            repo_id, path, repo_owner, shared_to)

            # Delete share permission at ExtraSharePermission table.
            if path == '/':
                ExtraSharePermission.objects.delete_share_permission(repo_id,
                                                                     shared_to)

            org_id = None
            if is_org_context(request):
                org_id = request.user.org.org_id
            delete_repo_perm_successful.send(
                sender=None,
                from_user=username,
                to_user=shared_to,
                repo=repo,
                path=path,
                org_id=org_id
            )
            send_perm_audit_msg('delete-repo-perm', username, shared_to,
                                repo_id, path, permission)

        if shared_to_group:
            group_id = request.GET.get('group_id')
            try:
                group_id = int(group_id)
            except ValueError:
                return api_error(status.HTTP_400_BAD_REQUEST, 'group_id %s invalid' % group_id)

            # hacky way to get group repo permission
            is_org = is_org_context(request)
            permission = check_group_share_out_permission(repo_id, path, group_id, is_org)

            if is_org:
                # when calling seafile API to share authority related functions, change the uesrname to repo owner.
                org_id = request.user.org.org_id
                if path == '/':
                    seaserv.del_org_group_repo(repo_id, org_id, group_id)
                else:
                    seafile_api.org_unshare_subdir_for_group(
                            org_id, repo_id, path, repo_owner, group_id)
            else:
                if path == '/':
                    seafile_api.unset_group_repo(repo_id, group_id, username)
                else:
                    seafile_api.unshare_subdir_for_group(
                            repo_id, path, repo_owner, group_id)

            # delete share permission if repo is deleted
            if path == '/':
                ExtraGroupsSharePermission.objects.delete_share_permission(repo_id,
                                                                           group_id)
            send_perm_audit_msg('delete-repo-perm', username, group_id,
                                repo_id, path, permission)

        return HttpResponse(json.dumps({'success': True}), status=200,
                            content_type=json_content_type)
