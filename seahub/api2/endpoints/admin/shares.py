# Copyright (c) 2012-2016 Seafile Ltd.
import logging
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from django.utils.translation import ugettext as _

from seaserv import seafile_api, ccnet_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.share.models import ExtraSharePermission, ExtraGroupsSharePermission
from seahub.share.utils import update_user_dir_permission, \
        update_group_dir_permission, share_dir_to_user, share_dir_to_group, \
        has_shared_to_user, has_shared_to_group, check_user_share_out_permission, \
        check_group_share_out_permission
from seahub.share.signals import share_repo_to_user_successful, share_repo_to_group_successful

from seahub.base.accounts import User
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.utils import is_valid_username, send_perm_audit_msg
from seahub.utils.repo import get_available_repo_perms
from seahub.constants import PERMISSION_READ, PERMISSION_READ_WRITE, \
        PERMISSION_ADMIN

logger = logging.getLogger(__name__)

def check_parameter(func):
    """
    Decorator for check parameter
    """
    def _decorated(view, request, *args, **kwargs):

        # argument check
        if request.method == 'GET':
            repo_id = request.GET.get('repo_id', None)
            path = request.GET.get('path', '/')
            share_type = request.GET.get('share_type', None)
        else:
            repo_id = request.data.get('repo_id', None)
            path = request.data.get('path', '/')
            share_type = request.data.get('share_type', None)

        if not repo_id:
            error_msg = 'repo_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not share_type or share_type not in ('user', 'group'):
            error_msg = 'share_type invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not seafile_api.get_dir_id_by_path(repo_id, path):
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        return func(view, request, repo, path, share_type, *args, **kwargs)

    return _decorated

