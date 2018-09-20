# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error
from seahub.utils import get_file_history
from seahub.utils.timeutils import utc_datetime_to_isoformat_timestr, timestamp_to_isoformat_timestr
from seahub.utils.file_revisions import get_file_revisions_within_limit
from seahub.views import check_folder_permission
from seahub.avatar.templatetags.avatar_tags import api_avatar_url
from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email

logger = logging.getLogger(__name__)

def get_new_file_history_info(ent, avatar_size):

    info = {}

    creator_name = ent.op_user
    url, is_default, date_uploaded = api_avatar_url(creator_name, avatar_size)

    info['creator_avatar_url'] = url
    info['creator_email'] = creator_name
    info['creator_name'] = email2nickname(creator_name)
    info['creator_contact_email'] = email2contact_email(creator_name)
    info['op_type'] = ent.op_type
    info['ctime'] = utc_datetime_to_isoformat_timestr(ent.timestamp)
    info['commit_id'] = ent.commit_id
    info['size'] = ent.size
    info['rev_file_id'] = ent.file_id
    info['old_path'] = ent.old_path if hasattr(ent, 'old_path') else ''
    info['path'] = ent.path

    return info

def get_file_history_info(commit, avatar_size):

    info = {}

    creator_name = commit.creator_name
    url, is_default, date_uploaded = api_avatar_url(creator_name, avatar_size)

    info['creator_avatar_url'] = url
    info['creator_email'] = creator_name
    info['creator_name'] = email2nickname(creator_name)
    info['creator_contact_email'] = email2contact_email(creator_name)
    info['ctime'] = timestamp_to_isoformat_timestr(commit.ctime)
    info['description'] = commit.desc
    info['commit_id'] = commit.id
    info['size'] = commit.rev_file_size
    info['rev_file_id'] = commit.rev_file_id
    info['rev_renamed_old_path'] = commit.rev_renamed_old_path

    return info


class FileHistoryView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id):
        """ Get file history within certain commits.
        Controlled by path(rev_renamed_old_path), commit_id and next_start_commit.
        """
        # argument check
        path = request.GET.get('path', '')
        if not path:
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        commit_id = request.GET.get('commit_id', '')
        if not commit_id:
            commit_id = repo.head_cmmt_id

        try:
            avatar_size = int(request.GET.get('avatar_size', 32))
        except ValueError:
            avatar_size = 32

        # Don't use seafile_api.get_file_id_by_path()
        # if path parameter is `rev_renamed_old_path`.
        # seafile_api.get_file_id_by_path() will return None.
        file_id = seafile_api.get_file_id_by_commit_and_path(repo_id,
                commit_id, path)
        if not file_id:
            error_msg = 'File %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not check_folder_permission(request, repo_id, '/'):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # get file history
        limit = request.GET.get('limit', 50)
        try:
            limit = 50 if int(limit) < 1 else int(limit)
        except ValueError:
            limit = 50

        try:
            file_revisions, next_start_commit = get_file_revisions_within_limit(
                    repo_id, path, commit_id, limit)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        result = []
        for commit in file_revisions:
            info = get_file_history_info(commit, avatar_size)
            info['path'] = path
            result.append(info)

        return Response({
            "data": result,
            "next_start_commit": next_start_commit or False
            })


class NewFileHistoryView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id):
        """ Get file history within certain commits.

        Controlled by path(rev_renamed_old_path), commit_id and next_start_commit.
        """
        # argument check
        path = request.GET.get('path', '')
        if not path:
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        commit_id = repo.head_cmmt_id

        try:
            avatar_size = int(request.GET.get('avatar_size', 32))
            page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '25'))
        except ValueError:
            avatar_size = 32
            page = 1
            per_page = 25

        # Don't use seafile_api.get_file_id_by_path()
        # if path parameter is `rev_renamed_old_path`.
        # seafile_api.get_file_id_by_path() will return None.
        file_id = seafile_api.get_file_id_by_commit_and_path(repo_id,
                commit_id, path)
        if not file_id:
            error_msg = 'File %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not check_folder_permission(request, repo_id, '/'):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        start = (page - 1) * per_page
        count = per_page

        try:
            file_revisions, total_count = get_file_history(repo_id, path, start, count)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        data = [get_new_file_history_info(ent, avatar_size) for ent in file_revisions]
        result = {
            "data": data,
            "page": page,
            "total_count": total_count
            }

        return Response(result)
