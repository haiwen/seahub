# Copyright (c) 2012-2016 Seafile Ltd.
import stat
import logging
import os
from datetime import datetime

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error
from seahub.base.models import FileTrash

from seahub.signals import clean_up_repo_trash
from seahub.utils import get_trash_records, is_org_context
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.utils.repo import get_repo_owner, is_repo_admin
from seahub.views import check_folder_permission
from seahub.group.utils import is_group_admin
from seahub.api2.endpoints.group_owned_libraries import get_group_id_by_repo_owner
from seahub.organizations.models import OrgAdminSettings, DISABLE_ORG_USER_CLEAN_TRASH

from seaserv import seafile_api
from pysearpc import SearpcError
from constance import config

logger = logging.getLogger(__name__)
SHOW_REPO_TRASH_DAYS = 90

class RepoTrash(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get_item_info(self, trash_item):

        item_info = {
            'parent_dir': trash_item.basedir,
            'obj_name': trash_item.obj_name,
            'deleted_time': timestamp_to_isoformat_timestr(trash_item.delete_time),
            'scan_stat': trash_item.scan_stat,
            'commit_id': trash_item.commit_id,
        }

        if stat.S_ISDIR(trash_item.mode):
            is_dir = True
        else:
            is_dir = False

        item_info['is_dir'] = is_dir
        item_info['size'] = trash_item.file_size if not is_dir else ''
        item_info['obj_id'] = trash_item.obj_id if not is_dir else ''

        return item_info

    def get(self, request, repo_id, format=None):
        """ Return deleted files/dirs of a repo/folder

        Permission checking:
        1. all authenticated user can perform this action.
        """

        # argument check
        path = request.GET.get('path', '/')

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            dir_id = seafile_api.get_dir_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not dir_id:
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if check_folder_permission(request, repo_id, path) is None:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            show_days = int(request.GET.get('show_days', '0'))
        except ValueError:
            show_days = 0

        if show_days < 0:
            error_msg = 'show_days invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        scan_stat = request.GET.get('scan_stat', None)
        try:
            # a list will be returned, with at least 1 item in it
            # the last item is not a deleted entry, and it contains an attribute named 'scan_stat'
            deleted_entries = seafile_api.get_deleted(repo_id, show_days, path, scan_stat)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        scan_stat = deleted_entries[-1].scan_stat
        more = True if scan_stat is not None else False

        items = []
        if len(deleted_entries) > 1:
            entries_without_scan_stat = deleted_entries[0:-1]

            # sort entry by delete time
            entries_without_scan_stat.sort(
                key=lambda x: x.delete_time, reverse=True)

            for item in entries_without_scan_stat:
                item_info = self.get_item_info(item)
                items.append(item_info)

        result = {
            'data': items,
            'more': more,
            'scan_stat': scan_stat,
        }

        return Response(result)

    def post(self, request, repo_id, format=None):
        """ Return deleted files/dirs of a repo/folder

        Permission checking:
        1. all authenticated user can perform this action.
        """

        # argument check
        path = request.data.get('path', '/')

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            dir_id = seafile_api.get_dir_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not dir_id:
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if check_folder_permission(request, repo_id, path) is None:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            show_days = int(request.data.get('show_days', '0'))
        except ValueError:
            show_days = 0

        if show_days < 0:
            error_msg = 'show_days invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        scan_stat = request.data.get('scan_stat', None)
        try:
            # a list will be returned, with at least 1 item in it
            # the last item is not a deleted entry, and it contains an attribute named 'scan_stat'
            deleted_entries = seafile_api.get_deleted(repo_id, show_days, path, scan_stat)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        scan_stat = deleted_entries[-1].scan_stat
        more = True if scan_stat is not None else False

        items = []
        if len(deleted_entries) > 1:
            entries_without_scan_stat = deleted_entries[0:-1]

            # sort entry by delete time
            entries_without_scan_stat.sort(
                key=lambda x: x.delete_time, reverse=True)

            for item in entries_without_scan_stat:
                item_info = self.get_item_info(item)
                items.append(item_info)

        result = {
            'data': items,
            'more': more,
            'scan_stat': scan_stat,
        }

        return Response(result)

    def delete(self, request, repo_id, format=None):
        """ Clean library's trash.

        Permission checking:
        1. repo owner can perform this action.
        2. is group admin.
        """

        # argument check
        try:
            keep_days = int(request.data.get('keep_days', 0))
        except ValueError:
            error_msg = 'keep_days invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        repo_owner = get_repo_owner(request, repo_id)
        if not config.ENABLE_USER_CLEAN_TRASH:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not is_repo_admin(username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if is_org_context(request):
            org_id = request.user.org.org_id
            if org_id and org_id > 0:
                disable_clean_trash = OrgAdminSettings.objects.filter(org_id=org_id, key=DISABLE_ORG_USER_CLEAN_TRASH).first()
                if (disable_clean_trash is not None) and int(disable_clean_trash.value):
                    error_msg = 'Permission denied.'
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        try:
            seafile_api.clean_up_repo_history(repo_id, keep_days)
            org_id = None if not request.user.org else request.user.org.org_id
            clean_up_repo_trash.send(sender=None, org_id=org_id,
                                     operator=username, repo_id=repo_id, repo_name=repo.name,
                                     repo_owner=repo_owner, days=keep_days)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class RepoTrashRevertDirents(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def post(self, request, repo_id):
        """ Revert deleted files/dirs.
        """

        # argument check
        path_list = request.data.getlist('path', [])
        if not path_list:
            error_msg = 'path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        commit_id = request.data.get('commit_id', '')
        if not commit_id:
            error_msg = 'commit_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if check_folder_permission(request, repo_id, '/') != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        result = {}
        result['failed'] = []
        result['success'] = []
        username = request.user.username
        for path in path_list:
            try:
                if seafile_api.get_dir_id_by_commit_and_path(repo_id, commit_id, path):
                    seafile_api.revert_dir(repo_id, commit_id, path, username)
                    result['success'].append({'path': path, 'is_dir': True})
                elif seafile_api.get_file_id_by_commit_and_path(repo_id, commit_id, path):
                    seafile_api.revert_file(repo_id, commit_id, path, username)
                    result['success'].append({'path': path, 'is_dir': False})
                else:
                    result['failed'].append({
                        'path': path,
                        'error_msg': f'Dirent {path} not found.'
                    })
            except Exception as e:
                result['failed'].append({
                    'path': path,
                    'error_msg': str(e)
                })

        return Response(result)


class RepoTrash2(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get_item_info(self, trash_item):

        item_info = {
            'parent_dir': '/' if trash_item.path == '/' else trash_item.path,
            'obj_name': trash_item.obj_name,
            'deleted_time': timestamp_to_isoformat_timestr(int(trash_item.delete_time.timestamp())),
            'commit_id': trash_item.commit_id,
        }

        if trash_item.obj_type == 'dir':
            is_dir = True
        else:
            is_dir = False

        item_info['is_dir'] = is_dir
        item_info['size'] = trash_item.size if not is_dir else ''
        item_info['obj_id'] = trash_item.obj_id if not is_dir else ''

        return item_info

    def get(self, request, repo_id):
        """ Return deleted files/dirs of a repo/folder

        Permission checking:
        1. all authenticated user can perform this action.
        """

        path = '/'
        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '100'))
        except ValueError:
            current_page = 1
            per_page = 100

        start = (current_page - 1) * per_page
        end = start + per_page
        try:
            dir_id = seafile_api.get_dir_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not dir_id:
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if check_folder_permission(request, repo_id, path) is None:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        # keep_days
        # -1 all history
        # 0 no history
        # n n-days history
        keep_days = seafile_api.get_repo_history_limit(repo_id)
        
        if keep_days == 0:
            result = {
                'items': [],
                'total_count': 0,
                'can_search': False
            }
            return Response(result)
        
        # pre-filter by repo history
        
        elif keep_days == -1:
            qset = FileTrash.objects.by_repo_id(repo_id)
            
        else:
            qset = FileTrash.objects.by_repo_id(repo_id).by_history_limit(keep_days)
        
        deleted_entries = qset[start:end]
        total_count = qset.count()
            
        
        items = []
        if len(deleted_entries) >= 1:
            for item in deleted_entries:
                item_info = self.get_item_info(item)
                items.append(item_info)

        result = {
            'items': items,
            'total_count': total_count,
            'can_search': True
        }

        return Response(result)

class SearchRepoTrash2(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get_item_info(self, trash_item):

        item_info = {
            'parent_dir': '/' if trash_item.path == '/' else trash_item.path,
            'obj_name': trash_item.obj_name,
            'deleted_time': timestamp_to_isoformat_timestr(int(trash_item.delete_time.timestamp())),
            'commit_id': trash_item.commit_id,
        }

        if trash_item.obj_type == 'dir':
            is_dir = True
        else:
            is_dir = False

        item_info['is_dir'] = is_dir
        item_info['size'] = trash_item.size if not is_dir else ''
        item_info['obj_id'] = trash_item.obj_id if not is_dir else ''

        return item_info

    def get(self, request, repo_id):
        """ Return deleted files/dirs of a repo/folder

        Permission checking:
        1. all authenticated user can perform this action.
        """

        path = '/'
        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        q = request.GET.get('q', None)
        
        op_users = request.GET.get('op_user', '').split(',') if request.GET.get('op_user') else None
        op_users = [u for u in op_users if u] if op_users else None

        time_from = request.GET.get('time_from')
        time_to = request.GET.get('time_to')
        try:
            time_from = int(time_from) if time_from else None
            time_to = int(time_to) if time_to else None
        except (TypeError, ValueError):
            time_from = None
            time_to = None

        input_fexts = request.GET.get('input_fexts', None)
        if input_fexts:
            suffixes = input_fexts.split(',')
        else:
            suffixes = None
        suffixes = [s for s in suffixes if s] if suffixes else None

        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '20'))
        except ValueError:
            current_page = 1
            per_page = 20
        
        start = (current_page - 1) * per_page
        end = start + per_page
        try:
            dir_id = seafile_api.get_dir_id_by_path(repo_id, path)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not dir_id:
            error_msg = 'Folder %s not found.' % path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if check_folder_permission(request, repo_id, path) is None:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        keep_days = seafile_api.get_repo_history_limit(repo_id)

        if keep_days == 0:
            result = {
                'items': [],
                'total_count': 0
            }
            return Response(result)
        
        # pre-filter by repo history
        elif keep_days == -1:
            qset = FileTrash.objects.by_repo_id(repo_id)
        
        else:
            qset = FileTrash.objects.by_repo_id(repo_id).by_history_limit(keep_days)
        
        if q:
            qset = qset.by_keywords(q)
        if op_users:
            qset = qset.by_users(op_users)
        if time_from and time_to:
            qset = qset.by_time_range(time_from, time_to)
        if suffixes:
            qset = qset.by_suffixes(suffixes)
            
        deleted_entries = qset[start:end]
        total_count = qset.count()
        
        items = []
        if len(deleted_entries) >= 1:
            for item in deleted_entries:
                item_info = self.get_item_info(item)
                items.append(item_info)

        result = {
            'items': items,
            'total_count': total_count
        }

        return Response(result)