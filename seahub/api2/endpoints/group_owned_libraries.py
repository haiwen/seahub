# Copyright (c) 2012-2016 Seafile Ltd.
import os
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.utils.translation import gettext as _

from seaserv import seafile_api, ccnet_api

from constance import config

from seahub.api2.utils import api_error
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.permissions import IsProVersion
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.endpoints.utils import (
    api_check_group, is_org_user, add_org_context
)

from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email
from seahub.base.accounts import User
from seahub.organizations.models import OrgAdminSettings, DISABLE_ORG_ENCRYPTED_LIBRARY
from seahub.organizations.views import org_user_exists
from seahub.signals import repo_created
from seahub.group.utils import is_group_admin, is_group_member
from seahub.utils import is_valid_dirent_name, is_org_context, \
        is_pro_version, normalize_dir_path, is_valid_username, \
        send_perm_audit_msg, is_valid_org_id, transfer_repo
from seahub.utils.repo import (
    get_library_storages, get_repo_owner, get_available_repo_perms
)
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.utils.rpc import SeafileAPI
from seahub.share.signals import share_repo_to_user_successful, share_repo_to_group_successful
from seahub.share.utils import share_dir_to_user, share_dir_to_group, update_user_dir_permission, \
        check_user_share_out_permission, update_group_dir_permission, \
        check_group_share_out_permission, check_user_share_in_permission, \
        normalize_custom_permission_name
from seahub.share.models import FileShare, UploadLinkShare

from seahub.constants import PERMISSION_READ, PERMISSION_READ_WRITE, \
        PERMISSION_PREVIEW, PERMISSION_PREVIEW_EDIT
from seahub.views import check_folder_permission

from seahub.settings import ENABLE_STORAGE_CLASSES, STORAGE_CLASS_MAPPING_POLICY, \
        ENCRYPTED_LIBRARY_VERSION, ENCRYPTED_LIBRARY_PWD_HASH_ALGO, \
        ENCRYPTED_LIBRARY_PWD_HASH_PARAMS
from seahub.base.models import FileTransfer

logger = logging.getLogger(__name__)


def get_group_owned_repo_info(request, repo_id):

    repo = seafile_api.get_repo(repo_id)

    repo_info = {}
    repo_info['id'] = repo_id
    repo_info['name'] = repo.name

    repo_info['mtime'] = timestamp_to_isoformat_timestr(repo.last_modified)
    repo_info['size'] = repo.size
    repo_info['encrypted'] = repo.encrypted

    repo_owner = get_repo_owner(request, repo_id)
    repo_info['owner'] = repo_owner

    try:
        group_id = get_group_id_by_repo_owner(repo_owner)
        group = ccnet_api.get_group(int(group_id))
        repo_info['group_name'] = group.group_name
    except Exception as e:
        logger.error(e)
        repo_info['group_name'] = ''

    return repo_info


