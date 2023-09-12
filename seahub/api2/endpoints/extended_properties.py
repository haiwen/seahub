import json
import logging
import os
import stat
from datetime import datetime

import requests
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.settings import DTABLE_WEB_SERVER, SEATABLE_EX_PROPS_BASE_API_TOKEN, \
    EX_PROPS_TABLE, EX_EDITABLE_COLUMNS, SEAF_EVENTS_IO_SERVER_URL
from seahub.tags.models import FileUUIDMap
from seahub.utils import normalize_file_path, EMPTY_SHA1
from seahub.utils.repo import parse_repo_perm
from seahub.utils.seatable_api import SeaTableAPI
from seahub.views import check_folder_permission

logger = logging.getLogger(__name__)


def request_can_set_ex_props(repo_id, path):
    url = SEAF_EVENTS_IO_SERVER_URL.strip('/') + '/can-set-ex-props'
    resp = requests.post(url, json={'repo_id': repo_id, 'path': path})
    return resp.json()


def add_set_folder_ex_props_task(repo_id, path):
    url = SEAF_EVENTS_IO_SERVER_URL.strip('/') + '/set-folder-ex-props'
    resp = requests.post(url, json={'repo_id': repo_id, 'path': path})
    return resp.json()


def check_table(seatable_api: SeaTableAPI):
    """check EX_PROPS_TABLE is invalid or not

    :return: error_msg -> str or None
    """
    table = seatable_api.get_table_by_name(EX_PROPS_TABLE)
    if not table:
        return 'Table %s not found' % EX_PROPS_TABLE
    return None


