import hashlib
import json
import logging
import os
import stat
from collections import defaultdict
from datetime import datetime
from threading import Lock
from uuid import uuid4

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


class QueryException(Exception):
    pass


def can_set_ex_props(repo_id, path):
    return {'can_set': True}  # TODO: need to check


def query_set_ex_props_status(repo_id, path):
    url = SEAF_EVENTS_IO_SERVER_URL.strip('/') + '/query-set-ex-props-status'
    resp = requests.get(url, params={'repo_id': repo_id, 'path': path})
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

        resp_json = can_set_ex_props(repo_id, path)
        if not resp_json.get('can_set', False):
            if resp_json.get('error_type') == 'higher_being_set':
                error_msg = 'Another task is running'
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

        resp_json = can_set_ex_props(repo_id, path)
        if not resp_json.get('can_set', False):
            if resp_json.get('error_type') == 'higher_being_set':
                error_msg = 'Another task is running'
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


class ApplyFolderExtendedPropertiesView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    apply_lock = Lock()
    worker_map = defaultdict(list)

    @classmethod
    def can_set_file_or_folder(cls, repo_id, path):
        pass

    @classmethod
    def can_apply_folder(cls, repo_id, path):
        """
        :return: can_apply -> bool, error_type -> string or None
        """
        for cur_repo_id, paths in cls.worker_map.items():
            if repo_id != cur_repo_id:
                continue
            for cur_path in paths:
                if cur_path.startswith(path):
                    return False, 'sub_folder_applying'
                if path.startswith(cur_path):
                    return False, 'higer_folder_applying'
        return True, None

    def md5_repo_id_parent_path(self, repo_id, parent_path):
        parent_path = parent_path.rstrip('/') if parent_path != '/' else '/'
        return hashlib.md5((repo_id + parent_path).encode('utf-8')).hexdigest()

    def query_fileuuids_map(self, repo_id, file_paths):
        """
        :return: {file_path: fileuuid}
        """
        file_path_2_uuid_map = {}
        no_uuid_file_paths = []
        try:
            # query uuids
            for i in range(0, len(file_paths), self.step):
                parent_path_2_filenames_map = defaultdict(list)
                for file_path in file_paths[i: i+self.step]:
                    parent_path, filename = os.path.split(file_path)
                    parent_path_2_filenames_map[parent_path].append(filename)
                for parent_path, filenames in parent_path_2_filenames_map.items():
                    md5 = self.md5_repo_id_parent_path(repo_id, parent_path)
                    results = FileUUIDMap.objects.filter(repo_id=repo_id, repo_id_parent_path_md5=md5, filename__in=filenames)
                    for uuid_item in results:
                        file_path_2_uuid_map[os.path.join(parent_path, uuid_item.filename)] = uuid_item.uuid.hex
                    ## some filename no uuids
                    for filename in filenames:
                        cur_file_path = os.path.join(parent_path, filename)
                        if cur_file_path not in file_path_2_uuid_map:
                            no_uuid_file_paths.append({'file_path': cur_file_path, 'uuid': uuid4().hex, 'repo_id_parent_path_md5': md5})
            # create uuids
            for i in range(0, len(no_uuid_file_paths), self.step):
                uuid_objs = []
                for j in range(i, min(i+self.step, len(no_uuid_file_paths))):
                    no_uuid_file_path = no_uuid_file_paths[j]
                    kwargs = {
                        'uuid': no_uuid_file_path['uuid'],
                        'repo_id': repo_id,
                        'repo_id_parent_path_md5': no_uuid_file_path['repo_id_parent_path_md5'],
                        'parent_path': os.path.dirname(no_uuid_file_path['file_path']),
                        'filename': os.path.basename(no_uuid_file_path['file_path']),
                        'is_dir': 0
                    }
                    uuid_objs.append(FileUUIDMap(**kwargs))
                FileUUIDMap.objects.bulk_create(uuid_objs)
                for j in range(i, min(i+self.step, len(no_uuid_file_paths))):
                    file_path_2_uuid_map[no_uuid_file_paths[j]['file_path']] = no_uuid_file_paths[j]['uuid']
        except Exception as e:
            logger.exception('query repo: %s some fileuuids error: %s', e)
        return file_path_2_uuid_map

    def query_path_2_row_id_map(self, repo_id, query_list, seatable_api: SeaTableAPI):
        """
        :return: path_2_row_id_map -> {path: row_id}
        """
        path_2_row_id_map = {}
        for i in range(0, len(query_list), self.step):
            paths_str = ', '.join(map(lambda x: f"'{x['path']}'", query_list[i: i+self.step]))
            sql = f"SELECT `_id`, `Path` FROM `{EX_PROPS_TABLE}` WHERE `Repo ID`='{repo_id}' AND `Path` IN ({paths_str})"
            try:
                resp_json = seatable_api.query(sql, convert=True)
                rows = resp_json['results']
            except Exception as e:
                raise QueryException('query repo: %s error: %s' % (repo_id, e))
            path_2_row_id_map.update({row['Path']: row['_id'] for row in rows})
        return path_2_row_id_map

    def query_ex_props_by_path(self, repo_id, path, seatable_api: SeaTableAPI):
        columns_str = ', '.join(map(lambda x: f"`{x}`", EX_EDITABLE_COLUMNS))
        sql = f"SELECT {columns_str} FROM `{EX_PROPS_TABLE}` WHERE `Repo ID` = '{repo_id}' AND `Path` = '{path}'"
        resp_json = seatable_api.query(sql, convert=True)
        if not resp_json['results']:
            return None
        row = resp_json['results'][0]
        return row

    def update_ex_props(self, update_list, ex_props, seatable_api: SeaTableAPI):
        for i in range(0, len(update_list), self.step):
            updates = []
            for j in range(i, min(len(update_list), i+self.step)):
                updates.append({
                    'row_id': update_list[j]['row_id'],
                    'row': ex_props
                })
            try:
                seatable_api.update_rows_by_dtable_db(EX_PROPS_TABLE, updates)
            except Exception as e:
                logger.exception('update table: %s error: %s', EX_PROPS_TABLE, e)

    def insert_ex_props(self, repo_id, insert_list, ex_props, context, seatable_api: SeaTableAPI):
        for i in range(0, len(insert_list), self.step):
            rows = []
            for j in range(i, min(len(insert_list), i+self.step)):
                row = {
                    'Repo ID': repo_id,
                    'File': os.path.basename(insert_list[j]['path']),
                    'UUID': insert_list[j].get('fileuuid'),
                    'Path': insert_list[j]['path'],
                    '创建日期': str(datetime.fromtimestamp(insert_list[j]['mtime'])),
                    '文件负责人': context['文件负责人']
                }
                row.update(ex_props)
                rows.append(row)
            try:
                seatable_api.batch_append_rows(EX_PROPS_TABLE, rows)
            except Exception as e:
                logger.exception('update table: %s error: %s', EX_PROPS_TABLE, e)

    def apply_folder(self, repo_id, folder_path, context, seatable_api: SeaTableAPI, folder_props):
        stack = [folder_path]

        query_list = []  # [{path, type}]
        file_query_list = []  # [path]

        update_list = []  # [{}]
        insert_list = []  # [{}]

        # query folder props
        while stack:
            current_path = stack.pop()
            dirents = seafile_api.list_dir_by_path(repo_id, current_path)
            if not dirents:
                continue
            for dirent in dirents:
                dirent_path = os.path.join(current_path, dirent.obj_name)
                if stat.S_ISDIR(dirent.mode):
                    query_list.append({'path': dirent_path, 'type': 'dir', 'mtime': dirent.mtime})
                    stack.append(dirent_path)
                else:
                    if dirent.obj_id == EMPTY_SHA1:
                        continue
                    query_list.append({'path': dirent_path, 'type': 'file', 'mtime': dirent.mtime})
                    file_query_list.append(dirent_path)
            # query ex-props
            if len(query_list) >= self.list_max:
                file_path_2_uuid_map = self.query_fileuuids_map(repo_id, file_query_list)
                path_2_row_id_map = self.query_path_2_row_id_map(repo_id, query_list, seatable_api)
                for query_item in query_list:
                    if query_item['path'] in path_2_row_id_map:
                        query_item['row_id'] = path_2_row_id_map.get(query_item['path'])
                        update_list.append(query_item)
                    else:
                        if query_item['type'] == 'file':
                            query_item['fileuuid'] = file_path_2_uuid_map.get(query_item['path'])
                        insert_list.append(query_item)
                query_list = file_query_list = []
            # update ex-props
            if len(update_list) >= self.list_max:
                self.update_ex_props(update_list, folder_props, seatable_api)
                update_list = []
            # insert ex-props
            if len(insert_list) >= self.list_max:
                self.insert_ex_props(repo_id, insert_list, folder_props, context, seatable_api)
                insert_list = []

        # handle query/update/insert left
        file_path_2_uuid_map = self.query_fileuuids_map(repo_id, file_query_list)
        path_2_row_id_map = self.query_path_2_row_id_map(repo_id, query_list, seatable_api)
        for query_item in query_list:
            if query_item['path'] in path_2_row_id_map:
                query_item['row_id'] = path_2_row_id_map.get(query_item['path'])
                update_list.append(query_item)
            else:
                if query_item['type'] == 'file':
                    query_item['fileuuid'] = file_path_2_uuid_map.get(query_item['path'])
                insert_list.append(query_item)
        self.update_ex_props(update_list, folder_props, seatable_api)
        self.insert_ex_props(repo_id, insert_list, folder_props, context, seatable_api)

    def post(self, request, repo_id):
        if not all((DTABLE_WEB_SERVER, SEATABLE_EX_PROPS_BASE_API_TOKEN, EX_PROPS_TABLE)):
            return api_error(status.HTTP_403_FORBIDDEN, 'Feature not enabled')
        # arguments check
        path = request.data.get('path')
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'path invalid')
        path = normalize_file_path(path)
        parent_dir = os.path.dirname(path)

        dirent = seafile_api.get_dirent_by_path(repo_id, path)
        if not dirent:
            return api_error(status.HTTP_404_NOT_FOUND, 'Folder %s not found' % path)
        if not stat.S_ISDIR(dirent.mode):
            return api_error(status.HTTP_400_BAD_REQUEST, '%s is not a folder' % path)

        # permission check
        if not parse_repo_perm(check_folder_permission(request, repo_id, parent_dir)).can_edit_on_web:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # request props from seatable
        try:
            seatable_api = SeaTableAPI(SEATABLE_EX_PROPS_BASE_API_TOKEN, DTABLE_WEB_SERVER)
        except:
            logger.error('server: %s token: %s seatable-api fail', DTABLE_WEB_SERVER, SEATABLE_EX_PROPS_BASE_API_TOKEN)
            return api_error(status.HTTP_400_BAD_REQUEST, 'Props table invalid')

        folder_props = self.query_ex_props_by_path(repo_id, path, seatable_api)
        if not folder_props:
            return api_error(status.HTTP_400_BAD_REQUEST, 'The folder is not be set extended properties')

        # with lock check repo and path can apply props
        with self.apply_lock:
            can_apply, _ = self.can_apply_folder(repo_id, path)
            if not can_apply:
                return api_error(status.HTTP_400_BAD_REQUEST, 'Another task is running')
            # with lock add repo and path to apply task map
            self.worker_map[repo_id].append(path)
        # apply props
        context = {'文件负责人': request.user.username}
        try:
            self.apply_folder(repo_id, path, context, seatable_api, folder_props)
        except QueryException as e:
            logger.exception('apply folder: %s ex-props query dtable-db error: %s', path, e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        except Exception as e:
            logger.exception('apply folder: %s ex-props error: %s', path, e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        finally:
            # remove path from worker
            with self.apply_lock:
                for repo_id, paths in self.worker_map.items():
                    if repo_id != repo_id:
                        continue
                    self.worker_map[repo_id] = [cur_path for cur_path in paths if cur_path != path]
                if not self.worker_map[repo_id]:
                    del self.worker_map[repo_id]
        return Response({'success': True})