class GroupOwnedLibraries(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    @api_check_group
    @add_org_context
    def post(self, request, group_id, org_id):
        """ Add a group owned library.

        Permission checking:
        1. role permission, can_add_repo;
        1. is group admin;
        """

        # argument check
        repo_name = request.data.get("name", None)
        if not repo_name or \
                not is_valid_dirent_name(repo_name):
            error_msg = "name invalid."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        password = request.data.get("passwd", None)
        if password and not config.ENABLE_ENCRYPTED_LIBRARY:
            error_msg = 'NOT allow to create encrypted library.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if org_id and org_id > 0:
            disable_encrypted_library = OrgAdminSettings.objects.filter(org_id=org_id, key=DISABLE_ORG_ENCRYPTED_LIBRARY).first()
            if (disable_encrypted_library is not None) and int(disable_encrypted_library.value):
                return None, api_error(status.HTTP_403_FORBIDDEN,
                                       'NOT allow to create encrypted library.')

        permission = request.data.get('permission', PERMISSION_READ_WRITE)
        if permission not in [PERMISSION_READ, PERMISSION_READ_WRITE]:
            error_msg = 'permission invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # permission check
        if not request.user.permissions.can_add_repo():
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not is_group_admin(group_id, request.user.username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        group_quota = seafile_api.get_group_quota(group_id)
        group_quota = int(group_quota)
        if group_quota <= 0 and group_quota != -2:
            error_msg = 'No group quota.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # create group owned repo
        group_id = int(group_id)
        if is_pro_version() and ENABLE_STORAGE_CLASSES:

            if STORAGE_CLASS_MAPPING_POLICY in ('USER_SELECT', 'ROLE_BASED'):

                storages = get_library_storages(request)
                storage_id = request.data.get("storage_id", None)
                if storage_id and storage_id not in [s['storage_id'] for s in storages]:
                    error_msg = 'storage_id invalid.'
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

                repo_id = seafile_api.add_group_owned_repo(group_id,
                                                           repo_name,
                                                           permission,
                                                           password,
                                                           enc_version=ENCRYPTED_LIBRARY_VERSION,
                                                           pwd_hash_algo=ENCRYPTED_LIBRARY_PWD_HASH_ALGO or None,
                                                           pwd_hash_params=ENCRYPTED_LIBRARY_PWD_HASH_PARAMS or None,
                                                           storage_id=storage_id)
            else:
                # STORAGE_CLASS_MAPPING_POLICY == 'REPO_ID_MAPPING'
                repo_id = SeafileAPI.add_group_owned_repo(
                    group_id, repo_name, password, permission, org_id=org_id)
        else:
            repo_id = SeafileAPI.add_group_owned_repo(
                group_id, repo_name, password, permission, org_id=org_id)

        # for activities
        username = request.user.username
        library_template = request.data.get("library_template", '')
        repo_created.send(sender=None, org_id=org_id, creator=username,
                          repo_id=repo_id, repo_name=repo_name,
                          library_template=library_template)

        # for notification
        repo = seafile_api.get_repo(repo_id)
        share_repo_to_group_successful.send(sender=None, from_user=username,
                                            group_id=group_id, repo=repo,
                                            path='/', org_id=org_id)

        info = get_group_owned_repo_info(request, repo_id)
        # TODO
        info['permission'] = permission
        return Response(info)


class GroupOwnedLibrary(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    @api_check_group
    def put(self, request, group_id, repo_id):
        """ Rename a library.

        Permission checking:
        1. is group admin;
        """
        # argument check
        new_repo_name = request.data.get('name', '')
        if not new_repo_name:
            error_msg = 'name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not is_valid_dirent_name(new_repo_name):
            error_msg = 'name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        group_id = int(group_id)
        username = request.user.username
        if not is_group_admin(group_id, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # rename repo
        try:
            # desc is ''
            seafile_api.edit_repo(repo_id, new_repo_name, '', username)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        repo_info = get_group_owned_repo_info(request, repo_id)
        return Response(repo_info)

    @api_check_group
    @add_org_context
    def delete(self, request, group_id, repo_id, org_id):
        """ Delete a group owned library.

        Permission checking:
        1. is group admin;
        """

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        group_id = int(group_id)
        username = request.user.username
        if not is_group_admin(group_id, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            SeafileAPI.delete_group_owned_repo(group_id, repo_id, org_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


def get_group_id_by_repo_owner(repo_owner):

    return int(repo_owner.split('@')[0])


class GroupOwnedLibraryUserFolderPermission(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def _get_user_folder_perm_info(self, email, repo_id, path, perm):
        result = {}
        if email and repo_id and path and perm:
            result['repo_id'] = repo_id
            result['user_email'] = email
            result['user_name'] = email2nickname(email)
            result['folder_path'] = path
            result['folder_name'] = path if path == '/' else os.path.basename(path.rstrip('/'))
            result['permission'] = perm

        return result

    def get(self, request, repo_id):
        """ List repo user folder perms (by folder_path).

        Permission checking:
        1. is group admin
        """

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, repo_id)
        group_id = get_group_id_by_repo_owner(repo_owner)
        if not ccnet_api.get_group(group_id):
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not is_group_admin(group_id, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # get perm list
        results = []
        path = request.GET.get('folder_path', None)
        folder_perms = seafile_api.list_folder_user_perm_by_repo(repo_id)
        for perm in folder_perms:
            result = {}
            if path:
                if path == perm.path:
                    result = self._get_user_folder_perm_info(
                            perm.user, perm.repo_id, perm.path, perm.permission)
            else:
                result = self._get_user_folder_perm_info(
                        perm.user, perm.repo_id, perm.path, perm.permission)

            if result:
                results.append(result)

        return Response(results)

    def post(self, request, repo_id, format=None):
        """ Add repo user folder perm.

        Permission checking:
        1. is group admin
        """

        # argument check
        path = request.data.get('folder_path', None)
        if not path:
            error_msg = 'folder_path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        perm = request.data.get('permission', None)
        if not perm or perm not in get_available_repo_perms():
            perm = normalize_custom_permission_name(perm)
            if not perm:
                error_msg = 'permission invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = normalize_dir_path(path)
        if not seafile_api.get_dir_id_by_path(repo_id, path):
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, repo_id)
        group_id = get_group_id_by_repo_owner(repo_owner)
        if not ccnet_api.get_group(group_id):
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not is_group_admin(group_id, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # add repo user folder perm
        result = {}
        result['failed'] = []
        result['success'] = []

        users = request.data.getlist('user_email')
        for user in users:
            if not is_valid_username(user):
                result['failed'].append({
                    'user_email': user,
                    'error_msg': 'user_email invalid.'
                })
                continue

            try:
                User.objects.get(email=user)
            except User.DoesNotExist:
                result['failed'].append({
                    'user_email': user,
                    'error_msg': 'User %s not found.' % user
                })
                continue

            permission = seafile_api.get_folder_user_perm(repo_id, path, user)
            if permission:
                result['failed'].append({
                    'user_email': user,
                    'error_msg': _('Permission already exists.')
                })
                continue

            try:
                seafile_api.add_folder_user_perm(repo_id, path, perm, user)
                send_perm_audit_msg('add-repo-perm', username, user, repo_id, path, perm)
            except Exception as e:
                logger.error(e)
                result['failed'].append({
                    'user_email': user,
                    'error_msg': 'Internal Server Error'
                })

            new_perm = seafile_api.get_folder_user_perm(repo_id, path, user)
            new_perm_info = self._get_user_folder_perm_info(
                    user, repo_id, path, new_perm)
            result['success'].append(new_perm_info)

        return Response(result)

    def put(self, request, repo_id, format=None):
        """ Modify repo user folder perm.

        Permission checking:
        1. is group admin
        """
        # argument check
        user = request.data.get('user_email', None)
        if not user:
            error_msg = 'user_email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        path = request.data.get('folder_path', None)
        if not path:
            error_msg = 'folder_path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        perm = request.data.get('permission', None)
        if not perm or perm not in get_available_repo_perms():
            perm = normalize_custom_permission_name(perm)
            if not perm:
                error_msg = 'permission invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = normalize_dir_path(path)
        if not seafile_api.get_dir_id_by_path(repo_id, path):
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, repo_id)
        group_id = get_group_id_by_repo_owner(repo_owner)
        if not ccnet_api.get_group(group_id):
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            User.objects.get(email=user)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % user
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = seafile_api.get_folder_user_perm(repo_id, path, user)
        if not permission:
            error_msg = 'Folder permission not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not is_group_admin(group_id, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # modify permission
        try:
            seafile_api.set_folder_user_perm(repo_id, path, perm, user)
            send_perm_audit_msg('modify-repo-perm', username, user, repo_id, path, perm)
            new_perm = seafile_api.get_folder_user_perm(repo_id, path, user)
            result = self._get_user_folder_perm_info(user, repo_id, path, new_perm)
            return Response(result)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

    def delete(self, request, repo_id):
        """ Delete repo user folder perm.

        Permission checking:
        1. is group admin
        """

        # argument check
        user = request.data.get('user_email', None)
        if not user:
            error_msg = 'user_email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        path = request.data.get('folder_path', None)
        if not path:
            error_msg = 'folder_path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, repo_id)
        group_id = get_group_id_by_repo_owner(repo_owner)
        if not ccnet_api.get_group(group_id):
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not is_group_admin(group_id, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # delete permission
        path = normalize_dir_path(path)
        permission = seafile_api.get_folder_user_perm(repo_id, path, user)
        if not permission:
            return Response({'success': True})

        try:
            seafile_api.rm_folder_user_perm(repo_id, path, user)
            send_perm_audit_msg('delete-repo-perm', username,
                                user, repo_id, path, permission)
            return Response({'success': True})
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)


class GroupOwnedLibraryGroupFolderPermission(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    def _get_group_folder_perm_info(self, group_id, repo_id, path, perm):
        result = {}
        if group_id and repo_id and path and perm:
            group = ccnet_api.get_group(group_id)
            result['repo_id'] = repo_id
            result['group_id'] = group_id
            result['group_name'] = group.group_name
            result['folder_path'] = path
            result['folder_name'] = path if path == '/' else os.path.basename(path.rstrip('/'))
            result['permission'] = perm

        return result

    def get(self, request, repo_id, format=None):
        """ List repo group folder perms (by folder_path).

        Permission checking:
        1. is group admin
        """

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, repo_id)
        group_id = get_group_id_by_repo_owner(repo_owner)
        if not ccnet_api.get_group(group_id):
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not is_group_admin(group_id, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        results = []
        path = request.GET.get('folder_path', None)
        group_folder_perms = seafile_api.list_folder_group_perm_by_repo(repo_id)
        for perm in group_folder_perms:
            result = {}
            if path:
                if path == perm.path:
                    result = self._get_group_folder_perm_info(
                            perm.group_id, perm.repo_id, perm.path,
                            perm.permission)
            else:
                result = self._get_group_folder_perm_info(
                        perm.group_id, perm.repo_id, perm.path,
                        perm.permission)

            if result:
                results.append(result)

        return Response(results)

    def post(self, request, repo_id, format=None):
        """ Add repo group folder perm.

        Permission checking:
        1. is group admin
        """

        # argument check
        path = request.data.get('folder_path', None)
        if not path:
            error_msg = 'folder_path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        perm = request.data.get('permission', None)
        if not perm or perm not in get_available_repo_perms():
            perm = normalize_custom_permission_name(perm)
            if not perm:
                error_msg = 'permission invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = normalize_dir_path(path)
        if not seafile_api.get_dir_id_by_path(repo_id, path):
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, repo_id)
        group_id = get_group_id_by_repo_owner(repo_owner)
        if not ccnet_api.get_group(group_id):
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not is_group_admin(group_id, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        result = {}
        result['failed'] = []
        result['success'] = []

        group_ids = request.data.getlist('group_id')
        for group_id in group_ids:
            try:
                group_id = int(group_id)
            except ValueError:
                result['failed'].append({
                    'group_id': group_id,
                    'error_msg': 'group_id invalid.'
                })
                continue

            if not ccnet_api.get_group(group_id):
                result['failed'].append({
                    'group_id': group_id,
                    'error_msg': 'Group %s not found.' % group_id
                })
                continue

            permission = seafile_api.get_folder_group_perm(repo_id, path, group_id)
            if permission:
                result['failed'].append({
                    'group_id': group_id,
                    'error_msg': _('Permission already exists.')
                })
                continue

            try:
                seafile_api.add_folder_group_perm(repo_id, path, perm, group_id)
                send_perm_audit_msg('add-repo-perm', username, group_id, repo_id, path, perm)
            except Exception as e:
                logger.error(e)
                result['failed'].append({
                    'group_id': group_id,
                    'error_msg': 'Internal Server Error'
                })

            new_perm = seafile_api.get_folder_group_perm(repo_id, path, group_id)
            new_perm_info = self._get_group_folder_perm_info(
                    group_id, repo_id, path, new_perm)
            result['success'].append(new_perm_info)

        return Response(result)

    def put(self, request, repo_id, format=None):
        """ Modify repo group folder perm.

        Permission checking:
        1. is group admin
        """

        # argument check
        path = request.data.get('folder_path', None)
        if not path:
            error_msg = 'folder_path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        perm = request.data.get('permission', None)
        if not perm or perm not in get_available_repo_perms():
            perm = normalize_custom_permission_name(perm)
            if not perm:
                error_msg = 'permission invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        group_id = request.data.get('group_id')
        if not group_id:
            error_msg = 'group_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            group_id = int(group_id)
        except ValueError:
            error_msg = 'group_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = normalize_dir_path(path)
        if not seafile_api.get_dir_id_by_path(repo_id, path):
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not ccnet_api.get_group(group_id):
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, repo_id)
        library_group_id = get_group_id_by_repo_owner(repo_owner)
        if not ccnet_api.get_group(library_group_id):
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = seafile_api.get_folder_group_perm(repo_id, path, group_id)
        if not permission:
            error_msg = 'Folder permission not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not is_group_admin(library_group_id, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # modify permission
        try:
            seafile_api.set_folder_group_perm(repo_id, path, perm, group_id)
            send_perm_audit_msg('modify-repo-perm', username, group_id, repo_id, path, perm)
            new_perm = seafile_api.get_folder_group_perm(repo_id, path, group_id)
            result = self._get_group_folder_perm_info(group_id, repo_id, path, new_perm)
            return Response(result)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

    def delete(self, request, repo_id, format=None):
        """ Delete repo group folder perm.

        Permission checking:
        1. is group admin
        """

        # arguments check
        group_id = request.data.get('group_id', None)
        path = request.data.get('folder_path', None)

        if not group_id:
            error_msg = 'group_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not path:
            error_msg = 'folder_path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            group_id = int(group_id)
        except ValueError:
            error_msg = 'group_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        if not ccnet_api.get_group(group_id):
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, repo_id)
        library_group_id = get_group_id_by_repo_owner(repo_owner)
        if not ccnet_api.get_group(library_group_id):
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not is_group_admin(library_group_id, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # delete permission
        path = path.rstrip('/') if path != '/' else path
        permission = seafile_api.get_folder_group_perm(repo_id, path, group_id)
        if not permission:
            return Response({'success': True})

        try:
            seafile_api.rm_folder_group_perm(repo_id, path, group_id)
            send_perm_audit_msg('delete-repo-perm', username, group_id,
                                repo_id, path, permission)
            return Response({'success': True})
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)


class GroupOwnedLibraryUserShare(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    @add_org_context
    def list_user_shared_items(self, request, repo_id, path, org_id):
        repo_owner = get_repo_owner(request, repo_id)
        share_items = SeafileAPI.get_shared_users_by_repo_path(
            repo_id, repo_owner, path=path, org_id=org_id)

        ret = []
        for item in share_items:
            email = item.user
            ret.append({
                "user_email": email,
                "user_name": email2nickname(email),
                "user_contact_email": email2contact_email(email),
                "permission": item.perm
            })
        return ret

    def has_shared_to_user(self, request, repo_id, path, username):
        items = self.list_user_shared_items(request, repo_id, path)

        has_shared = False
        for item in items:
            if username == item['user_email']:
                has_shared = True
                break

        return has_shared

    def get(self, request, repo_id):
        """ List repo user share info.

        Permission checking:
        1. is group admin
        """

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, repo_id)
        group_id = get_group_id_by_repo_owner(repo_owner)
        if not ccnet_api.get_group(group_id):
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = request.GET.get('path', '/')
        if not seafile_api.get_dir_id_by_path(repo_id, path):
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not is_group_admin(group_id, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        result = self.list_user_shared_items(request, repo_id, path)
        return Response(result)

    @add_org_context
    def post(self, request, repo_id, org_id):
        """ Share repo to users.

        Permission checking:
        1. is group admin
        """

        # parameter check
        permission = request.data.get('permission', PERMISSION_READ)
        if permission not in [PERMISSION_READ, PERMISSION_READ_WRITE,
                              PERMISSION_PREVIEW, PERMISSION_PREVIEW_EDIT]:
            permission = normalize_custom_permission_name(permission)
            if not permission:
                error_msg = 'permission invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, repo_id)
        group_id = get_group_id_by_repo_owner(repo_owner)
        if not ccnet_api.get_group(group_id):
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = request.data.get('path', '/')
        if not seafile_api.get_dir_id_by_path(repo_id, path):
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not is_group_admin(group_id, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # share repo to user
        result = {}
        result['failed'] = []
        result['success'] = []

        share_to_users = request.data.getlist('username')
        for to_user in share_to_users:
            to_user = to_user.strip()
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
                    'error_msg': _('This item has been shared to %s.') % to_user
                    })
                continue

            if is_valid_org_id(org_id):
                if not is_org_user(to_user, org_id):
                    org_name = request.user.org.org_name
                    error_msg = 'User %s is not member of organization %s.' \
                                % (to_user, org_name)

                    result['failed'].append({
                        'email': to_user,
                        'error_msg': error_msg
                    })
                    continue
            else:
                if is_org_user(to_user):
                    error_msg = 'User %s is a member of organization.' % to_user
                    result['failed'].append({
                        'email': to_user,
                        'error_msg': error_msg
                    })
                    continue

            share_dir_to_user(repo, path, repo_owner, username, to_user, permission, org_id)

            result['success'].append({
                "user_email": to_user,
                "user_name": email2nickname(to_user),
                "user_contact_email": email2contact_email(to_user),
                "permission": permission,
            })

            # send a signal when sharing repo successful
            share_repo_to_user_successful.send(sender=None,
                                               from_user=username, to_user=to_user,
                                               repo=repo, path=path, org_id=org_id)

            send_perm_audit_msg('add-repo-perm',
                                username, to_user,
                                repo_id, path, permission)

        return Response(result)

    @add_org_context
    def put(self, request, repo_id, org_id):
        """ Update repo user share permission.

        Permission checking:
        1. is group admin
        """

        # parameter check
        to_user = request.data.get('username', None)
        if not to_user:
            error_msg = 'username invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not is_valid_username(to_user):
            error_msg = 'username invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        permission = request.data.get('permission', PERMISSION_READ)
        if permission not in [PERMISSION_READ, PERMISSION_READ_WRITE,
                              PERMISSION_PREVIEW, PERMISSION_PREVIEW_EDIT]:
            permission = normalize_custom_permission_name(permission)
            if not permission:
                error_msg = 'permission invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, repo_id)
        group_id = get_group_id_by_repo_owner(repo_owner)
        if not ccnet_api.get_group(group_id):
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = request.data.get('path', '/')
        if not seafile_api.get_dir_id_by_path(repo_id, path):
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            User.objects.get(email=to_user)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % to_user
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not is_group_admin(group_id, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        update_user_dir_permission(repo_id, path, repo_owner, to_user, permission, org_id)

        send_perm_audit_msg('modify-repo-perm', username, to_user, repo_id, path, permission)
        return Response({'success': True})

    @add_org_context
    def delete(self, request, repo_id, org_id, format=None):
        """ Delete repo user share permission.

        Permission checking:
        1. is group admin
        """

        # parameter check
        to_user = request.data.get('username', None)
        if not to_user:
            error_msg = 'username invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # permission check
        repo_owner = get_repo_owner(request, repo_id)
        group_id = get_group_id_by_repo_owner(repo_owner)
        username = request.user.username
        if not is_group_admin(group_id, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        path = request.data.get('path', '/')
        SeafileAPI.delete_shared_user_by_repo_path(
            repo_id, repo_owner, to_user, path, org_id=org_id)

        permission = check_user_share_out_permission(repo_id, path, to_user, is_org_context(request))
        send_perm_audit_msg('delete-repo-perm', username, to_user,
                            repo_id, path, permission)

        return Response({'success': True})


class GroupOwnedLibraryGroupShare(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    @add_org_context
    def list_group_shared_items(self, request, repo_id, path, org_id):
        repo_owner = get_repo_owner(request, repo_id)
        share_items = SeafileAPI.get_shared_groups_by_repo_path(
            repo_id, repo_owner, path, org_id)

        ret = []
        for item in share_items:

            group_id = item.group_id
            group = ccnet_api.get_group(group_id)

            if not group:
                SeafileAPI.delete_shared_group_by_repo_path(
                    repo_id, repo_owner, group_id, path, org_id)
                continue

            ret.append({
                "group_id": group_id,
                "group_name": group.group_name,
                "permission": item.perm,
            })
        return ret

    def has_shared_to_group(self, request, repo_id, path, group_id):
        items = self.list_group_shared_items(request, repo_id, path)

        has_shared = False
        for item in items:
            if group_id == item['group_id']:
                has_shared = True
                break

        return has_shared

    def get(self, request, repo_id, format=None):
        """ List repo group share info.

        Permission checking:
        1. is group admin
        """

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, repo_id)
        group_id = get_group_id_by_repo_owner(repo_owner)
        if not ccnet_api.get_group(group_id):
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = request.GET.get('path', '/')
        if not seafile_api.get_dir_id_by_path(repo_id, path):
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not is_group_admin(group_id, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        result = self.list_group_shared_items(request, repo_id, path)
        return Response([item for item in result if item['group_id'] != group_id])

    @add_org_context
    def post(self, request, repo_id, org_id, format=None):
        """ Share repo to group.

        Permission checking:
        1. is group admin
        """

        # parameter check
        permission = request.data.get('permission', PERMISSION_READ)
        if permission not in [PERMISSION_READ, PERMISSION_READ_WRITE,
                              PERMISSION_PREVIEW, PERMISSION_PREVIEW_EDIT]:
            permission = normalize_custom_permission_name(permission)
            if not permission:
                error_msg = 'permission invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, repo_id)
        group_id = get_group_id_by_repo_owner(repo_owner)
        if not ccnet_api.get_group(group_id):
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = request.data.get('path', '/')
        if not seafile_api.get_dir_id_by_path(repo_id, path):
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not is_group_admin(group_id, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        result = {}
        result['failed'] = []
        result['success'] = []

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

            if self.has_shared_to_group(request, repo_id, path, gid):
                result['failed'].append({
                    'group_name': group.group_name,
                    'error_msg': _('This item has been shared to %s.') % group.group_name
                    })
                continue

            share_dir_to_group(repo, path, repo_owner, username, gid, permission, org_id)
            result['success'].append({
                "group_id": gid,
                "group_name": group.group_name,
                "permission": permission,
            })

            share_repo_to_group_successful.send(sender=None,
                                                from_user=username,
                                                group_id=gid,
                                                repo=repo,
                                                path=path,
                                                org_id=org_id)

            send_perm_audit_msg('add-repo-perm', username, gid,
                                repo_id, path, permission)

        return Response(result)

    @add_org_context
    def put(self, request, repo_id, org_id, format=None):
        """ Update repo group share permission.

        Permission checking:
        1. is group admin
        """

        # parameter check
        to_group_id = request.data.get('group_id', None)
        if not to_group_id:
            error_msg = 'group_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            to_group_id = int(to_group_id)
        except ValueError:
            error_msg = 'group_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        permission = request.data.get('permission', PERMISSION_READ)
        if permission not in [PERMISSION_READ, PERMISSION_READ_WRITE,
                              PERMISSION_PREVIEW, PERMISSION_PREVIEW_EDIT]:
            permission = normalize_custom_permission_name(permission)
            if not permission:
                error_msg = 'permission invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_owner = get_repo_owner(request, repo_id)
        group_id = get_group_id_by_repo_owner(repo_owner)
        if not ccnet_api.get_group(group_id):
            error_msg = 'Group %s not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not ccnet_api.get_group(to_group_id):
            error_msg = 'Group %s not found.' % to_group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        path = request.data.get('path', '/')
        if not seafile_api.get_dir_id_by_path(repo_id, path):
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not is_group_admin(group_id, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        update_group_dir_permission(
            repo_id, path, repo_owner, to_group_id, permission, org_id)

        send_perm_audit_msg('modify-repo-perm',
                            username, to_group_id,
                            repo_id, path, permission)

        return Response({'success': True})

    @add_org_context
    def delete(self, request, repo_id, org_id, format=None):
        """ Delete repo group share permission.

        Permission checking:
        1. is group admin
        """

        # parameter check
        to_group_id = request.data.get('group_id', None)
        if not to_group_id:
            error_msg = 'group_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            to_group_id = int(to_group_id)
        except ValueError:
            error_msg = 'group_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # permission check
        username = request.user.username
        repo_owner = get_repo_owner(request, repo_id)
        group_id = get_group_id_by_repo_owner(repo_owner)
        if not is_group_admin(group_id, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if '@seafile_group' in repo_owner and \
                repo_owner.split('@')[0] == str(to_group_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        path = request.data.get('path', '/')

        SeafileAPI.delete_shared_group_by_repo_path(
            repo_id, repo_owner, to_group_id, path, org_id)

        permission = check_group_share_out_permission(
            repo_id, path, group_id, is_org_context(request))
        send_perm_audit_msg('delete-repo-perm', username, group_id,
                            repo_id, path, permission)

        return Response({'success': True})


class GroupOwnedLibraryUserShareInLibrary(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    @add_org_context
    def delete(self, request, repo_id, org_id, format=None):
        """ User delete a repo shared to him/her.
        """
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not check_folder_permission(request, repo_id, '/'):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.user.username
        repo_owner = get_repo_owner(request, repo_id)
        try:
            if org_id:
                is_org = True
                seafile_api.org_remove_share(org_id, repo_id, repo_owner, username)
            else:
                is_org = False
                seafile_api.remove_share(repo_id, repo_owner, username)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        permission = check_user_share_in_permission(repo_id, username, is_org)
        send_perm_audit_msg('delete-repo-perm', repo_owner, username,
                            repo_id, '/', permission)

        return Response({'success': True})


class GroupOwnedLibraryTransferView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    @api_check_group
    @add_org_context
    def put(self, request, group_id, repo_id, org_id):
        """ Transfer a library.

        Permission checking:
        1. is group admin;
        """
        # argument check
        new_owner = request.data.get('email', None)
        is_share = request.data.get('reshare', False)
        if not new_owner:
            error_msg = 'Email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if '@seafile_group' not in new_owner:
            error_msg = 'Email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        new_group_id = int(new_owner.split('@')[0])
        if new_group_id == int(group_id):
            error_msg = 'Cannot transfer to its owner'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        try:
            new_group = ccnet_api.get_group(new_group_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not new_group:
            error_msg = 'Group %d not found.' % group_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        if new_group.creator_name != 'system admin':
            error_msg = 'Group %d invalid' % group_id
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        username = request.user.username
        if not is_group_member(new_group_id, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
            
        if org_id:
            org_id = int(org_id)
            if not ccnet_api.get_org_by_id(org_id):
                error_msg = 'Organization %s not found.' % org_id
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if org_id:
            repo_owner = seafile_api.get_org_repo_owner(repo_id)
        else:
            repo_owner = seafile_api.get_repo_owner(repo_id)
        cur_group_id = int(group_id)
        
        if not is_group_admin(cur_group_id, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)        

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        # preparation before transfer repo
        pub_repos = []
        if org_id:
            # get all org pub repos
            pub_repos = seafile_api.list_org_inner_pub_repos_by_owner(
                    org_id, repo_owner)
        else:
            # get all pub repos
            if not request.cloud_mode:
                pub_repos = seafile_api.list_inner_pub_repos_by_owner(repo_owner)
        # transfer repo
        try:
            transfer_repo(repo_id, new_owner, is_share, org_id)
            org_id = seafile_api.get_org_id_by_repo_id(repo_id)
            FileTransfer.objects.create(from_user=repo_owner,
                                        to=new_owner,
                                        repo_id=repo_id,
                                        org_id=org_id,
                                        operator=request.user.username)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # reshare repo to links
        try:
            UploadLinkShare.objects.filter(username=repo_owner, repo_id=repo_id).update(username=new_owner)
            FileShare.objects.filter(username=repo_owner, repo_id=repo_id).update(username=new_owner)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # check if current repo is pub-repo
        # if YES, reshare current repo to public
        for pub_repo in pub_repos:
            if repo_id != pub_repo.id:
                continue

            if org_id:
                seafile_api.set_org_inner_pub_repo(org_id, repo_id,
                        pub_repo.permission)
            else:
                seafile_api.add_inner_pub_repo(
                        repo_id, pub_repo.permission)

            break

        return Response({'success': True})
    