class AdminShares(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    @check_parameter
    def get(self, request, repo, path, share_type):
        """ List user/group shares

        Permission checking:
        1. admin user.
        """

        result = []

        # current `request.user.username` is admin user,
        # so need to identify the repo owner specifically.
        repo_owner = seafile_api.get_repo_owner(repo.repo_id)
        if share_type == 'user':
            try:
                if path == '/':
                    share_items = seafile_api.list_repo_shared_to(
                            repo_owner, repo.repo_id)
                else:
                    share_items = seafile_api.get_shared_users_for_subdir(
                            repo.repo_id, path, repo_owner)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            admin_users = ExtraSharePermission.objects.get_admin_users_by_repo(repo.repo_id)
            for share_item in share_items:

                user_email = share_item.user
                user_name = email2nickname(user_email) if user_email else '--'

                share_info = {}
                share_info['repo_id'] = repo.repo_id
                share_info['path'] = path
                share_info['share_type'] = share_type
                share_info['user_email'] = user_email
                share_info['user_name'] = user_name
                share_info['permission'] = share_item.perm
                share_info['is_admin'] = user_email in admin_users

                result.append(share_info)

        if share_type == 'group':
            try:
                if path == '/':
                    share_items = seafile_api.list_repo_shared_group_by_user(
                            repo_owner, repo.repo_id)
                else:
                    share_items = seafile_api.get_shared_groups_for_subdir(
                            repo.repo_id, path, repo_owner)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            admin_groups = ExtraGroupsSharePermission.objects.get_admin_groups_by_repo(repo.repo_id)
            for share_item in share_items:

                group_id = share_item.group_id
                group = ccnet_api.get_group(group_id)
                group_name = group.group_name if group else '--'

                share_info = {}
                share_info['repo_id'] = repo.repo_id
                share_info['path'] = path
                share_info['share_type'] = share_type
                share_info['group_id'] = group_id
                share_info['group_name'] = group_name
                share_info['permission'] = share_item.perm
                share_info['is_admin'] = group_id in admin_groups

                result.append(share_info)

        return Response(result)

    @check_parameter
    def post(self, request, repo, path, share_type):
        """ Admin share a library to user/group.

        Permission checking:
        1. admin user.
        """

        # argument check
        permission = request.data.get('permission', None)
        if not permission or permission not in get_available_repo_perms():
            error_msg = 'permission invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        result = {}
        result['failed'] = []
        result['success'] = []
        share_to = request.data.getlist('share_to')

        # current `request.user.username` is admin user,
        # so need to identify the repo owner specifically.
        repo_owner = seafile_api.get_repo_owner(repo.repo_id)
        username = request.user.username

        if share_type == 'user':
            for email in share_to:
                if repo_owner == email:
                    result['failed'].append({
                        'user_email': email,
                        'error_msg': _(u'User %s is already library owner.') % email
                        })

                    continue

                if not is_valid_username(email):
                    result['failed'].append({
                        'user_email': email,
                        'error_msg': _('Email %s invalid.') % email
                        })

                    continue

                try:
                    User.objects.get(email=email)
                except User.DoesNotExist:
                    result['failed'].append({
                        'user_email': email,
                        'error_msg': 'User %s not found.' % email
                        })

                    continue

                if has_shared_to_user(repo.repo_id, path, email):
                    result['failed'].append({
                        'email': email,
                        'error_msg': _(u'This item has been shared to %s.') % email
                    })
                    continue

                try:

                    share_dir_to_user(repo, path, repo_owner, username, email, permission)
                    share_repo_to_user_successful.send(sender=None, from_user=username,
                                                       to_user=email, repo=repo,
                                                       path=path, org_id=None)
                    send_perm_audit_msg('add-repo-perm', username, email,
                                         repo.repo_id, path, permission)

                except Exception as e:
                    logger.error(e)
                    result['failed'].append({
                        'user_email': email,
                        'error_msg': 'Internal Server Error'
                        })

                    continue

                result['success'].append({
                    "repo_id": repo.repo_id,
                    "path": path,
                    "share_type": share_type,
                    "user_email": email,
                    "user_name": email2nickname(email),
                    "permission": PERMISSION_READ_WRITE if permission == PERMISSION_ADMIN else permission,
                    "is_admin": permission == PERMISSION_ADMIN
                })

        if share_type == 'group':
            for group_id in share_to:
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

                if has_shared_to_group(repo.repo_id, path, group_id):
                    result['failed'].append({
                        'group_name': group.group_name,
                        'error_msg': _(u'This item has been shared to %s.') % group.group_name
                        })
                    continue

                try:
                    share_dir_to_group(repo, path, repo_owner, username, group_id, permission)

                    share_repo_to_group_successful.send(sender=None,
                                                        from_user=username,
                                                        group_id=group_id, repo=repo,
                                                        path=path, org_id=None)

                    send_perm_audit_msg('add-repo-perm', username, group_id,
                                        repo.repo_id, path, permission)
                except Exception as e:
                    logger.error(e)
                    result['failed'].append({
                        "group_id": group_id,
                        'error_msg': 'Internal Server Error'
                        })

                    continue

                result['success'].append({
                    "repo_id": repo.repo_id,
                    "path": path,
                    "share_type": share_type,
                    "group_id": group_id,
                    "group_name": group.group_name,
                    "permission": PERMISSION_READ_WRITE if permission == PERMISSION_ADMIN else permission,
                    "is_admin": permission == PERMISSION_ADMIN
                })

        return Response(result)

    @check_parameter
    def put(self, request, repo, path, share_type):
        """ Update user/group share permission.

        Permission checking:
        1. admin user.
        """

        # argument check
        permission = request.data.get('permission', None)
        if not permission or permission not in get_available_repo_perms():
            error_msg = 'permission invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        share_info = {}
        share_info['repo_id'] = repo.repo_id
        share_info['path'] = path
        share_info['share_type'] = share_type

        # current `request.user.username` is admin user,
        # so need to identify the repo owner specifically.
        repo_owner = seafile_api.get_repo_owner(repo.repo_id)
        username = request.user.username

        share_to = request.data.get('share_to', None)
        if share_type == 'user':
            email = share_to
            if not email or not is_valid_username(email):
                error_msg = 'email %s invalid.' % email
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            try:
                User.objects.get(email=email)
            except User.DoesNotExist:
                error_msg = 'User %s not found.' % email
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            if not has_shared_to_user(repo.repo_id, path, email):
                error_msg = 'Shared items not found'
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            try:
                update_user_dir_permission(repo.repo_id, path, repo_owner, email, permission)

                send_perm_audit_msg('modify-repo-perm', username, email,
                                    repo.repo_id, path, permission)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            share_info['user_email'] = email
            share_info['user_name'] = email2nickname(email)
            share_info['permission'] = PERMISSION_READ_WRITE if permission == PERMISSION_ADMIN else permission
            share_info['is_admin'] = permission == PERMISSION_ADMIN

        if share_type == 'group':
            group_id = share_to
            try:
                group_id = int(group_id)
            except ValueError:
                error_msg = 'group_id %s invalid.' % group_id
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            group = ccnet_api.get_group(group_id)
            if not group:
                error_msg = 'Group %s not found' % group_id
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            if not has_shared_to_group(repo.repo_id, path, group_id):
                error_msg = 'Shared items not found'
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            try:
                update_group_dir_permission(repo.repo_id, path, repo_owner, group_id, permission)
                send_perm_audit_msg('modify-repo-perm', username, group_id,
                                    repo.repo_id, path, permission)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            share_info['group_id'] = group_id
            share_info['group_name'] = group.group_name
            share_info['permission'] = PERMISSION_READ_WRITE if permission == PERMISSION_ADMIN else permission
            share_info['is_admin'] = permission == PERMISSION_ADMIN

        return Response(share_info)

    @check_parameter
    def delete(self, request, repo, path, share_type):
        """ Delete user/group share permission.

        Permission checking:
        1. admin user.
        """

        # current `request.user.username` is admin user,
        # so need to identify the repo owner specifically.
        repo_owner = seafile_api.get_repo_owner(repo.repo_id)
        username = request.user.username

        share_to = request.data.get('share_to', None)

        if share_type == 'user':
            email = share_to
            if not email or not is_valid_username(email):
                error_msg = 'email %s invalid.' % email
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if not has_shared_to_user(repo.repo_id, path, email):
                error_msg = 'Shared items not found'
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            try:
                permission = check_user_share_out_permission(repo.repo_id, path, email)

                if path == '/':
                    seafile_api.remove_share(repo.repo_id, repo_owner, email)
                else:
                    seafile_api.unshare_subdir_for_user(
                            repo.repo_id, path, repo_owner, email)

                if path == '/':
                    ExtraSharePermission.objects.delete_share_permission(repo.repo_id, 
                                                                         email)
                send_perm_audit_msg('delete-repo-perm', username, email,
                                    repo.repo_id, path, permission)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if share_type == 'group':
            group_id = share_to
            try:
                group_id = int(group_id)
            except ValueError:
                error_msg = 'group_id %s invalid' % group_id
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if not has_shared_to_group(repo.repo_id, path, group_id):
                error_msg = 'Shared items not found'
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            try:

                permission = check_group_share_out_permission(repo.repo_id, path, group_id)

                if path == '/':
                    seafile_api.unset_group_repo(repo.repo_id, group_id, repo_owner)
                else:
                    seafile_api.unshare_subdir_for_group(
                            repo.repo_id, path, repo_owner, group_id)

                if path == '/':
                    ExtraGroupsSharePermission.objects.delete_share_permission(repo.repo_id, 
                                                                               group_id)

                send_perm_audit_msg('delete-repo-perm', username, group_id,
                                    repo.repo_id, path, permission)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
