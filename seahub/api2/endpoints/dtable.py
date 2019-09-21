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

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.dtable.models import Workspaces, DTables, DTableRowShares
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.group.utils import group_id_to_name
from seahub.utils import is_valid_dirent_name, is_org_context, normalize_file_path, \
    check_filename_with_rename, gen_file_upload_url
from seahub.settings import MAX_UPLOAD_FILE_NAME_LEN, DTABLE_PRIVATE_KEY
from seahub.dtable.utils import check_dtable_permission
from seahub.constants import PERMISSION_ADMIN, PERMISSION_READ_WRITE


logger = logging.getLogger(__name__)


FILE_TYPE = '.dtable'
WRITE_PERMISSION_TUPLE = (PERMISSION_READ_WRITE, PERMISSION_ADMIN)


class WorkspacesView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

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
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

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
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

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
            error_msg = 'DTable %s not found.' % old_table_name
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
            error_msg = 'DTable %s not found.' % table_name
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
            error_msg = 'DTable %s not found.' % table_name
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
            error_msg = 'DTable %s not found.' % table_name
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


class DTableRowSharesView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        """get a dtable row share link

        Permission:
        1. owner
        2. group member
        3. shared user with `rw` or `admin` permission
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

        table_id = request.GET.get('table_id', None)
        if not table_id:
            error_msg = 'table_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        row_id = request.GET.get('row_id', None)
        if not row_id:
            error_msg = 'row_id invalid.'
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
            error_msg = 'DTable %s not found.' % table_name
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not check_dtable_permission(username, workspace):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        dtable = DTables.objects.get_dtable(workspace, name)
        dtable_uuid = dtable.uuid.hex
        try:
            row_share = DTableRowShares.objects.get_dtable_row_share(
                username, workspace_id, dtable_uuid, table_id, row_id
            )
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({"row_share": row_share}, status=status.HTTP_200_OK)

    def post(self, request):
        """create a dtable row share link

        Permission:
        1. owner
        2. group member
        3. shared user with `rw` or `admin` permission
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

        table_id = request.POST.get('table_id')
        if not table_id:
            error_msg = 'table_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        row_id = request.POST.get('row_id')
        if not row_id:
            error_msg = 'row_id invalid.'
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
            error_msg = 'DTable %s not found.' % table_name
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        owner = workspace.owner
        dtable = DTables.objects.get_dtable(workspace, table_name)
        if not check_dtable_permission(username, owner) and \
                not check_dtable_share_permission(dtable, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        dtable_uuid = dtable.uuid.hex
        row_share = DTableRowShares.objects.get_dtable_row_share(
            username, workspace_id, dtable_uuid, table_id, row_id
        )
        if row_share:
            error_msg = 'Row share link %s already exists.' % row_share['token']
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        try:
            row_share = DTableRowShares.objects.add_dtable_row_share(
                username, workspace_id, dtable_uuid, table_id, row_id
            )
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({"row_share": row_share}, status=status.HTTP_201_CREATED)


class DTableRowShareView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def delete(self, request, token):
        """ Delete share link.

        Permission:
        1. dtable row share owner;
        """
        # resource check
        row_share = DTableRowShares.objects.get_dtable_row_share_by_token(token)
        if not row_share:
            return Response({'success': True}, status=status.HTTP_200_OK)

        # permission check
        username = request.user.username
        row_share_owner = row_share.username
        if username != row_share_owner:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            DTableRowShares.objects.delete_dtable_row_share(token)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True}, status=status.HTTP_200_OK)
