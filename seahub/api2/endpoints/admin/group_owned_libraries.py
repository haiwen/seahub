# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api

from seahub.api2.utils import api_error
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.permissions import IsProVersion
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.endpoints.utils import api_check_group

from seahub.signals import repo_created
from seahub.utils import is_valid_dirent_name, \
        is_pro_version
from seahub.utils.repo import get_library_storages, get_repo_owner
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.share.signals import share_repo_to_group_successful
from seahub.constants import PERMISSION_READ, PERMISSION_READ_WRITE

from seahub.settings import ENABLE_STORAGE_CLASSES, STORAGE_CLASS_MAPPING_POLICY

logger = logging.getLogger(__name__)

def get_group_owned_repo_info(request, repo_id):

    repo = seafile_api.get_repo(repo_id)

    repo_info = {}
    repo_info['repo_id'] = repo_id
    repo_info['repo_name'] = repo.name

    repo_info['mtime'] = timestamp_to_isoformat_timestr(repo.last_modified)
    repo_info['size'] = repo.size
    repo_info['encrypted'] = repo.encrypted

    repo_owner = get_repo_owner(request, repo_id)
    repo_info['owner_email'] = repo_owner

    return repo_info

class AdminGroupOwnedLibraries(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    @api_check_group
    def post(self, request, group_id):
        """ Add a group owned library.
        """

        # argument check
        repo_name = request.data.get("repo_name", None)
        if not repo_name or \
                not is_valid_dirent_name(repo_name):
            error_msg = "repo_name invalid."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        password = request.data.get("password", None)

        permission = request.data.get('permission', PERMISSION_READ_WRITE)
        if permission not in [PERMISSION_READ, PERMISSION_READ_WRITE]:
            error_msg = 'permission invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # permission check
        group_quota = seafile_api.get_group_quota(group_id)
        group_quota = int(group_quota)
        if group_quota <= 0 and group_quota != -2:
            error_msg = 'No group quota.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # create group owned repo
        group_id = int(group_id)
        if is_pro_version() and ENABLE_STORAGE_CLASSES:

            if STORAGE_CLASS_MAPPING_POLICY in ('USER_SELECT',
                    'ROLE_BASED'):

                storages = get_library_storages(request)
                storage_id = request.data.get("storage_id", None)
                if storage_id and storage_id not in [s['storage_id'] for s in storages]:
                    error_msg = 'storage_id invalid.'
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

                repo_id = seafile_api.add_group_owned_repo(group_id, repo_name,
                        password, permission, storage_id)
            else:
                # STORAGE_CLASS_MAPPING_POLICY == 'REPO_ID_MAPPING'
                repo_id = seafile_api.add_group_owned_repo(group_id, repo_name,
                        password, permission)
        else:
            repo_id = seafile_api.add_group_owned_repo(group_id, repo_name,
                    password, permission)

        # for activities
        org_id = -1
        username = request.user.username
        library_template = request.data.get("library_template", '')
        repo_created.send(sender=None, org_id=org_id, creator=username,
                repo_id=repo_id, repo_name=repo_name,
                library_template=library_template)

        # for notification
        repo = seafile_api.get_repo(repo_id)
        share_repo_to_group_successful.send(sender=None, from_user=username,
                group_id=group_id, repo=repo, path='/', org_id=org_id)

        info = get_group_owned_repo_info(request, repo_id)
        # TODO
        info['permission'] = permission
        return Response(info)

class AdminGroupOwnedLibrary(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, IsProVersion)
    throttle_classes = (UserRateThrottle,)

    @api_check_group
    def delete(self, request, group_id, repo_id):
        """ Delete a group owned library.
        """

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        group_id = int(group_id)
        try:
            seafile_api.delete_group_owned_repo(group_id, repo_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
