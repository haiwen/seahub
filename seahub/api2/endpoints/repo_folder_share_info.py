# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api

from seahub.api2.utils import api_error
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle

from seahub.constants import PERMISSION_ADMIN
from seahub.utils import normalize_dir_path, is_org_context
from seahub.utils.db_api import SeafileDB
from seahub.group.utils import group_id_to_name
from seahub.share.utils import is_repo_admin
from seahub.share.models import CustomSharePermissions, \
        ExtraSharePermission, ExtraGroupsSharePermission
from seahub.base.templatetags.seahub_tags import email2nickname


logger = logging.getLogger(__name__)


class RepoFolderShareInfo(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, format=None):
        """ List all shared out repos and folders.

        Permission checking:
        1. repo admin
        """

        # argument check
        repo_id = request.GET.get('repo_id')
        if not repo_id:
            error_msg = 'repo_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        share_to = request.GET.get('share_to')
        if share_to and share_to not in ('user', 'group'):
            error_msg = 'share_to invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if not is_repo_admin(username, repo_id):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # get share info
        share_info_list = []
        try:
            seafile_db = SeafileDB()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        org_id = ''
        if is_org_context(request):
            org_id = request.user.org.org_id

        if share_to == 'user':
            share_info_list += seafile_db.get_repo_user_share_list(repo_id,
                                                                   org_id)
            share_info_list += seafile_db.get_folder_user_share_list(repo_id,
                                                                     org_id)
        elif share_to == 'group':
            share_info_list += seafile_db.get_repo_group_share_list(repo_id,
                                                                    org_id)
            share_info_list += seafile_db.get_folder_group_share_list(repo_id,
                                                                      org_id)
        else:
            share_info_list += seafile_db.get_repo_user_share_list(repo_id,
                                                                   org_id)
            share_info_list += seafile_db.get_folder_user_share_list(repo_id,
                                                                     org_id)
            share_info_list += seafile_db.get_repo_group_share_list(repo_id,
                                                                    org_id)
            share_info_list += seafile_db.get_folder_group_share_list(repo_id,
                                                                      org_id)

        custom_perm_dict = {}
        custom_perms = CustomSharePermissions.objects.filter(repo_id=repo_id)
        for custom_perm in custom_perms:
            custom_id = f'custom-{custom_perm.id}'
            custom_perm_dict[custom_id] = custom_perm.name

        for share_info in share_info_list:

            share_info['path'] = normalize_dir_path(share_info['path'])
            share_info['repo_name'] = repo.repo_name

            share_type = share_info['share_type']
            share_to = share_info['share_to']

            extra_perm = ''
            if share_type == 'user':

                share_info['share_to_name'] = email2nickname(share_to)
                if share_info['path'] == '/':
                    extra_perm = ExtraSharePermission.objects.get_user_permission(repo_id,
                                                                                  share_to)
            if share_type == 'group':

                share_info['share_to_name'] = group_id_to_name(share_to)
                if share_info['path'] == '/':
                    extra_perm = ExtraGroupsSharePermission.objects.get_group_permission(repo_id,
                                                                                         share_to)

            if extra_perm == PERMISSION_ADMIN:
                share_info['permission'] = 'admin'

            share_info['permission_name'] = ''
            if share_info['permission'].startswith('custom-'):
                share_info['permission_name'] = custom_perm_dict.get(share_info['permission'])

        share_info = {}
        share_info['share_info_list'] = share_info_list

        return Response(share_info)
