# -*- coding: utf-8 -*-

import os
import logging
import time
import jwt

from rest_framework.views import APIView
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.response import Response
from django.utils.translation import ugettext as _

from pysearpc import SearpcError
from seaserv import seafile_api, ccnet_api

from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.dtable.models import Workspaces, DTables, DTableApiToken
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.group.utils import group_id_to_name
from seahub.utils import is_valid_dirent_name, is_org_context, normalize_file_path, \
    check_filename_with_rename, gen_file_upload_url
from seahub.settings import MAX_UPLOAD_FILE_NAME_LEN, DTABLE_PRIVATE_KEY
from seahub.dtable.utils import check_dtable_permission, \
    check_dtable_admin_permission
from seahub.constants import PERMISSION_ADMIN, PERMISSION_READ_WRITE, PERMISSION_READ, \
    PERMISSION_PREVIEW, PERMISSION_PREVIEW_EDIT
from seahub.base.accounts import User

logger = logging.getLogger(__name__)
permission_tuple = (PERMISSION_ADMIN, PERMISSION_PREVIEW, PERMISSION_PREVIEW_EDIT,
                    PERMISSION_READ, PERMISSION_READ_WRITE)

FILE_TYPE = '.dtable'
WRITE_PERMISSION_TUPLE = (PERMISSION_READ_WRITE, PERMISSION_ADMIN)


class WorkspacesView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """get all workspaces
        """
        username = request.user.username

        org_id = -1
        if is_org_context(request):
            org_id = request.user.org.org_id

        if org_id and org_id > 0:
            groups = ccnet_api.get_org_groups_by_user(org_id, username)
        else:
            groups = ccnet_api.get_groups(username, return_ancestors=True)

        owner_list = list()
        owner_list.append(username)
        for group in groups:
            group_user = '%s@seafile_group' % group.id
            owner_list.append(group_user)

        workspace_list = list()
        for owner in owner_list:
            try:
                workspace = Workspaces.objects.get_workspace_by_owner(owner)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error.'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            if not workspace:
                if '@seafile_group' in owner:
                    continue

                # permission check
                if not request.user.permissions.can_add_repo():
                    error_msg = 'Permission denied.'
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)

                try:
                    if org_id and org_id > 0:
                        repo_id = seafile_api.create_org_repo(
                            _("My Workspace"),
                            _("My Workspace"),
                            "dtable@seafile",
                            org_id
                        )
                    else:
                        repo_id = seafile_api.create_repo(
                            _("My Workspace"),
                            _("My Workspace"),
                            "dtable@seafile"
                        )
                except Exception as e:
                    logger.error(e)
                    error_msg = 'Internal Server Error.'
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

                workspace = Workspaces.objects.create_workspace(owner, repo_id)

            # resource check
            repo_id = workspace.repo_id
            repo = seafile_api.get_repo(repo_id)
            if not repo:
                logger.warning('Library %s not found.' % repo_id)
                continue

            res = workspace.to_dict()

            table_list = DTables.objects.get_dtable_by_workspace(workspace)
            res["table_list"] = table_list

            if '@seafile_group' in owner:
                group_id = owner.split('@')[0]
                res["owner_name"] = group_id_to_name(group_id)
                res["owner_type"] = "Group"
            else:
                res["owner_name"] = email2nickname(owner)
                res["owner_type"] = "Personal"

            workspace_list.append(res)

        return Response({"workspace_list": workspace_list}, status=status.HTTP_200_OK)


