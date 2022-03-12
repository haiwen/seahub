# Copyright (c) 2012-2016 Seafile Ltd.
import os
import logging
import posixpath

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

from seahub.utils import normalize_file_path, get_file_upload_info
from seahub.utils.timeutils import timestamp_to_isoformat_timestr, \
        datetime_to_isoformat_timestr
from seahub.base.templatetags.seahub_tags import email2nickname, \
    email2contact_email

logger = logging.getLogger(__name__)


class AdminFileDetail(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id, format=None):

        # argument check
        path = request.GET.get('path', None)
        if not path:
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        path = normalize_file_path(path)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        commit_id = request.GET.get('commit_id', None)
        try:
            if commit_id:
                obj_id = seafile_api.get_file_id_by_commit_and_path(repo_id, commit_id, path)
            else:
                obj_id = seafile_api.get_file_id_by_path(repo_id, path)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not obj_id:
            error_msg = 'File %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # get real path for sub repo
        if repo.is_virtual:
            real_path = posixpath.join(repo.origin_path, path.lstrip('/'))
            real_repo_id = repo.origin_repo_id
        else:
            real_path = path
            real_repo_id = repo_id

        entry = {}
        entry["id"] = obj_id
        entry["name"] = os.path.basename(path)

        # fetch file contributors and latest contributor
        try:
            # get real path for sub repo
            dirent = seafile_api.get_dirent_by_path(real_repo_id, real_path)
        except Exception as e:
            logger.error(e)
            dirent = None

        last_modified = dirent.mtime if dirent else ''
        latest_contributor = dirent.modifier if dirent else ''

        entry["mtime"] = last_modified
        entry["last_modified"] = timestamp_to_isoformat_timestr(last_modified)
        entry["last_modifier_email"] = latest_contributor
        entry["last_modifier_name"] = email2nickname(latest_contributor)
        entry["last_modifier_contact_email"] = email2contact_email(latest_contributor)

        try:
            file_size = seafile_api.get_file_size(real_repo_id,
                    repo.version, obj_id)
            entry["size"] = file_size
        except Exception as e:
            logger.error(e)
            entry["size"] = 0

        try:
            file_upload_info = get_file_upload_info(real_repo_id, real_path)
        except Exception as e:
            logger.error(e)
            file_upload_info = None

        uploader = file_upload_info.user if file_upload_info else ''
        upload_time = file_upload_info.upload_time if file_upload_info else ''

        entry["uploader_email"] = uploader
        entry["uploader_name"] = email2nickname(uploader)
        entry["uploader_contact_email"] = email2contact_email(uploader)
        entry["upload_time"] = datetime_to_isoformat_timestr(upload_time)

        return Response(entry)