class ExtendedPropertiesView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, repo_id):
        if not all((DTABLE_WEB_SERVER, SEATABLE_EX_PROPS_BASE_API_TOKEN, EX_PROPS_TABLE)):
            return api_error(status.HTTP_403_FORBIDDEN, 'Feature not enabled')
        # arguments check
        path = request.data.get('path')
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'path invalid')
        path = normalize_file_path(path)
        parent_dir = os.path.dirname(path)
        dirent_name = os.path.basename(path)
        props_data_str = request.data.get('props_data')
        if not props_data_str or not isinstance(props_data_str, str):
            return api_error(status.HTTP_400_BAD_REQUEST, 'props_data invalid')

        try:
            props_data = json.loads(props_data_str)
        except:
            return api_error(status.HTTP_400_BAD_REQUEST, 'props_data invalid')

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found')
        dirent = seafile_api.get_dirent_by_path(repo_id, path)
        if not dirent:
            return api_error(status.HTTP_404_NOT_FOUND, 'File or folder %s not found' % path)
        if not stat.S_ISDIR(dirent.mode) and dirent.obj_id == EMPTY_SHA1:
            return api_error(status.HTTP_400_BAD_REQUEST, 'File or folder %s is empty' % path)

        # permission check
        if not parse_repo_perm(check_folder_permission(request, repo_id, parent_dir)).can_edit_on_web:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        resp_json = request_can_set_ex_props(repo_id, path)
        if not resp_json.get('can_set', False):
            if resp_json.get('error_type') == 'higher_being_set':
                error_msg = 'A directory at the higher level is being set'
            else:
                error_msg = 'Please try again later'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # check base
        try:
            seatable_api = SeaTableAPI(SEATABLE_EX_PROPS_BASE_API_TOKEN, DTABLE_WEB_SERVER)
        except:
            logger.error('server: %s token: %s seatable-api fail', DTABLE_WEB_SERVER, SEATABLE_EX_PROPS_BASE_API_TOKEN)
            return api_error(status.HTTP_400_BAD_REQUEST, 'Props table invalid')
        ## props table
        try:
            error_msg = check_table(seatable_api)
        except Exception as e:
            logger.exception('check ex-props table %s error: %s', EX_PROPS_TABLE, e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        if error_msg:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Props table invalid: %s' % error_msg)
        ## check existed props row
        file_uuid = None
        if not stat.S_ISDIR(dirent.mode):
            file_uuid = FileUUIDMap.objects.get_or_create_fileuuidmap(repo_id, parent_dir, dirent_name, False).uuid.hex
        sql = f"SELECT COUNT(1) as `count` FROM `{EX_PROPS_TABLE}` WHERE `Repo ID`='{repo_id}' AND `Path`='{path}'"
        result = seatable_api.query(sql)
        count = result['results'][0]['count']
        if count > 0:
            return api_error(status.HTTP_400_BAD_REQUEST, 'The props of the file exists')
        ## append props row
        props_data = {column_name: value for column_name, value in props_data.items() if column_name in EX_EDITABLE_COLUMNS}
        props_data.update({
            'Repo ID': repo_id,
            'File': dirent_name,
            'Path': path,
            'UUID': file_uuid,
            '创建日期': str(datetime.fromtimestamp(dirent.mtime)),
            '文件负责人': email2nickname(request.user.username)
        })
        try:
            seatable_api.append_row(EX_PROPS_TABLE, props_data)
        except Exception as e:
            logger.error('update props table error: %s', e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        ## query
        sql = f"SELECT * FROM {EX_PROPS_TABLE} WHERE `Repo ID`='{repo_id}' AND `Path`='{path}'"
        try:
            result = seatable_api.query(sql)
        except Exception as e:
            logger.exception('query sql: %s error: %s', sql, e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        rows = result.get('results')
        row = rows[0] if rows else {}
        return Response({
            'row': row,
            'metadata': result['metadata'],
            'editable_columns': EX_EDITABLE_COLUMNS
        })

    def get(self, request, repo_id):
        if not all((DTABLE_WEB_SERVER, SEATABLE_EX_PROPS_BASE_API_TOKEN, EX_PROPS_TABLE)):
            return api_error(status.HTTP_403_FORBIDDEN, 'Feature not enabled')
        # arguments check
        path = request.GET.get('path')
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'path invalid')
        path = normalize_file_path(path)
        parent_dir = os.path.dirname(path)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found')
        dirent = seafile_api.get_dirent_by_path(repo_id, path)
        if not dirent:
            return api_error(status.HTTP_404_NOT_FOUND, 'File or folder %s not found' % path)

        # permission check
        if not parse_repo_perm(check_folder_permission(request, repo_id, parent_dir)).can_edit_on_web:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # check base
        try:
            seatable_api = SeaTableAPI(SEATABLE_EX_PROPS_BASE_API_TOKEN, DTABLE_WEB_SERVER)
        except:
            logger.error('server: %s token: %s seatable-api fail', DTABLE_WEB_SERVER, SEATABLE_EX_PROPS_BASE_API_TOKEN)
            return api_error(status.HTTP_400_BAD_REQUEST, 'Props table invalid')
        ## props table
        try:
            error_msg = check_table(seatable_api)
        except Exception as e:
            logger.exception('check ex-props table %s error: %s', EX_PROPS_TABLE, e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        if error_msg:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Props table invalid: %s' % error_msg)
        ## query
        dirent_name = os.path.basename(path)
        file_uuid = None
        if not stat.S_ISDIR(dirent.mode):
            file_uuid = FileUUIDMap.objects.get_or_create_fileuuidmap(repo_id, parent_dir, dirent_name, False).uuid.hex
        sql = f"SELECT * FROM `{EX_PROPS_TABLE}` WHERE `Repo ID`='{repo_id}' AND `Path`='{path}'"
        try:
            result = seatable_api.query(sql)
        except Exception as e:
            logger.exception('query sql: %s error: %s', sql, e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        rows = result.get('results')
        if rows:
            row = rows[0]
        else:
            row = {
                'Repo ID': repo_id,
                'File': dirent_name,
                'Path': path,
                'UUID': file_uuid
            }
            for name in ['Repo ID', 'File', 'Path', 'UUID']:
                for column in result['metadata']:
                    if name == column['name']:
                        row[column['key']] = row[name]
                        row.pop(name, None)
                        break
        return Response({
            'row': row,
            'metadata': result['metadata'],
            'editable_columns': EX_EDITABLE_COLUMNS
        })

    def put(self, request, repo_id):
        if not all((DTABLE_WEB_SERVER, SEATABLE_EX_PROPS_BASE_API_TOKEN, EX_PROPS_TABLE)):
            return api_error(status.HTTP_403_FORBIDDEN, 'Feature not enabled')
        # arguments check
        path = request.data.get('path')
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'path invalid')
        path = normalize_file_path(path)
        parent_dir = os.path.dirname(path)
        props_data_str = request.data.get('props_data')
        if not props_data_str or not isinstance(props_data_str, str):
            return api_error(status.HTTP_400_BAD_REQUEST, 'props_data invalid')

        try:
            props_data = json.loads(props_data_str)
        except:
            return api_error(status.HTTP_400_BAD_REQUEST, 'props_data invalid')

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found')
        dirent = seafile_api.get_dirent_by_path(repo_id, path)
        if not dirent:
            return api_error(status.HTTP_404_NOT_FOUND, 'File or folder %s not found' % path)

        # permission check
        if not parse_repo_perm(check_folder_permission(request, repo_id, parent_dir)).can_edit_on_web:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        resp_json = request_can_set_ex_props(repo_id, path)
        if not resp_json.get('can_set', False):
            if resp_json.get('error_type') == 'higher_being_set':
                error_msg = 'A directory at the higher level is being set'
            else:
                error_msg = 'Please try again later'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # check base
        try:
            seatable_api = SeaTableAPI(SEATABLE_EX_PROPS_BASE_API_TOKEN, DTABLE_WEB_SERVER)
        except:
            logger.error('server: %s token: %s seatable-api fail', DTABLE_WEB_SERVER, SEATABLE_EX_PROPS_BASE_API_TOKEN)
            return api_error(status.HTTP_400_BAD_REQUEST, 'Props table invalid')
        ## props table
        try:
            error_msg = check_table(seatable_api)
        except Exception as e:
            logger.exception('check ex-props table %s error: %s', EX_PROPS_TABLE, e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        if error_msg:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Props table invalid: %s' % error_msg)
        ## check existed props row
        sql = f"SELECT * FROM `{EX_PROPS_TABLE}` WHERE `Repo ID`='{repo_id}' AND `Path`='{path}'"
        result = seatable_api.query(sql)
        results = result['results']
        if not results:
            return api_error(status.HTTP_404_NOT_FOUND, 'The props of the file or folder not found')
        row_id = results[0]['_id']
        ## update props row
        props_data = {col_name: value for col_name, value in props_data.items() if col_name in EX_EDITABLE_COLUMNS}
        try:
            seatable_api.update_row(EX_PROPS_TABLE, row_id, props_data)
        except Exception as e:
            logger.error('update props table error: %s', e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        ## query
        sql = f"SELECT * FROM `{EX_PROPS_TABLE}` WHERE `Repo ID`='{repo_id}' AND `Path`='{path}'"
        try:
            result = seatable_api.query(sql)
        except Exception as e:
            logger.exception('query sql: %s error: %s', sql, e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        rows = result.get('results')
        row = rows[0] if rows else {}
        return Response({
            'row': row,
            'metadata': result['metadata'],
            'editable_columns': EX_EDITABLE_COLUMNS
        })

    def delete(self, request, repo_id):
        if not all((DTABLE_WEB_SERVER, SEATABLE_EX_PROPS_BASE_API_TOKEN, EX_PROPS_TABLE)):
            return api_error(status.HTTP_403_FORBIDDEN, 'Feature not enabled')
        # arguments check
        path = request.GET.get('path')
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'path invalid')
        path = normalize_file_path(path)
        parent_dir = os.path.dirname(path)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found')
        dirent = seafile_api.get_dirent_by_path(repo_id, path)
        if not dirent:
            return api_error(status.HTTP_404_NOT_FOUND, 'File or folder %s not found' % path)

        # permission check
        if not parse_repo_perm(check_folder_permission(request, repo_id, parent_dir)).can_edit_on_web:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # check base
        try:
            seatable_api = SeaTableAPI(SEATABLE_EX_PROPS_BASE_API_TOKEN, DTABLE_WEB_SERVER)
        except:
            logger.error('server: %s token: %s seatable-api fail', DTABLE_WEB_SERVER, SEATABLE_EX_PROPS_BASE_API_TOKEN)
            return api_error(status.HTTP_400_BAD_REQUEST, 'Props table invalid')
        ## props table
        try:
            error_msg = check_table(seatable_api)
        except Exception as e:
            logger.exception('check ex-props table %s error: %s', EX_PROPS_TABLE, e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        if error_msg:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Props table invalid: %s' % error_msg)
        sql = f"DELETE FROM `{EX_PROPS_TABLE}` WHERE `Repo ID`='{repo_id}' AND `Path`='{path}'"
        try:
            seatable_api.query(sql)
        except Exception as e:
            logger.exception('delete props record error: %s', e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        return Response({'success': True})


class FolderItemsExtendedPropertiesView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, repo_id):
        if not all((DTABLE_WEB_SERVER, SEATABLE_EX_PROPS_BASE_API_TOKEN, EX_PROPS_TABLE)):
            return api_error(status.HTTP_403_FORBIDDEN, 'Feature not enabled')
        # arguments check
        path = request.data.get('path')
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'path invalid')
        path = normalize_file_path(path)

        dirent = seafile_api.get_dirent_by_path(repo_id, path)
        if not dirent:
            return api_error(status.HTTP_404_NOT_FOUND, 'File or folder %s not found' % path)
        if not stat.S_ISDIR(dirent.mode):
            return api_error(status.HTTP_400_BAD_REQUEST, '%s is not a folder' % path)

        # request props from seatable
        try:
            seatable_api = SeaTableAPI(SEATABLE_EX_PROPS_BASE_API_TOKEN, DTABLE_WEB_SERVER)
        except:
            logger.error('server: %s token: %s seatable-api fail', DTABLE_WEB_SERVER, SEATABLE_EX_PROPS_BASE_API_TOKEN)
            return api_error(status.HTTP_400_BAD_REQUEST, 'Props table invalid')

        sql = f"SELECT * FROM `{EX_PROPS_TABLE}` WHERE `Repo ID`='{repo_id}' AND `Path`='{path}'"
        try:
            result = seatable_api.query(sql)
        except Exception as e:
            logger.exception('query sql: %s error: %s', sql, e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        rows = result.get('results')
        if not rows:
            return api_error(status.HTTP_400_BAD_REQUEST, '%s not set extended properties')

        resp_json = add_set_folder_ex_props_task(repo_id, path)

        error_type = resp_json.get('error_type')
        if error_type == 'higher_being_set':
            error_msg = 'A directory at the higher level is being set'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        elif error_type == 'server_busy':
            error_msg = 'Server is busy'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        elif error_type == 'sub_folder_running':
            error_msg = 'A sub directory is being set'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        return Response({'success': True})
