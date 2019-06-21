# -*- coding: utf-8 -*-

import logging

from rest_framework.views import APIView
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.response import Response
from django.utils.translation import ugettext as _
from seaserv import seafile_api, ccnet_api

from seahub.base.accounts import User
from seahub.tags.models import FileUUIDMap
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, get_user_common_info
from seahub.dtable.models import Workspaces, ShareDTable
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.utils import is_valid_username, is_org_context
from seahub.api2.endpoints.utils import is_org_user
from seahub.utils import normalize_dir_path, normalize_file_path
from seahub.constants import PERMISSION_ADMIN, PERMISSION_PREVIEW, PERMISSION_PREVIEW_EDIT, \
    PERMISSION_READ, PERMISSION_READ_WRITE
from seahub.api2.endpoints.dtable import FILE_TYPE
from seahub.api2.endpoints.group_owned_libraries import get_group_id_by_repo_owner

logger = logging.getLogger(__name__)
permission_tuple = (PERMISSION_ADMIN, PERMISSION_PREVIEW, PERMISSION_PREVIEW_EDIT,
                    PERMISSION_READ, PERMISSION_READ_WRITE)
GROUP_DOMAIN = '@seafile_group'


class ShareDTablesView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """get dtables from share
        """
        to_user = request.user.username

        try:
            share_queryset = ShareDTable.objects.list_by_to_user(to_user)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        share_list = list()
        workspace_ids = set([item.workspace_id for item in share_queryset])

        for workspace_id in workspace_ids:
            dtable_share_queryset = share_queryset.filter(workspace_id=workspace_id)
            workspace = dtable_share_queryset[0].workspace
            workspace_info = dict()
            workspace_info['workspace_id'] = workspace.id
            workspace_info['owner'] = email2nickname(workspace.owner)
            workspace_info['table_list'] = list()

            for item in dtable_share_queryset:
                from_user = item.from_user
                permission = item.permission
                repo_id = item.uuid.repo_id
                parent_path = normalize_dir_path(item.uuid.parent_path)
                filename = item.uuid.filename
                is_dir = item.uuid.is_dir
                path = parent_path + filename

                table_obj = seafile_api.get_dirent_by_path(repo_id, path)
                if is_dir or not table_obj or table_obj.obj_name[-7:] != FILE_TYPE:
                    continue

                table_info = dict()
                table_info['name'] = table_obj.obj_name[:-7]
                table_info['mtime'] = timestamp_to_isoformat_timestr(table_obj.mtime)
                table_info['modifier'] = email2nickname(table_obj.modifier) \
                    if table_obj.modifier else email2nickname(from_user)
                table_info['permission'] = permission
                table_info['from_user'] = from_user

                workspace_info['table_list'].append(table_info)

            share_list.append(workspace_info)

        return Response({'share_list': share_list})