class DTablesView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        """create a table file

        Permission:
        1. owner
        2. group member
        """
        # argument check
        table_owner = request.POST.get('owner')
        if not table_owner:
            error_msg = 'owner invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        table_name = request.POST.get('name')
        if not table_name:
            error_msg = 'name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        table_file_name = table_name + FILE_TYPE
        if not is_valid_dirent_name(table_file_name):
            error_msg = 'name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        workspace = Workspaces.objects.get_workspace_by_owner(table_owner)
        if not workspace:
            if not request.user.permissions.can_add_repo():
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            org_id = -1
            if is_org_context(request):
                org_id = request.user.org.org_id

            try:
                if org_id and org_id > 0:
                    repo_id = seafile_api.create_org_repo(
                        _("My Workspace"),
                        _("My Workspace"),
                        "dtable@seafile",
                        org_id
                    )
                else:
                    repo_id = seafile_api.create_repo(
                        _("My Workspace"),
                        _("My Workspace"),
                        "dtable@seafile"
                    )
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error.'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            try:
                workspace = Workspaces.objects.create_workspace(table_owner, repo_id)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error.'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        repo_id = workspace.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not check_dtable_permission(username, workspace):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # repo status check
        repo_status = repo.status
        if repo_status != 0:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # create new empty table
        table_file_name = check_filename_with_rename(repo_id, '/', table_file_name)

        try:
            seafile_api.post_empty_file(repo_id, '/', table_file_name, username)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        try:
            dtable = DTables.objects.create_dtable(username, workspace, table_name)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({"table": dtable.to_dict()}, status=status.HTTP_201_CREATED)


class DTableView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def put(self, request, workspace_id):
        """rename a table

        Permission:
        1. owner
        2. group member
        """
        # argument check
        old_table_name = request.data.get('old_name')
        if not old_table_name:
            error_msg = 'old_name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        new_table_name = request.data.get('new_name')
        if not new_table_name:
            error_msg = 'new_name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        new_table_file_name = new_table_name + FILE_TYPE
        if not is_valid_dirent_name(new_table_file_name):
            error_msg = 'new_name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if len(new_table_file_name) > MAX_UPLOAD_FILE_NAME_LEN:
            error_msg = 'new_name is too long.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        workspace = Workspaces.objects.get_workspace_by_id(workspace_id)
        if not workspace:
            error_msg = 'Workspace %s not found.' % workspace_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_id = workspace.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        dtable = DTables.objects.get_dtable(workspace, old_table_name)
        if not dtable:
            error_msg = 'dtable %s not found.' % old_table_name
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        old_table_file_name = old_table_name + FILE_TYPE
        old_table_path = normalize_file_path(old_table_file_name)
        table_file_id = seafile_api.get_file_id_by_path(repo_id, old_table_path)
        if not table_file_id:
            error_msg = 'file %s not found.' % old_table_file_name
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not check_dtable_permission(username, workspace):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # repo status check
        repo_status = repo.status
        if repo_status != 0:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # rename table
        new_table_file_name = check_filename_with_rename(repo_id, '/', new_table_file_name)
        try:
            seafile_api.rename_file(repo_id, '/', old_table_file_name, new_table_file_name, username)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        try:
            dtable.name = new_table_name
            dtable.modifier = username
            dtable.save()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({"table": dtable.to_dict()}, status=status.HTTP_200_OK)

    def delete(self, request, workspace_id):
        """delete a table

        Permission:
        1. owner
        2. group member
        """
        # argument check
        table_name = request.data.get('name')
        if not table_name:
            error_msg = 'name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        table_file_name = table_name + FILE_TYPE

        # resource check
        workspace = Workspaces.objects.get_workspace_by_id(workspace_id)
        if not workspace:
            error_msg = 'Workspace %s not found.' % workspace_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_id = workspace.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        dtable = DTables.objects.get_dtable(workspace, table_name)
        if not dtable:
            error_msg = 'dtable %s not found.' % table_name
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        table_path = normalize_file_path(table_file_name)
        table_file_id = seafile_api.get_file_id_by_path(repo_id, table_path)
        if not table_file_id:
            error_msg = 'file %s not found.' % table_file_name
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not check_dtable_permission(username, workspace):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # repo status check
        repo_status = repo.status
        if repo_status != 0:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # delete asset
        asset_dir_path = '/asset/' + str(dtable.uuid)
        asset_dir_id = seafile_api.get_dir_id_by_path(repo_id, asset_dir_path)
        if asset_dir_id:
            parent_dir = os.path.dirname(asset_dir_path)
            file_name = os.path.basename(asset_dir_path)
            try:
                seafile_api.del_file(repo_id, parent_dir, file_name, username)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # delete table
        try:
            seafile_api.del_file(repo_id, '/', table_file_name, username)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        try:
            DTables.objects.delete_dtable(workspace, table_name)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True}, status=status.HTTP_200_OK)


