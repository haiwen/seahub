import logging
import os

from django.utils import timezone
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
from seahub.settings import DTABLE_WEB_SERVER, SEATABLE_LEDGER_BASE_API_TOKEN, LEDGER_TABLE_NAME
from seahub.tags.models import FileUUIDMap
from seahub.utils import normalize_file_path, EMPTY_SHA1
from seahub.utils.repo import parse_repo_perm
from seahub.utils.seatable_api import SeaTableAPI, ColumnTypes
from seahub.views import check_folder_permission

logger = logging.getLogger(__name__)

LEDGER_COLUMNS = [
    {'column_name': 'Repo ID', 'column_type': ColumnTypes.TEXT},
    {'column_name': '文件名', 'column_type': ColumnTypes.TEXT},
    {'column_name': 'UUID', 'column_type': ColumnTypes.TEXT},
    {'column_name': '文件路径', 'column_type': ColumnTypes.TEXT},
    {'column_name': '文件大分类', 'column_type': ColumnTypes.SINGLE_SELECT},
    {'column_name': '文件中分类', 'column_type': ColumnTypes.SINGLE_SELECT},
    {'column_name': '文件小分类', 'column_type': ColumnTypes.SINGLE_SELECT},
    {'column_name': '文件负责人', 'column_type': ColumnTypes.TEXT},
    {'column_name': '密级', 'column_type': ColumnTypes.SINGLE_SELECT},
    {'column_name': '保密期限', 'column_type': ColumnTypes.NUMBER},
    {'column_name': '创建日期', 'column_type': ColumnTypes.DATE, "column_data": {"format": "YYYY-MM-DD HH:mm"}},
    {'column_name': '废弃日期', 'column_type': ColumnTypes.FORMULA, 'column_data': {'formula': "dateAdd({创建日期}, {保密期限}, 'days')"}}
]

LEDGER_UPDATABLE_COLUMNS = ['文件大分类', '文件中分类', '文件小分类', '密级', '保密期限']


def check_table(seatable_api: SeaTableAPI):
    """check LEDGER_TABLE is invalid or not

    :return: error_msg -> str or None
    """
    table = seatable_api.get_table_by_name(LEDGER_TABLE_NAME)
    if not table:
        seatable_api.add_table(LEDGER_TABLE_NAME, columns=LEDGER_COLUMNS)
        return None
    for ledger_col in LEDGER_COLUMNS:
        flag = False
        for table_col in table['columns']:
            if ledger_col['column_name'] != table_col['name']:
                continue
            flag = True
            if ledger_col['column_type'] != table_col['type']:
                return f"Column {table_col['name']} type invalid"
            break
        if not flag:
            return f"Column {ledger_col['column_name']} not found"
    return None


