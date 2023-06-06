import logging
import os

from django.http import FileResponse
from django.utils import timezone
from django.utils.http import urlquote
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
from seahub.settings import DTABLE_WEB_SERVER, DTABLE_WEB_LEDGER_API_TOKEN, LEDGER_TABLE_NAME
from seahub.utils import normalize_file_path
from seahub.utils.repo import parse_repo_perm
from seahub.utils.seafevents_io import add_export_ledger_to_excel_task, query_task
from seahub.utils.seatable_api import SeaTableAPI, ColumnTypes
from seahub.views import check_folder_permission

logger = logging.getLogger(__name__)

LEDGER_COLUMNS = [
    {'column_name': 'Repo ID', 'column_type': ColumnTypes.TEXT},
    {'column_name': '文件名', 'column_type': ColumnTypes.TEXT},
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
        response = seatable_api.add_table(LEDGER_TABLE_NAME, columns=LEDGER_COLUMNS)
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
            return f"Column {table_col['name']} not found"
    return None


class FileLedgersView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, repo_id):
        if not all((DTABLE_WEB_SERVER, DTABLE_WEB_LEDGER_API_TOKEN, LEDGER_TABLE_NAME)):
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

        # permission check
        if not parse_repo_perm(check_folder_permission(request, repo_id, parent_dir)).can_edit_on_web:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # check base
        try:
            seatable_api = SeaTableAPI(DTABLE_WEB_LEDGER_API_TOKEN, DTABLE_WEB_SERVER)
        except:
            logger.error('server: %s token: %s seatable-api fail', DTABLE_WEB_SERVER, DTABLE_WEB_LEDGER_API_TOKEN)
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
        ledger_data.update({
            'Repo ID': repo_id,
            '文件名': file_name,
            '文件路径': path,
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
        if not all((DTABLE_WEB_SERVER, DTABLE_WEB_LEDGER_API_TOKEN, LEDGER_TABLE_NAME)):
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
            seatable_api = SeaTableAPI(DTABLE_WEB_LEDGER_API_TOKEN, DTABLE_WEB_SERVER)
        except:
            logger.error('server: %s token: %s seatable-api fail', DTABLE_WEB_SERVER, DTABLE_WEB_LEDGER_API_TOKEN)
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
        if not all((DTABLE_WEB_SERVER, DTABLE_WEB_LEDGER_API_TOKEN, LEDGER_TABLE_NAME)):
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
            seatable_api = SeaTableAPI(DTABLE_WEB_LEDGER_API_TOKEN, DTABLE_WEB_SERVER)
        except:
            logger.error('server: %s token: %s seatable-api fail', DTABLE_WEB_SERVER, DTABLE_WEB_LEDGER_API_TOKEN)
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
        if not all((DTABLE_WEB_SERVER, DTABLE_WEB_LEDGER_API_TOKEN, LEDGER_TABLE_NAME)):
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
            seatable_api = SeaTableAPI(DTABLE_WEB_LEDGER_API_TOKEN, DTABLE_WEB_SERVER)
        except:
            logger.error('server: %s token: %s seatable-api fail', DTABLE_WEB_SERVER, DTABLE_WEB_LEDGER_API_TOKEN)
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


class FileLedgersExportToExcelView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, repo_id):
        if not all((DTABLE_WEB_SERVER, DTABLE_WEB_LEDGER_API_TOKEN, LEDGER_TABLE_NAME)):
            return api_error(status.HTTP_403_FORBIDDEN, 'Feature not enabled')
        parent_dir = request.data.get('parent_dir') or '/'
        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library not found')
        dir_id = seafile_api.get_dir_id_by_path(repo_id, parent_dir)
        if not dir_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'Dir %s not found.' % parent_dir)

        # permission check
        if not parse_repo_perm(check_folder_permission(request, repo_id, parent_dir)).can_edit_on_web:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # check base
        try:
            seatable_api = SeaTableAPI(DTABLE_WEB_LEDGER_API_TOKEN, DTABLE_WEB_SERVER)
        except:
            logger.error('server: %s token: %s seatable-api fail', DTABLE_WEB_SERVER, DTABLE_WEB_LEDGER_API_TOKEN)
            return api_error(status.HTTP_400_BAD_REQUEST, 'Ledger base invalid')
        ## ledger table
        try:
            error_msg = check_table(seatable_api)
        except Exception as e:
            logger.exception('fix ledger table %s error: %s', LEDGER_TABLE_NAME, e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        if error_msg:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Ledger table invalid: %s' % error_msg)
        ## export
        try:
            response = add_export_ledger_to_excel_task(repo_id, parent_dir)
            status_code, response_json = response.status_code, response.json()
        except Exception as e:
            logger.exception('add export ledger to excel task error: %s', e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        return Response(response_json, status=status_code)

    def get(self, request, repo_id):
        if not all((DTABLE_WEB_SERVER, DTABLE_WEB_LEDGER_API_TOKEN, LEDGER_TABLE_NAME)):
            return api_error(status.HTTP_403_FORBIDDEN, 'Feature not enabled')
        parent_dir = request.GET.get('parent_dir') or '/'
        task_id = request.GET.get('task_id')
        if not task_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'task_id invalid')
        target_dir = '/tmp/seafile-io/ledgers-excels/' + repo_id
        excel_name = f"{DTABLE_WEB_LEDGER_API_TOKEN}-{LEDGER_TABLE_NAME}-{parent_dir.replace('/', '-')}.xlsx"
        target_path = os.path.join(target_dir, excel_name)
        if not os.path.isfile(target_path):
            return api_error(status.HTTP_404_NOT_FOUND, 'Export file not found')
        response = FileResponse(open(target_path, 'rb'), content_type='application/ms-excel', as_attachment=True)
        response['Content-Disposition'] = 'attachment;filename*=UTF-8\'\'' + urlquote(excel_name)
        return response


class FileLedgersExportToExcelTaskQueryView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id):
        if not all((DTABLE_WEB_SERVER, DTABLE_WEB_LEDGER_API_TOKEN, LEDGER_TABLE_NAME)):
            return api_error(status.HTTP_403_FORBIDDEN, 'Feature not enabled')
        task_id = request.GET.get('task_id')
        if not task_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'task_id invalid')
        ## export
        try:
            response = query_task(task_id)
            status_code, response_json = response.status_code, response.json()
        except Exception as e:
            logger.exception('query export ledger to excel task error: %s', e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        return Response(response_json, status=status_code)