class DTableAssetUploadLinkView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, workspace_id):
        """get table file upload link

        Permission:
        1. owner
        2. group member
        3. shared user with `rw` or `admin` permission
        """
        # argument check
        table_name = request.GET.get('name', None)
        if not table_name:
            error_msg = 'name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        workspace = Workspaces.objects.get_workspace_by_id(workspace_id)
        if not workspace:
            error_msg = 'Workspace %s not found.' % workspace_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_id = workspace.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        dtable = DTables.objects.get_dtable(workspace, table_name)
        if not dtable:
            error_msg = 'dtable %s not found.' % table_name
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if check_dtable_permission(username, workspace, dtable) not in WRITE_PERMISSION_TUPLE:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            token = seafile_api.get_fileserver_access_token(repo_id, 'dummy', 'upload',
                                                            '', use_onetime=False)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        upload_link = gen_file_upload_url(token, 'upload-api')

        # create asset dir
        asset_dir_path = '/asset/' + str(dtable.uuid)
        asset_dir_id = seafile_api.get_dir_id_by_path(repo_id, asset_dir_path)
        if not asset_dir_id:
            seafile_api.mkdir_with_parents(repo_id, '/', asset_dir_path[1:], username)

        dtable.modifier = username
        dtable.save()

        res = dict()
        res['upload_link'] = upload_link
        res['parent_path'] = asset_dir_path
        return Response(res)


class DTableAccessTokenView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, workspace_id, name):
        """get dtable access token
        """

        table_name = name
        table_file_name = table_name + FILE_TYPE

        # resource check
        workspace = Workspaces.objects.get_workspace_by_id(workspace_id)
        if not workspace:
            error_msg = 'Workspace %s not found.' % workspace_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_id = workspace.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        dtable = DTables.objects.get_dtable(workspace, table_name)
        if not dtable:
            error_msg = 'dtable %s not found.' % table_name
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        table_path = normalize_file_path(table_file_name)
        table_file_id = seafile_api.get_file_id_by_path(repo_id, table_path)
        if not table_file_id:
            error_msg = 'file %s not found.' % table_file_name
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not check_dtable_permission(username, workspace, dtable):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # generate json web token
        payload = {
            'exp': int(time.time()) + 86400 * 3,
            'dtable_uuid': dtable.uuid.hex,
            'username': username,
        }

        try:
            access_token = jwt.encode(
                payload, DTABLE_PRIVATE_KEY, algorithm='HS256'
            )
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'access_token': access_token})