class FileLedgersView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, repo_id):
        if not all((DTABLE_WEB_SERVER, SEATABLE_LEDGER_BASE_API_TOKEN, LEDGER_TABLE_NAME)):
            return api_error(status.HTTP_403_FORBIDDEN, 'Feature not enabled')
        # arguments check
        path = request.data.get('path')
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'path invalid')
        path = normalize_file_path(path)
        parent_dir = os.path.dirname(path)
        file_name = os.path.basename(path)
        ledger_data = request.data.get('ledger_data')
        if not ledger_data or not isinstance(ledger_data, dict):
            return api_error(status.HTTP_400_BAD_REQUEST, 'ledger_data invalid')

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found')
        file_id = seafile_api.get_file_id_by_path(repo_id, path)
        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'File %s not found.' % path)
        if file_id == EMPTY_SHA1:
            return api_error(status.HTTP_400_BAD_REQUEST, 'File %s is empty' % path)

        # permission check
        if not parse_repo_perm(check_folder_permission(request, repo_id, parent_dir)).can_edit_on_web:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # check base
        try:
            seatable_api = SeaTableAPI(SEATABLE_LEDGER_BASE_API_TOKEN, DTABLE_WEB_SERVER)
        except:
            logger.error('server: %s token: %s seatable-api fail', DTABLE_WEB_SERVER, SEATABLE_LEDGER_BASE_API_TOKEN)
            return api_error(status.HTTP_400_BAD_REQUEST, 'Ledger base invalid')
        ## ledger table
        try:
            error_msg = check_table(seatable_api)
        except Exception as e:
            logger.exception('fix ledger table %s error: %s', LEDGER_TABLE_NAME, e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        if error_msg:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Ledger table invalid: %s' % error_msg)
        ## check existed ledger row
        sql = f"SELECT COUNT(1) as `count` FROM `{LEDGER_TABLE_NAME}` WHERE `Repo ID`='{repo_id}' AND `文件路径`='{path}'"
        result = seatable_api.query(sql)
        count = result['results'][0]['count']
        if count > 0:
            return api_error(status.HTTP_400_BAD_REQUEST, 'The ledger of the file exists')
        ## append ledger row
        file_uuid = FileUUIDMap.objects.get_or_create_fileuuidmap(repo_id, parent_dir, file_name, False).uuid.hex
        ledger_data.update({
            'Repo ID': repo_id,
            '文件名': file_name,
            '文件路径': path,
            'UUID': file_uuid,
            '文件负责人': email2nickname(request.user.username),
            '创建日期': str(timezone.now())
        })
        try:
            seatable_api.append_row(LEDGER_TABLE_NAME, ledger_data)
        except Exception as e:
            logger.error('update ledger table error: %s', e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'success': True})

    def get(self, request, repo_id):
        if not all((DTABLE_WEB_SERVER, SEATABLE_LEDGER_BASE_API_TOKEN, LEDGER_TABLE_NAME)):
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
        file_id = seafile_api.get_file_id_by_path(repo_id, path)
        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'File %s not found.' % path)

        # permission check
        if not parse_repo_perm(check_folder_permission(request, repo_id, parent_dir)).can_edit_on_web:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # check base
        try:
            seatable_api = SeaTableAPI(SEATABLE_LEDGER_BASE_API_TOKEN, DTABLE_WEB_SERVER)
        except:
            logger.error('server: %s token: %s seatable-api fail', DTABLE_WEB_SERVER, SEATABLE_LEDGER_BASE_API_TOKEN)
            return api_error(status.HTTP_400_BAD_REQUEST, 'Ledger base invalid')
        ## ledger table
        try:
            error_msg = check_table(seatable_api)
        except Exception as e:
            logger.exception('fix ledger table %s error: %s', LEDGER_TABLE_NAME, e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        if error_msg:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Ledger table invalid: %s' % error_msg)
        ## query
        fields = [col['column_name'] for col in LEDGER_COLUMNS] + ['_id']
        fields_str = ', '.join(map(lambda x: f'`{x}`', fields))
        sql = f"SELECT {fields_str} FROM {LEDGER_TABLE_NAME} WHERE `Repo ID`='{repo_id}' AND `文件路径`='{path}'"
        try:
            result = seatable_api.query(sql)
        except Exception as e:
            logger.exception('query sql: %s error: %s', sql, e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        rows = result.get('results')
        row = rows[0] if rows else {}
        return Response({
            'row': row,
            'metadata': result['metadata']
        })

    def put(self, request, repo_id):
        if not all((DTABLE_WEB_SERVER, SEATABLE_LEDGER_BASE_API_TOKEN, LEDGER_TABLE_NAME)):
            return api_error(status.HTTP_403_FORBIDDEN, 'Feature not enabled')
        # arguments check
        path = request.data.get('path')
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'path invalid')
        path = normalize_file_path(path)
        parent_dir = os.path.dirname(path)
        ledger_data = request.data.get('ledger_data')
        if not ledger_data or not isinstance(ledger_data, dict):
            return api_error(status.HTTP_400_BAD_REQUEST, 'ledger_data invalid')

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found')
        file_id = seafile_api.get_file_id_by_path(repo_id, path)
        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'File %s not found.' % path)

        # permission check
        if not parse_repo_perm(check_folder_permission(request, repo_id, parent_dir)).can_edit_on_web:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # check base
        try:
            seatable_api = SeaTableAPI(SEATABLE_LEDGER_BASE_API_TOKEN, DTABLE_WEB_SERVER)
        except:
            logger.error('server: %s token: %s seatable-api fail', DTABLE_WEB_SERVER, SEATABLE_LEDGER_BASE_API_TOKEN)
            return api_error(status.HTTP_400_BAD_REQUEST, 'Ledger base invalid')
        ## ledger table
        try:
            error_msg = check_table(seatable_api)
        except Exception as e:
            logger.exception('fix ledger table %s error: %s', LEDGER_TABLE_NAME, e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        if error_msg:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Ledger table invalid: %s' % error_msg)
        ## check existed ledger row
        sql = f"SELECT * FROM `{LEDGER_TABLE_NAME}` WHERE `Repo ID`='{repo_id}' AND `文件路径`='{path}'"
        result = seatable_api.query(sql)
        results = result['results']
        if not results:
            return api_error(status.HTTP_404_NOT_FOUND, 'The ledger of the file not found')
        row_id = results[0]['_id']
        ## update ledger row
        ledger_data = {col_name: value for col_name, value in ledger_data.items() if col_name in LEDGER_UPDATABLE_COLUMNS}
        try:
            seatable_api.update_row(LEDGER_TABLE_NAME, row_id, ledger_data)
        except Exception as e:
            logger.error('update ledger table error: %s', e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'success': True})

    def delete(self, request, repo_id):
        if not all((DTABLE_WEB_SERVER, SEATABLE_LEDGER_BASE_API_TOKEN, LEDGER_TABLE_NAME)):
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
        file_id = seafile_api.get_file_id_by_path(repo_id, path)
        if not file_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'File %s not found.' % path)

        # permission check
        if not parse_repo_perm(check_folder_permission(request, repo_id, parent_dir)).can_edit_on_web:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # check base
        try:
            seatable_api = SeaTableAPI(SEATABLE_LEDGER_BASE_API_TOKEN, DTABLE_WEB_SERVER)
        except:
            logger.error('server: %s token: %s seatable-api fail', DTABLE_WEB_SERVER, SEATABLE_LEDGER_BASE_API_TOKEN)
            return api_error(status.HTTP_400_BAD_REQUEST, 'Ledger base invalid')
        ## ledger table
        try:
            error_msg = check_table(seatable_api)
        except Exception as e:
            logger.exception('fix ledger table %s error: %s', LEDGER_TABLE_NAME, e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        if error_msg:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Ledger table invalid: %s' % error_msg)
        sql = f"DELETE FROM `{LEDGER_TABLE_NAME}` WHERE `文件路径`='{path}' AND `Repo ID`='{repo_id}'"
        try:
            seatable_api.query(sql)
        except Exception as e:
            logger.exception('delete ledger record error: %s', e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        return Response({'success': True})
