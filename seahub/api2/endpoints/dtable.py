# -*- coding: utf-8 -*-

import os
import logging

from rest_framework.views import APIView
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.response import Response
from django.http import Http404, HttpResponseRedirect
from django.shortcuts import render
from django.utils.translation import ugettext as _

from pysearpc import SearpcError
from seaserv import seafile_api, edit_repo

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.api2.views import get_repo_file
from seahub.dtable.models import Workspaces
from seahub.tags.models import FileUUIDMap
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.utils import is_valid_dirent_name, is_org_context, normalize_file_path, \
    check_filename_with_rename, render_error, render_permission_error, gen_file_upload_url, \
    gen_file_get_url, get_file_type_and_ext, IMAGE
from seahub.views.file import send_file_access_msg
from seahub.auth.decorators import login_required
from seahub.settings import MAX_UPLOAD_FILE_NAME_LEN, SHARE_LINK_EXPIRE_DAYS_MIN, \
     SHARE_LINK_EXPIRE_DAYS_MAX, SHARE_LINK_EXPIRE_DAYS_DEFAULT


logger = logging.getLogger(__name__)


FILE_TYPE = '.dtable'


class WorkspacesView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        """get all workspaces
        """
        owner = request.user.username
        try:
            workspaces = Workspaces.objects.get_workspaces_by_owner(owner)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        workspace_list = []
        for workspace in workspaces:
            repo_id = workspace.repo_id
            repo = seafile_api.get_repo(repo_id)
            if not repo:
                logger.warning('Library %s not found.' % repo_id)
                continue

            table_objs = seafile_api.list_dir_by_path(repo_id, '/')
            table_list = list()
            for table_obj in table_objs:
                if table_obj.obj_name[-7:] != FILE_TYPE:
                    continue
                table = dict()
                table["name"] = table_obj.obj_name[:-7]
                table["mtime"] = timestamp_to_isoformat_timestr(table_obj.mtime)
                table["modifier"] = email2nickname(table_obj.modifier) if table_obj.modifier else email2nickname(owner)
                table_list.append(table)

            res = workspace.to_dict()
            res["table_list"] = table_list
            res["updated_at"] = workspace.updated_at
            workspace_list.append(res)

        return Response({"workspace_list": workspace_list}, status=status.HTTP_200_OK)

    def post(self, request):
        """create a workspace
        """
        # argument check
        name = request.POST.get('name')
        if not name:
            error_msg = 'name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not is_valid_dirent_name(name):
            error_msg = 'name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # permission check
        if not request.user.permissions.can_add_repo():
            error_msg = 'You do not have permission to create workspace.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        org_id = -1
        if is_org_context(request):
            org_id = request.user.org.org_id

        try:
            if org_id > 0:
                repo_id = seafile_api.create_org_repo(name, '', "dtable@seafile", org_id)
            else:
                repo_id = seafile_api.create_repo(name, '', "dtable@seafile")
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        owner = request.user.username
        try:
            workspace = Workspaces.objects.create_workspace(name, owner, repo_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        res = workspace.to_dict()
        res["table_list"] = []
        res["updated_at"] = workspace.updated_at

        return Response({"workspace": res}, status=status.HTTP_201_CREATED)


class WorkspaceView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def put(self, request, workspace_id):
        """rename a workspace
        """
        # argument check
        workspace_name = request.data.get('name')
        if not workspace_name:
            error_msg = 'name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not is_valid_dirent_name(workspace_name):
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

        # permission check
        username = request.user.username
        owner = workspace.owner
        if username != owner:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # repo status check
        repo_status = repo.status
        if repo_status != 0:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            edit_repo(repo_id, workspace_name, '', username)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        try:
            workspace.name = workspace_name
            workspace.save()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        table_objs = seafile_api.list_dir_by_path(repo_id, '/')
        table_list = list()
        for table_obj in table_objs:
            if table_obj.obj_name[-7:] != FILE_TYPE:
                continue
            table = dict()
            table["name"] = table_obj.obj_name[:-7]
            table["mtime"] = timestamp_to_isoformat_timestr(table_obj.mtime)
            table["modifier"] = email2nickname(table_obj.modifier) if table_obj.modifier else email2nickname(owner)
            table_list.append(table)

        res = workspace.to_dict()
        res["table_list"] = table_list
        res["updated_at"] = workspace.updated_at

        return Response({"workspace": res}, status=status.HTTP_200_OK)

    def delete(self, request, workspace_id):
        """delete a workspace
        """
        # resource check
        workspace = Workspaces.objects.get_workspace_by_id(workspace_id)
        if not workspace:
            return Response({'success': True}, status=status.HTTP_200_OK)

        repo_id = workspace.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            logger.warning('Library %s not found.' % repo_id)

        # permission check
        username = request.user.username
        owner = workspace.owner
        if username != owner:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if repo:

            # repo status check
            repo_status = repo.status
            if repo_status != 0:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            # remove repo
            try:
                seafile_api.remove_repo(repo_id)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error.'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        try:
            Workspaces.objects.delete_workspace(workspace_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error.'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({"success": "true"}, status=status.HTTP_200_OK)


class DTableView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, workspace_id):
        """view table file, get table download link
        """
        # argument check
        table_name = request.GET.get('name', None)
        if not table_name:
            error_msg = 'name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        reuse = request.GET.get('reuse', '0')
        if reuse not in ('1', '0'):
            error_msg = 'reuse invalid.'
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

        table_file_name = table_name + FILE_TYPE
        table_path = normalize_file_path(table_file_name)
        table_file_id = seafile_api.get_file_id_by_path(repo_id, table_path)
        if not table_file_id:
            error_msg = 'table %s not found.' % table_name
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        owner = workspace.owner
        if username != owner:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # send stats message
        send_file_access_msg(request, repo, table_path, 'api')

        op = request.GET.get('op', 'download')
        use_onetime = False if reuse == '1' else True
        return get_repo_file(request, repo_id, table_file_id, table_file_name, op, use_onetime)

    def post(self, request, workspace_id):
        """create a table file
        """
        # argument check
        table_name = request.POST.get('name')
        if not table_name:
            error_msg = 'name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        table_file_name = table_name + FILE_TYPE
        if not is_valid_dirent_name(table_file_name):
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

        # permission check
        username = request.user.username
        owner = workspace.owner
        if username != owner:
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
            seafile_api.post_empty_file(repo_id, '/', table_file_name, owner)
        except SearpcError, e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        table_path = normalize_file_path(table_file_name)
        table_obj = seafile_api.get_dirent_by_path(repo_id, table_path)
        table = dict()
        table["name"] = table_obj.obj_name[:-7]
        table["mtime"] = timestamp_to_isoformat_timestr(table_obj.mtime)
        table["modifier"] = email2nickname(table_obj.modifier) if table_obj.modifier else email2nickname(owner)

        return Response({"table": table}, status=status.HTTP_201_CREATED)

    def put(self, request, workspace_id):
        """rename a table
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

        old_table_file_name = old_table_name + FILE_TYPE
        old_table_path = normalize_file_path(old_table_file_name)
        table_file_id = seafile_api.get_file_id_by_path(repo_id, old_table_path)
        if not table_file_id:
            error_msg = 'table %s not found.' % old_table_name
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        owner = workspace.owner
        if username != owner:
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
            seafile_api.rename_file(repo_id, '/', old_table_file_name, new_table_file_name, owner)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        new_table_path = normalize_file_path(new_table_file_name)
        table_obj = seafile_api.get_dirent_by_path(repo_id, new_table_path)
        table = dict()
        table["name"] = table_obj.obj_name[:-7]
        table["mtime"] = timestamp_to_isoformat_timestr(table_obj.mtime)
        table["modifier"] = email2nickname(table_obj.modifier) if table_obj.modifier else email2nickname(owner)

        return Response({"table": table}, status=status.HTTP_200_OK)

    def delete(self, request, workspace_id):
        """delete a table
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

        table_path = normalize_file_path(table_file_name)
        table_file_id = seafile_api.get_file_id_by_path(repo_id, table_path)
        if not table_file_id:
            return Response({'success': True}, status=status.HTTP_200_OK)

        # permission check
        username = request.user.username
        owner = workspace.owner
        if username != owner:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # repo status check
        repo_status = repo.status
        if repo_status != 0:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # delete asset
        uuid = FileUUIDMap.objects.get_or_create_fileuuidmap(repo_id, '/', table_file_name, is_dir=False)
        asset_dir_path = '/asset/' + str(uuid.uuid)
        asset_dir_id = seafile_api.get_dir_id_by_path(repo_id, asset_dir_path)
        if asset_dir_id:
            parent_dir = os.path.dirname(asset_dir_path)
            file_name = os.path.basename(asset_dir_path)
            try:
                seafile_api.del_file(repo_id, parent_dir, file_name, owner)
            except SearpcError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # delete uuid
        uuid.delete()

        # delete table
        try:
            seafile_api.del_file(repo_id, '/', table_file_name, owner)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True}, status=status.HTTP_200_OK)