class DTableApiTokenView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def _resource_check(self, workspace_id, table_name, table_file_name):
        workspace = Workspaces.objects.get_workspace_by_id(workspace_id)
        if not workspace:
            error_msg = 'Workspace %s not found.' % workspace_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg), None, None

        repo_id = workspace.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg), None, None

        dtable = DTables.objects.get_dtable(workspace, table_name)
        if not dtable:
            error_msg = 'dtable %s not found.' % table_name
            return api_error(status.HTTP_404_NOT_FOUND, error_msg), None, None

        table_path = normalize_file_path(table_file_name)
        table_file_id = seafile_api.get_file_id_by_path(repo_id, table_path)
        if not table_file_id:
            error_msg = 'file %s not found.' % table_file_name
            return api_error(status.HTTP_404_NOT_FOUND, error_msg), None, None

        return None, workspace, dtable

    def _permission_check(self, username, owner):
        # only owner or group admin
        if not check_dtable_admin_permission(username, owner):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        return None

    def get(self, request, workspace_id, name):
        """list dtable api token for thirdpart app
        """
        table_name = name
        table_file_name = table_name + FILE_TYPE
        username = request.user.username

        # resource check
        error, workspace, dtable = self._resource_check(workspace_id, table_name, table_file_name)
        if error:
            return error

        # permission check
        owner = workspace.owner
        error = self._permission_check(username, owner)
        if error:
            return error

        # main
        api_tokens = list()
        api_token_queryset = DTableApiToken.objects.list_by_dtable(dtable)
        for api_token_obj in api_token_queryset:
            data = {
                'app_name': api_token_obj.app_name,
                'api_token': api_token_obj.token,
                'generated_by': api_token_obj.generated_by,
                'generated_at': datetime_to_isoformat_timestr(api_token_obj.generated_at),
                'last_access': datetime_to_isoformat_timestr(api_token_obj.last_access),
                'permission': api_token_obj.permission,
            }
            api_tokens.append(data)

        return Response({'api_tokens': api_tokens})

    def post(self, request, workspace_id, name):
        """generate dtable api token for thirdpart app
        """
        table_name = name
        table_file_name = table_name + FILE_TYPE
        username = request.user.username

        app_name = request.data.get('app_name')
        if not app_name:
            return api_error(status.HTTP_400_BAD_REQUEST, 'app_name invalid.')

        # argument check
        permission = request.data.get('permission')
        if not permission or permission not in permission_tuple:
            error_msg = 'permission invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        error, workspace, dtable = self._resource_check(workspace_id, table_name, table_file_name)
        if error:
            return error

        # permission check
        owner = workspace.owner
        error = self._permission_check(username, owner)
        if error:
            return error

        # main
        exist_obj = DTableApiToken.objects.get_by_dtable_and_app_name(dtable, app_name)
        if exist_obj is not None:
            return api_error(status.HTTP_400_BAD_REQUEST, 'api token already exist.')

        api_token_obj = DTableApiToken.objects.add(dtable, app_name, username, permission)

        return Response({'api_token': api_token_obj.token}, status=status.HTTP_201_CREATED)

    def delete(self, request, workspace_id, name):
        """delete dtable api token
        """
        table_name = name
        table_file_name = table_name + FILE_TYPE
        username = request.user.username

        app_name = request.data.get('app_name')
        if not app_name:
            return api_error(status.HTTP_400_BAD_REQUEST, 'app_name invalid.')

        # resource check
        error, workspace, dtable = self._resource_check(workspace_id, table_name, table_file_name)
        if error:
            return error

        # permission check
        owner = workspace.owner
        error = self._permission_check(username, owner)
        if error:
            return error

        # main
        api_token_obj = DTableApiToken.objects.get_by_dtable_and_app_name(dtable, app_name)
        if api_token_obj is None:
            return api_error(status.HTTP_404_NOT_FOUND, 'api_token not found.')

        api_token_obj.delete()
        return Response({'success': True})


class DTableApiTokenToAccessTokenView(APIView):
    throttle_classes = (UserRateThrottle,)

    def get(self, request, workspace_id, name):
        """dtable api token to get access token
        """
        table_name = name
        table_file_name = table_name + FILE_TYPE

        token = request.GET.get('api_token')
        if not token:
            return api_error(status.HTTP_400_BAD_REQUEST, 'api_token invalid.')

        # resource check
        workspace = Workspaces.objects.get_workspace_by_id(workspace_id)
        if not workspace:
            error_msg = 'Workspace %s not found.' % workspace_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_id = workspace.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        dtable = DTables.objects.get_dtable(workspace, table_name)
        if not dtable:
            error_msg = 'dtable %s not found.' % table_name
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        table_path = normalize_file_path(table_file_name)
        table_file_id = seafile_api.get_file_id_by_path(repo_id, table_path)
        if not table_file_id:
            error_msg = 'file %s not found.' % table_file_name
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # main
        api_token_obj = DTableApiToken.objects.get_by_token(token)
        if api_token_obj is None:
            return api_error(status.HTTP_404_NOT_FOUND, 'api_token not found.')

        api_token_obj.update_last_access()

        # generate json web token
        payload = {
            'exp': int(time.time()) + 86400 * 3,
            'dtable_uuid': dtable.uuid.hex,
            'username': api_token_obj.generated_by,
            'permission': api_token_obj.permission,
            'app_name': api_token_obj.app_name,
        }

        try:
            access_token = jwt.encode(
                payload, DTABLE_PRIVATE_KEY, algorithm='HS256'
            )
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'access_token': access_token})
