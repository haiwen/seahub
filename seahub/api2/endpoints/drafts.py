# Copyright (c) 2012-2016 Seafile Ltd.
import os
import json
import logging
import posixpath

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.endpoints.utils import add_org_context
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.constants import PERMISSION_READ_WRITE
from seahub.drafts.models import Draft, DraftFileExist
from seahub.tags.models import FileUUIDMap
from seahub.views import check_folder_permission
from seahub.drafts.utils import send_draft_publish_msg

logger = logging.getLogger(__name__)

HTTP_520_OPERATION_FAILED = 520


class DraftsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        """List all user drafts.
        """
        username = request.user.username
        data = Draft.objects.list_draft_by_username(username)

        draft_counts = len(data)

        result = {}
        result['data'] = data
        result['draft_counts'] = draft_counts

        return Response(result)

    @add_org_context
    def post(self, request, org_id, format=None):
        """Create a file draft if the user has read-write permission to the origin file
        """

        # argument check
        repo_id = request.data.get('repo_id', '')
        if not repo_id:
            error_msg = 'repo_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        file_path = request.data.get('file_path', '')
        if not file_path:
            error_msg = 'file_path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        file_id = seafile_api.get_file_id_by_path(repo_id, file_path)
        if not file_id:
            error_msg = 'File %s not found.' % file_path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        perm = check_folder_permission(request, repo_id, file_path)
        if perm != PERMISSION_READ_WRITE:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        username = request.user.username

        # create drafts dir if does not exist
        draft_dir_id = seafile_api.get_dir_id_by_path(repo_id, '/Drafts')
        if draft_dir_id is None:
            seafile_api.post_dir(repo_id, '/', 'Drafts', username)

        # create draft
        try:
            d = Draft.objects.add(username, repo, file_path, file_id=file_id)
            return Response(d.to_dict())
        except DraftFileExist:
            return api_error(status.HTTP_409_CONFLICT, 'Draft already exists.')
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)


class DraftView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def put(self, request, pk, format=None):
        """Publish a draft if the user has read-write permission to the origin file

        Process:
        1. Overwrite the origin file with the draft file.
           If origin file's parent folder does NOT exist, move draft file to library's root folder.
        2. Update draft database info.
        3. Send draft file publish msg.
        """

        # resource check
        try:
            draft = Draft.objects.get(pk=pk)
        except Draft.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND,
                             'Draft %s not found.' % pk)

        repo_id = draft.origin_repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        origin_file_uuid = FileUUIDMap.objects.get_fileuuidmap_by_uuid(draft.origin_file_uuid)
        if origin_file_uuid and seafile_api.get_dir_id_by_path(repo_id,
                                                               origin_file_uuid.parent_path):
            permission = check_folder_permission(request, repo_id, origin_file_uuid.parent_path)
        else:
            permission = check_folder_permission(request, repo_id, '/')

        if permission != PERMISSION_READ_WRITE:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # 1. Overwrite the origin file with the draft file.
        #    If origin file's parent folder does NOT exist, move draft file to library's root folder.

        # get origin file info
        origin_file_parent_path = origin_file_uuid.parent_path if origin_file_uuid else ''

        # check if origin file's parent folder exists
        if not seafile_api.get_dir_id_by_path(repo_id, origin_file_parent_path):
            dst_parent_path = '/'
        else:
            dst_parent_path = origin_file_parent_path

        # get draft file info
        draft_file_name = os.path.basename(draft.draft_file_path)
        draft_file_parent_path = os.path.dirname(draft.draft_file_path)

        f = os.path.splitext(draft_file_name)[0][:-7]
        file_type = os.path.splitext(draft_file_name)[-1]
        dst_file_name = f + file_type

        # move draft file
        username = request.user.username
        seafile_api.move_file(repo_id, draft_file_parent_path,
                              json.dumps([draft_file_name]),
                              repo_id, dst_parent_path,
                              json.dumps([dst_file_name]),
                              replace=1, username=username,
                              need_progress=0, synchronous=1)

        try:
            # 2. Update draft database info.
            dst_file_path = posixpath.join(dst_parent_path, dst_file_name)
            dst_file_id = seafile_api.get_file_id_by_path(repo_id, dst_file_path)
            draft.update(dst_file_id)

            # 3. Send draft file publish msg.
            send_draft_publish_msg(draft, username, dst_file_path)

            result = {}
            result['published_file_path'] = dst_file_path
            result['draft_status'] = draft.status
            return Response(result)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

    def delete(self, request, pk, format=None):
        """Delete a draft if user is draft owner or has repo rw permission
        """
        username = request.user.username
        try:
            d = Draft.objects.get(pk=pk)
        except Draft.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND,
                             'Draft %s not found.' % pk)

        # perm check
        if d.username != username:
            perm = check_folder_permission(request, d.origin_repo_id, '/')
            if perm != PERMISSION_READ_WRITE:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        d.delete(operator=username)

        return Response(status.HTTP_200_OK)
