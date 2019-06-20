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
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, get_user_common_info
from seahub.dtable.models import Workspaces, UserShareWorkspace
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.utils import is_valid_username, is_org_context
from seahub.api2.endpoints.utils import is_org_user
from seahub.constants import PERMISSION_ADMIN, PERMISSION_PREVIEW, PERMISSION_PREVIEW_EDIT, \
    PERMISSION_READ, PERMISSION_READ_WRITE

logger = logging.getLogger(__name__)
permission_tuple = (PERMISSION_ADMIN, PERMISSION_PREVIEW, PERMISSION_PREVIEW_EDIT,
                    PERMISSION_READ, PERMISSION_READ_WRITE)


class UserShareWorkspacesView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """get workspaces from user share
        """
        to_user = request.user.username

        try:
            share_queryset = UserShareWorkspace.objects.list_by_to_user(to_user)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        workspace_list = list()
        for item in share_queryset:
            workspace = item.workspace
            res = workspace.to_dict()
            res["permission"] = item.permission
            res["updated_at"] = workspace.updated_at

            repo_id = workspace.repo_id
            repo = seafile_api.get_repo(repo_id)
            if not repo:
                logger.warning('Library %s not found.' % repo_id)
                continue

            table_objs = seafile_api.list_dir_by_path(repo_id, '/')
            table_list = list()
            for table_obj in table_objs:
                table = dict()
                table["name"] = table_obj.obj_name[:-7]
                table["mtime"] = timestamp_to_isoformat_timestr(table_obj.mtime)
                table["modifier"] = email2nickname(table_obj.modifier) \
                    if table_obj.modifier else email2nickname(workspace.owner)
                table_list.append(table)

            res["table_list"] = table_list
            workspace_list.append(res)

        return Response({"workspace_list": workspace_list})


class UserShareWorkspaceView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, workspace_id):
        """get users from user share workspace
        """
        from_user = request.user.username

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

        # permission check
        if from_user != workspace.owner:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            share_queryset = UserShareWorkspace.objects.list_by_workspace_id(workspace_id)
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

    def post(self, request, workspace_id):
        """share a workspace to user
        """
        from_user = request.user.username

        # argument check
        to_user = request.data.get('email')
        if not to_user or not is_valid_username(to_user):
            error_msg = 'email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        permission = request.data.get('permission')
        if not permission or permission not in permission_tuple:
            error_msg = 'permission invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        try:
            user = User.objects.get(email=to_user)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % to_user
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            workspace = Workspaces.objects.get_workspace_by_id(workspace_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        if not workspace:
            error_msg = 'Workspace %d not found.' % workspace_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        workspace_name = workspace.name

        # permission check
        if from_user != workspace.owner:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if to_user == from_user:
            error_msg = _('Workspace %s can not be shared to owner.' % workspace_name)
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
            obj = UserShareWorkspace.objects.get_by_workspace_id_and_to_user(workspace_id, to_user)
            if obj:
                error_msg = _('Workspace %s already shared to %s.' % (workspace_name, to_user))
                return api_error(status.HTTP_409_CONFLICT, error_msg)

            UserShareWorkspace.objects.add(workspace_id, from_user, to_user, permission)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({"success": True})

    def put(self, request, workspace_id):
        """edit a user share workspace permission
        """
        from_user = request.user.username

        # argument check
        to_user = request.data.get('email')
        if not to_user or not is_valid_username(to_user):
            error_msg = 'email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        permission = request.data.get('permission')
        if not permission or permission not in permission_tuple:
            error_msg = 'permission invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        try:
            user = User.objects.get(email=to_user)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % to_user
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            workspace = Workspaces.objects.get_workspace_by_id(workspace_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        if not workspace:
            error_msg = 'Workspace %d not found.' % workspace_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        workspace_name = workspace.name

        # permission check
        if from_user != workspace.owner:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if to_user == from_user:
            error_msg = 'Workspace %s can not be shared to owner.' % workspace_name
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # main
        try:
            obj = UserShareWorkspace.objects.get_by_workspace_id_and_to_user(workspace_id, to_user)
            if not obj:
                error_msg = 'Workspace %s has not shared to %s.' % (workspace_name, to_user)
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            if obj.permission == permission:
                error_msg = 'Workspace %s already has %s share permission.' % (workspace_name, permission)
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            obj.permission = permission
            obj.save(update_fields=['permission'])
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({"success": True})

    def delete(self, request, workspace_id):
        """unshare a user share workspace
        """
        username = request.user.username

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

        try:
            workspace = Workspaces.objects.get_workspace_by_id(workspace_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        if not workspace:
            error_msg = 'Workspace %d not found.' % workspace_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        workspace_name = workspace.name

        # main
        try:
            obj = UserShareWorkspace.objects.get_by_workspace_id_and_to_user(workspace_id, to_user)
            if not obj:
                error_msg = 'Workspace %s has not shared to %s.' % (workspace_name, to_user)
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            if username not in (workspace.owner, obj.to_user):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            obj.delete()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({"success": True})