class DTableUpdateLinkView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, workspace_id):
        """get table file update link
        """
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

        # permission check
        username = request.user.username
        owner = workspace.owner
        if username != owner:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            token = seafile_api.get_fileserver_access_token(repo_id, 'dummy', 'update',
                                                            owner, use_onetime=False)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        url = gen_file_upload_url(token, 'update-api')
        return Response(url)


class DTableAssetUploadLinkView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, workspace_id):
        """get table file upload link
        """
        # argument check
        table_name = request.GET.get('name', None)
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

        # permission check
        username = request.user.username
        owner = workspace.owner
        if username != owner:
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
        uuid = FileUUIDMap.objects.get_or_create_fileuuidmap(repo_id, '/',
                                                             table_file_name,
                                                             is_dir=False)

        # create asset dir
        asset_dir_path = '/asset/' + str(uuid.uuid)
        asset_dir_id = seafile_api.get_dir_id_by_path(repo_id, asset_dir_path)
        if not asset_dir_id:
            seafile_api.mkdir_with_parents(repo_id, '/', asset_dir_path[1:], owner)

        res = dict()
        res['upload_link'] = upload_link
        res['parent_path'] = asset_dir_path
        return Response(res)


@login_required
def dtable_file_view(request, workspace_id, name):

    # resource check
    workspace = Workspaces.objects.get_workspace_by_id(workspace_id)
    if not workspace:
        raise Http404

    repo_id = workspace.repo_id
    repo = seafile_api.get_repo(repo_id)
    if not repo:
        raise Http404

    table_file_name = name + FILE_TYPE
    table_path = normalize_file_path(table_file_name)
    table_file_id = seafile_api.get_file_id_by_path(repo_id, table_path)
    if not table_file_id:
        return render_error(request, _(u'Table does not exist'))

    # permission check
    username = request.user.username
    owner = workspace.owner
    if username != owner:
        return render_permission_error(request, _(u'Unable to view file'))

    return_dict = {
        'share_link_expire_days_default': SHARE_LINK_EXPIRE_DAYS_DEFAULT,
        'share_link_expire_days_min': SHARE_LINK_EXPIRE_DAYS_MIN,
        'share_link_expire_days_max': SHARE_LINK_EXPIRE_DAYS_MAX,
        'repo': repo,
        'filename': name,
        'path': table_path,
        'filetype': 'dtable',
        'workspace_id': workspace_id,
    }

    return render(request, 'dtable_file_view_react.html', return_dict)


def dtable_asset_access(request, workspace_id, dtable_id, path):

    # asset file type check
    asset_name = os.path.basename(normalize_file_path(path))
    file_type, file_ext = get_file_type_and_ext(asset_name)
    if file_type != IMAGE:
        err_msg = 'Invalid file type'
        return render_error(request, err_msg)

    # resource check
    workspace = Workspaces.objects.get_workspace_by_id(workspace_id)
    if not workspace:
        raise Http404

    repo_id = workspace.repo_id
    repo = seafile_api.get_repo(repo_id)
    if not repo:
        raise Http404

    asset_path = normalize_file_path(os.path.join('/asset', dtable_id, path))
    asset_id = seafile_api.get_file_id_by_path(repo_id, asset_path)
    if not asset_id:
        raise Http404

    # permission check
    username = request.user.username
    owner = workspace.owner
    if username != owner:
        return render_permission_error(request, 'Permission denied.')

    token = seafile_api.get_fileserver_access_token(repo_id, asset_id, 'view',
                                                    '', use_onetime=False)

    url = gen_file_get_url(token, asset_name)

    return HttpResponseRedirect(url)
