# -*- coding: utf-8 -*-

import logging

from rest_framework.views import APIView
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.response import Response
from django.utils.translation import ugettext as _
from seaserv import seafile_api

from seahub.base.accounts import User
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, get_user_common_info
from seahub.dtable.models import Workspaces, DTables, DTableShare
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.utils import is_valid_username, is_org_context
from seahub.api2.endpoints.utils import is_org_user
from seahub.utils import normalize_file_path
from seahub.constants import PERMISSION_ADMIN, PERMISSION_PREVIEW, PERMISSION_PREVIEW_EDIT, \
    PERMISSION_READ, PERMISSION_READ_WRITE
from seahub.api2.endpoints.dtable import FILE_TYPE
from seahub.group.utils import group_id_to_name
from seahub.utils.timeutils import datetime_to_isoformat_timestr

logger = logging.getLogger(__name__)
permission_tuple = (PERMISSION_ADMIN, PERMISSION_PREVIEW, PERMISSION_PREVIEW_EDIT,
                    PERMISSION_READ, PERMISSION_READ_WRITE)
GROUP_DOMAIN = '@seafile_group'


class SharedDTablesView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """list dtables from shared
        """
        to_user = request.user.username

        try:
            share_queryset = DTableShare.objects.list_by_to_user(to_user)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        table_list = list()

        for item in share_queryset:
            from_user = item.from_user
            permission = item.permission
            dtable = item.dtable

            dtable_info = dict()
            dtable_info['id'] = dtable.pk
            dtable_info['workspace_id'] = dtable.workspace_id
            dtable_info['uuid'] = dtable.uuid
            dtable_info['name'] = dtable.name
            dtable_info['creator'] = email2nickname(dtable.creator)
            dtable_info['modifier'] = email2nickname(dtable.modifier)
            dtable_info['created_at'] = datetime_to_isoformat_timestr(dtable.created_at)
            dtable_info['updated_at'] = datetime_to_isoformat_timestr(dtable.updated_at)
            dtable_info['permission'] = permission
            dtable_info['from_user'] = from_user
            dtable_info['from_user_name'] = email2nickname(from_user)

            table_list.append(dtable_info)

        return Response({'table_list': table_list})


class DTableShareView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, workspace_id, name):
        """share dtable to user
        """
        from_user = request.user.username
        table_name = name
        table_file_name = table_name + FILE_TYPE

        # argument check
        permission = request.data.get('permission')
        if not permission or permission not in permission_tuple:
            error_msg = 'permission invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        to_user = request.data.get('email')
        if not to_user or not is_valid_username(to_user):
            error_msg = 'email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        try:
            user = User.objects.get(email=to_user)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % to_user
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

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
        if from_user != dtable.creator:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if to_user == from_user:
            error_msg = 'table %s can not be shared to owner.' % table_name
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # org check
        if is_org_context(request):
            org_id = request.user.org.org_id
            org_name = request.user.org.org_name
            if not is_org_user(to_user, org_id):
                error_msg = 'User %s is not member of organization %s.' % (to_user, org_name)
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        else:
            if is_org_user(to_user):
                error_msg = 'User %s is a member of organization.' % to_user
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # main
        try:
            obj = DTableShare.objects.get_by_dtable_and_to_user(dtable, to_user)
            if obj:
                error_msg = 'table %s already shared to %s.' % (table_name, to_user)
                return api_error(status.HTTP_409_CONFLICT, error_msg)

            DTableShare.objects.add(dtable, from_user, to_user, permission)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({"success": True}, status=status.HTTP_201_CREATED)

    def get(self, request, workspace_id, name):
        """list share users in dtable share
        """
        from_user = request.user.username
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
        if from_user != dtable.creator:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # main
        try:
            share_queryset = DTableShare.objects.list_by_dtable(dtable)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        user_list = list()
        for item in share_queryset:
            user_info = get_user_common_info(item.to_user)
            user_info['permission'] = item.permission
            user_list.append(user_info)

        return Response({"user_list": user_list})

    def put(self, request, workspace_id, name):
        """modify dtable share permission
        """
        from_user = request.user.username
        table_name = name
        table_file_name = table_name + FILE_TYPE

        # argument check
        permission = request.data.get('permission')
        if not permission or permission not in permission_tuple:
            error_msg = 'permission invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        to_user = request.data.get('email')
        if not to_user or not is_valid_username(to_user):
            error_msg = 'email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        try:
            user = User.objects.get(email=to_user)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % to_user
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

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
        if from_user != dtable.creator:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if to_user == from_user:
            error_msg = 'table %s can not be shared to owner.' % table_name
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # main
        try:
            obj = DTableShare.objects.get_by_dtable_and_to_user(dtable, to_user)
            if not obj:
                error_msg = 'table %s not shared to %s.' % (table_name, to_user)
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)
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

    def delete(self, request, workspace_id, name):
        """unshare dtable
        """
        username = request.user.username
        table_name = name
        table_file_name = table_name + FILE_TYPE

        # argument check
        to_user = request.data.get('email')
        if not to_user or not is_valid_username(to_user):
            error_msg = 'email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        try:
            user = User.objects.get(email=to_user)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % to_user
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

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
        try:
            obj = DTableShare.objects.get_by_dtable_and_to_user(dtable, to_user)
            if not obj:
                error_msg = 'table %s not shared to %s.' % (table_name, to_user)
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

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
