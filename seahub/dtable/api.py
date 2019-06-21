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
from seahub.dtable.models import Workspaces, ShareDTable
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.utils import is_valid_username, is_org_context
from seahub.api2.endpoints.utils import is_org_user
from seahub.utils import normalize_dir_path
from seahub.constants import PERMISSION_ADMIN, PERMISSION_PREVIEW, PERMISSION_PREVIEW_EDIT, \
    PERMISSION_READ, PERMISSION_READ_WRITE
from seahub.api2.endpoints.dtable import FILE_TYPE

logger = logging.getLogger(__name__)
permission_tuple = (PERMISSION_ADMIN, PERMISSION_PREVIEW, PERMISSION_PREVIEW_EDIT,
                    PERMISSION_READ, PERMISSION_READ_WRITE)


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

        workspace_list = list()
        workspace_ids = set([item.workspace_id for item in share_queryset])

        for workspace_id in workspace_ids:
            dtable_share_queryset = share_queryset.filter(workspace_id=workspace_id)
            workspace = dtable_share_queryset[0].workspace
            workspace_info = workspace.to_dict()
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
                table_info['modifier'] = email2nickname(table_obj.modifier) if table_obj.modifier else email2nickname(
                    from_user)
                table_info['permission'] = permission
                table_info['from_user'] = from_user

                workspace_info['table_list'].append(table_info)

            workspace_list.append(workspace_info)

        return Response({'workspace_list': workspace_list})