class ShareDTableView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def _handler_to_user(self, request, share_type):
        to_user = None
        error_msg = None

        if share_type == 'user':
            email = request.data.get('email')
            if not email or not is_valid_username(email):
                error_msg = 'email invalid.'
                return to_user, error_msg

            # resource check
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                error_msg = 'User %s not found.' % email
                return to_user, error_msg

            # org check
            if is_org_context(request):
                org_id = request.user.org.org_id
                org_name = request.user.org.org_name

                if not is_org_user(to_user, org_id):
                    error_msg = 'User %s is not member of organization %s.' % (email, org_name)
                    return to_user, error_msg
            else:
                if is_org_user(to_user):
                    error_msg = 'User %s is a member of organization.' % email
                    return to_user, error_msg

            to_user = email
            return to_user, error_msg

        if share_type == 'group':
            group_id = request.data.get('group_id')
            try:
                group_id = int(group_id)
            except ValueError:
                error_msg = 'group_id %s invalid.' % group_id
                return to_user, error_msg

            # resource check
            group = ccnet_api.get_group(group_id)
            if not group:
                error_msg = 'Group %s not found.' % group_id
                return to_user, error_msg

            if not ccnet_api.is_group_user(group_id, request.user.username):
                error_msg = 'you are not a member of group %s.' % group_id
                return to_user, error_msg

            # org check
            if is_org_context(request):
                org_id = request.user.org.org_id
                org_name = request.user.org.org_name

                if not ccnet_api.is_org_group(group_id) or \
                        ccnet_api.get_org_id_by_group(group_id) != org_id:
                    error_msg = 'Group %s do not belong to organization %s.' % (group_id, org_name)
                    return to_user, error_msg
            else:
                if ccnet_api.is_org_group(group_id):
                    error_msg = 'Group %s belong to an organization.' % group_id
                    return to_user, error_msg

            to_user = str(group_id) + GROUP_DOMAIN
            return to_user, error_msg

    def get(self, request, workspace_id, name):
        """list share users in share dtable
        """
        from_user = request.user.username
        table_name = name

        # argument check
        share_type = request.data.get('share_type')
        if not share_type or share_type not in ('user', 'group'):
            error_msg = 'share_type invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        try:
            workspace = Workspaces.objects.get_workspace_by_id(workspace_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        if not workspace:
            error_msg = 'Workspace %d not found.' % workspace_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_id = workspace.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        table_file_name = table_name + FILE_TYPE
        table_path = normalize_file_path(table_file_name)
        table_file_id = seafile_api.get_file_id_by_path(repo_id, table_path)
        if not table_file_id:
            error_msg = 'table %s not found.' % table_name
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if from_user != workspace.owner:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # main
        try:
            uuid = FileUUIDMap.objects.get_or_create_fileuuidmap(repo_id, '/', table_file_name, is_dir=False)

            share_queryset = ShareDTable.objects.list_by_uuid(uuid)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if share_type == 'user':
            user_list = list()
            for item in share_queryset:
                if GROUP_DOMAIN not in item.to_user:
                    user_info = get_user_common_info(item.to_user)
                    user_info['permission'] = item.permission
                    user_list.append(user_info)

            return Response({"user_list": user_list})

        if share_type == 'group':
            group_list = list()
            for item in share_queryset:
                if GROUP_DOMAIN in item.to_user:
                    group_id = get_group_id_by_repo_owner(item.to_user)
                    group = ccnet_api.get_group(group_id)
                    if not group:
                        continue
                    group_info = dict()
                    group_info['id'] = group.id
                    group_info['parent_group_id'] = group.parent_group_id
                    group_info['owner'] = group.creator_name
                    group_info['name'] = group.group_name
                    group_info['permission'] = item.permission
                    group_list.append(group_info)

            return Response({"group_list": group_list})

    def post(self, request, workspace_id, name):
        """share dtable
        """
        from_user = request.user.username
        table_name = name

        # argument check
        permission = request.data.get('permission')
        if not permission or permission not in permission_tuple:
            error_msg = 'permission invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        share_type = request.data.get('share_type')
        if not share_type or share_type not in ('user', 'group'):
            error_msg = 'share_type invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # to_user and org check
        to_user, to_user_error_msg = self._handler_to_user(request, share_type)
        if not to_user:
            return api_error(status.HTTP_400_BAD_REQUEST, to_user_error_msg)

        # resource check
        try:
            workspace = Workspaces.objects.get_workspace_by_id(workspace_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        if not workspace:
            error_msg = 'Workspace %d not found.' % workspace_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_id = workspace.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        table_file_name = table_name + FILE_TYPE
        table_path = normalize_file_path(table_file_name)
        table_file_id = seafile_api.get_file_id_by_path(repo_id, table_path)
        if not table_file_id:
            error_msg = 'table %s not found.' % table_name
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if from_user != workspace.owner:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if to_user == from_user:
            error_msg = 'table %s can not be shared to owner.' % table_name
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # main
        try:
            uuid = FileUUIDMap.objects.get_or_create_fileuuidmap(repo_id, '/', table_file_name, is_dir=False)

            obj = ShareDTable.objects.get_by_uuid_and_to_user(uuid, to_user)
            if obj:
                error_msg = 'table %s already shared to %s.' % (table_name, to_user)
                return api_error(status.HTTP_409_CONFLICT, error_msg)

            ShareDTable.objects.add(uuid, workspace, from_user, to_user, permission)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({"success": True}, status=status.HTTP_201_CREATED)

    def delete(self, request, workspace_id, name):
        """unshare dtable
        """
        username = request.user.username
        table_name = name

        # argument check
        share_type = request.data.get('share_type')
        if not share_type or share_type not in ('user', 'group'):
            error_msg = 'share_type invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # to_user and org check
        to_user, to_user_error_msg = self._handler_to_user(request, share_type)
        if not to_user:
            return api_error(status.HTTP_400_BAD_REQUEST, to_user_error_msg)

        # resource check
        try:
            workspace = Workspaces.objects.get_workspace_by_id(workspace_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        if not workspace:
            error_msg = 'Workspace %d not found.' % workspace_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_id = workspace.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        table_file_name = table_name + FILE_TYPE
        table_path = normalize_file_path(table_file_name)
        table_file_id = seafile_api.get_file_id_by_path(repo_id, table_path)
        if not table_file_id:
            error_msg = 'table %s not found.' % table_name
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # main
        try:
            uuid = FileUUIDMap.objects.get_or_create_fileuuidmap(repo_id, '/', table_file_name, is_dir=False)

            obj = ShareDTable.objects.get_by_uuid_and_to_user(uuid, to_user)
            if not obj:
                error_msg = 'table %s not shared to %s.' % (table_name, to_user)
                return api_error(status.HTTP_409_CONFLICT, error_msg)

            # permission check
            if username not in (obj.to_user, obj.from_user):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            obj.delete()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({"success": True})

    def put(self, request, workspace_id, name):
        """modify share dtable permission
        """
        from_user = request.user.username
        table_name = name

        # argument check
        permission = request.data.get('permission')
        if not permission or permission not in permission_tuple:
            error_msg = 'permission invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        share_type = request.data.get('share_type')
        if not share_type or share_type not in ('user', 'group'):
            error_msg = 'share_type invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # to_user and org check
        to_user, to_user_error_msg = self._handler_to_user(request, share_type)
        if not to_user:
            return api_error(status.HTTP_400_BAD_REQUEST, to_user_error_msg)

        # resource check
        try:
            workspace = Workspaces.objects.get_workspace_by_id(workspace_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        if not workspace:
            error_msg = 'Workspace %d not found.' % workspace_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_id = workspace.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        table_file_name = table_name + FILE_TYPE
        table_path = normalize_file_path(table_file_name)
        table_file_id = seafile_api.get_file_id_by_path(repo_id, table_path)
        if not table_file_id:
            error_msg = 'table %s not found.' % table_name
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if from_user != workspace.owner:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if to_user == from_user:
            error_msg = 'table %s can not be shared to owner.' % table_name
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # main
        try:
            uuid = FileUUIDMap.objects.get_or_create_fileuuidmap(repo_id, '/', table_file_name, is_dir=False)

            obj = ShareDTable.objects.get_by_uuid_and_to_user(uuid, to_user)
            if not obj:
                error_msg = 'table %s not shared to %s.' % (table_name, to_user)
                return api_error(status.HTTP_409_CONFLICT, error_msg)
            if permission == obj.permission:
                error_msg = 'table %s already has %s share permission.' % (table_name, permission)
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            obj.permission = permission
            obj.save(update_fields=['permission'])
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({"success": True})
