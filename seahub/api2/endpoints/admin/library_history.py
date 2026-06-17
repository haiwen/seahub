import logging
import stat

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.utils.translation import gettext as _

from pysearpc import SearpcError
from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email, translate_commit_desc
from seahub.revision_tag.models import RevisionTags
from seahub.settings import ENABLE_REPO_SNAPSHOT_LABEL
from seahub.utils import new_merge_with_no_conflict, normalize_dir_path
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.views import get_diff
from seahub.views.sysadmin import can_view_sys_admin_repo

from constance import config

logger = logging.getLogger(__name__)


def admin_repo_check(request, repo_id):
    if not request.user.admin_permissions.can_manage_library():
        return None, api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

    repo = seafile_api.get_repo(repo_id)
    if not repo:
        error_msg = 'Library %s not found.' % repo_id
        return None, api_error(status.HTTP_404_NOT_FOUND, error_msg)

    return repo, None


class AdminLibraryHistoryLimit(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        repo, error = admin_repo_check(request, repo_id)
        if error:
            return error

        # no settings for virtual repo
        if repo.is_virtual:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            keep_days = seafile_api.get_repo_history_limit(repo_id)
            return Response({'keep_days': keep_days})
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

    def put(self, request, repo_id, format=None):
        repo, error = admin_repo_check(request, repo_id)
        if error:
            return error

        # no settings for virtual repo
        if repo.is_virtual:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # check arg validation
        keep_days = request.data.get('keep_days', None)
        if not keep_days:
            error_msg = 'keep_days invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            keep_days = int(keep_days)
        except ValueError:
            error_msg = 'keep_days invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            # days <= -1, keep full history
            # days = 0, not keep history
            # days > 0, keep a period of days
            res = seafile_api.set_repo_history_limit(repo_id, keep_days)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if res == 0:
            new_limit = seafile_api.get_repo_history_limit(repo_id)
            return Response({'keep_days': new_limit})
        else:
            error_msg = 'Failed to set library history limit.'
            return api_error(status.HTTP_520_OPERATION_FAILED, error_msg)


class AdminLibraryHistory(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle, )

    def get_item_info(self, commit):
        email = getattr(commit, 'creator_name', '')
        return {
            'email': email,
            'name': email2nickname(email),
            'contact_email': email2contact_email(email),
            'time': timestamp_to_isoformat_timestr(commit.ctime),
            'commit_id': commit.id,
            'description': translate_commit_desc(commit.desc),
            'client_version': commit.client_version,
            'device_name': commit.device_name,
            'second_parent_id': commit.second_parent_id,
        }

    def get(self, request, repo_id, format=None):
        repo, error = admin_repo_check(request, repo_id)
        if error:
            return error

        if not can_view_sys_admin_repo(repo):
            error_msg = 'Feature disabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '100'))
        except ValueError:
            page = 1
            per_page = 100

        if page <= 0:
            return api_error(status.HTTP_400_BAD_REQUEST, 'page invalid.')

        if per_page <= 0:
            return api_error(status.HTTP_400_BAD_REQUEST, 'per_page invalid.')

        start = (page - 1) * per_page
        limit = per_page + 1

        try:
            all_commits = seafile_api.get_commit_list(repo_id, start, limit)
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        items = []
        for commit in all_commits[:per_page]:
            if new_merge_with_no_conflict(commit):
                continue
            items.append(self.get_item_info(commit))

        commit_tag_dict = {}
        if ENABLE_REPO_SNAPSHOT_LABEL:
            try:
                revision_tags = RevisionTags.objects.filter(repo_id=repo_id)
            except Exception as e:
                logger.error(e)
                revision_tags = []

            for tag in revision_tags:
                commit_tag_dict.setdefault(tag.revision_id, []).append(tag.tag.name)

        for item in items:
            item['tags'] = commit_tag_dict.get(item['commit_id'], [])

        return Response({
            'data': items,
            'more': len(all_commits) == per_page + 1,
        })


class AdminLibraryHistoryChanges(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id, format=None):
        repo, error = admin_repo_check(request, repo_id)
        if error:
            return error

        if not can_view_sys_admin_repo(repo):
            error_msg = 'Feature disabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        commit_id = request.GET.get('commit_id', '')
        if not commit_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Argument missing')

        changes = get_diff(repo_id, '', commit_id)
        commit = seafile_api.get_commit(repo.id, repo.version, commit_id)
        if not commit:
            return api_error(status.HTTP_404_NOT_FOUND, 'Commit not found.')

        if commit.parent_id is None:
            changes['cmt_desc'] = repo.desc
        elif commit.second_parent_id is None:
            if commit.desc.startswith('Changed library'):
                changes['cmt_desc'] = _('Changed library name or description')
        else:
            changes['cmt_desc'] = _('No conflict in the merge.')

        changes['date_time'] = timestamp_to_isoformat_timestr(commit.ctime)
        return Response(changes)


class AdminLibraryCommitDir(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAdminUser, )
    throttle_classes = (UserRateThrottle, )

    def _get_item_info(self, dirent, path):
        entry = {
            'parent_dir': path,
            'obj_id': dirent.obj_id,
            'name': dirent.obj_name,
        }
        if stat.S_ISDIR(dirent.mode):
            entry['type'] = 'dir'
        else:
            entry['type'] = 'file'
            entry['size'] = dirent.size
        return entry

    def get(self, request, repo_id, commit_id, format=None):
        repo, error = admin_repo_check(request, repo_id)
        if error:
            return error

        if not can_view_sys_admin_repo(repo):
            error_msg = 'Feature disabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        path = normalize_dir_path(request.GET.get('path', '/'))

        commit = seafile_api.get_commit(repo.id, repo.version, commit_id)
        if not commit:
            return api_error(status.HTTP_404_NOT_FOUND, 'Commit %s not found.' % commit_id)

        dir_id = seafile_api.get_dir_id_by_commit_and_path(repo_id, commit_id, path)
        if not dir_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'Folder %s not found.' % path)

        dir_entries = seafile_api.list_dir_by_dir_id(repo_id, dir_id)
        items = [self._get_item_info(dirent, path) for dirent in dir_entries]
        return Response({'dirent_list': items})
