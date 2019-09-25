# -*- coding: utf-8 -*-
import logging

from rest_framework.views import APIView
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.dtable.models import Workspaces, DTables, DTableFormLinks
from seahub.dtable.utils import check_dtable_permission
from seahub.constants import PERMISSION_READ_WRITE


logger = logging.getLogger(__name__)


def _resource_check(workspace_id, table_name):
    workspace = Workspaces.objects.get_workspace_by_id(workspace_id)
    if not workspace:
        error_msg = 'Workspace %s not found.' % workspace_id
        return None, None, error_msg

    repo_id = workspace.repo_id
    repo = seafile_api.get_repo(repo_id)
    if not repo:
        error_msg = 'Library %s not found.' % repo_id
        return None, None, error_msg

    dtable = DTables.objects.get_dtable(workspace, table_name)
    if not dtable:
        error_msg = 'DTable %s not found.' % table_name
        return None, None, error_msg

    return workspace, dtable, None


class DTableFormLinksView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        """get a dtable form link
        Permission:
        1. owner
        2. group member
        3. shared user with `rw`
        """
        # argument check
        workspace_id = request.GET.get('workspace_id', None)
        if not workspace_id:
            error_msg = 'workspace_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        table_name = request.GET.get('name', None)
        if not table_name:
            error_msg = 'name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        form_id = request.GET.get('form_id', None)
        if not form_id:
            error_msg = 'form_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        workspace, dtable, error_msg = _resource_check(workspace_id, table_name)
        if error_msg:
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # permission check
        username = request.user.username
        if check_dtable_permission(username, workspace, dtable) != PERMISSION_READ_WRITE:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        dtable_uuid = dtable.uuid.hex
        try:
            form_link = DTableFormLinks.objects.get_dtable_form_link(dtable_uuid, form_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({"form_link": form_link}, status=status.HTTP_200_OK)

    def post(self, request):
        """create a dtable form link
        Permission:
        1. owner
        2. group member
        3. shared user with `rw`
        """
        # argument check
        workspace_id = request.POST.get('workspace_id')
        if not workspace_id:
            error_msg = 'workspace_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        table_name = request.POST.get('name')
        if not table_name:
            error_msg = 'name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        form_id = request.POST.get('form_id')
        if not form_id:
            error_msg = 'form_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        workspace, dtable, error_msg = _resource_check(workspace_id, table_name)
        if error_msg:
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # permission check
        username = request.user.username
        if check_dtable_permission(username, workspace, dtable) != PERMISSION_READ_WRITE:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        dtable_uuid = dtable.uuid.hex
        form_link = DTableFormLinks.objects.get_dtable_form_link(dtable_uuid, form_id)
        if form_link:
            error_msg = 'form share link %s already exists.' % form_link['token']
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        try:
            form_link = DTableFormLinks.objects.add_dtable_form_link(
                username, workspace_id, dtable_uuid, form_id
            )
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({"form_link": form_link}, status=status.HTTP_201_CREATED)


class DTableFormLinkView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def delete(self, request, token):
        """ delete a dtable form link.
        Permission:
        1.form link's owner;
        """
        # resource check
        form_link = DTableFormLinks.objects.get_dtable_form_link_by_token(token)
        if not form_link:
            return Response({'success': True}, status=status.HTTP_200_OK)

        # permission check
        username = request.user.username
        form_link_owner = form_link.username
        if username != form_link_owner:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            DTableFormLinks.objects.delete_dtable_form_link(token)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True}, status=status.HTTP_200_OK)
