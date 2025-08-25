import json
import logging
import os
import posixpath
from datetime import datetime

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from django.http import HttpResponse
from django.utils.translation import gettext as _
from seahub.api2.utils import api_error
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.repo_metadata.models import RepoMetadata, RepoMetadataViews
from seahub.views import check_folder_permission
from seahub.repo_metadata.utils import add_init_metadata_task, recognize_faces, gen_unique_id, init_metadata, \
    get_unmodifiable_columns, can_read_metadata, init_faces, \
    extract_file_details, get_table_by_name, remove_faces_table, FACES_SAVE_PATH, \
    init_tags, init_tag_self_link_columns, remove_tags_table, add_init_face_recognition_task, \
    get_update_record, update_people_cover_photo
from seahub.repo_metadata.metadata_server_api import MetadataServerAPI, list_metadata_view_records
from seahub.utils.repo import is_repo_admin, is_repo_owner
from seahub.share.utils import check_invisible_folder
from seaserv import seafile_api
from seahub.repo_metadata.constants import FACE_RECOGNITION_VIEW_ID, METADATA_RECORD_UPDATE_LIMIT
from seahub.file_tags.models import FileTags
from seahub.repo_tags.models import RepoTags
from seahub.settings import MD_FILE_COUNT_LIMIT

logger = logging.getLogger(__name__)



class MetadataManage(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id):
        """
            check the repo has enabled the metadata manage or not
        """
        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not can_read_metadata(request, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        is_enabled = False
        is_tags_enabled = False
        tags_lang = ''
        details_settings = '{}'
        face_recognition_enabled = False
        global_hidden_columns = []
        records_count = 0

        try:
            record = RepoMetadata.objects.filter(repo_id=repo_id).first()
            show_view = False
            if record and record.enabled:
                from seafevents.repo_metadata.constants import METADATA_TABLE
                is_enabled = True
                show_view = True
                details_settings = record.details_settings
                global_hidden_columns = json.loads(record.global_hidden_columns) if record.global_hidden_columns else []
                if not details_settings:
                    details_settings = '{}'
                if record.tags_enabled:
                    is_tags_enabled = True
                    tags_lang = record.tags_lang
                if record.face_recognition_enabled:
                    face_recognition_enabled = True
                if not global_hidden_columns:
                    global_hidden_columns = []
                if not is_repo_owner(request, repo_id, request.user.username):
                    try:
                        org_id = request.user.org.org_id if request.user.org else None
                        show_view = not check_invisible_folder(repo_id, request.user.username, org_id)
                    except Exception as e:
                        logger.error(e)
                metadata_server_api = MetadataServerAPI(repo_id, request.user.username)
                sql = f'SELECT COUNT(1) AS records_count FROM `{METADATA_TABLE.name}`'
                query_result = metadata_server_api.query_rows(sql)
                results = query_result.get('results')
                records_count = results[0].get('records_count')
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({
            'enabled': is_enabled,
            'tags_enabled': is_tags_enabled,
            'face_recognition_enabled': face_recognition_enabled,
            'tags_lang': tags_lang,
            'details_settings': details_settings,
            'global_hidden_columns': global_hidden_columns,
            'show_view': show_view,
            'records_count': records_count
        })

    def put(self, request, repo_id):
        """
            enable a new repo's metadata manage
        """

        # check dose the repo have opened metadata manage
        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if metadata and metadata.enabled:
            error_msg = f'The metadata module is enabled for repo {repo_id}.'
            return api_error(status.HTTP_409_CONFLICT, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not is_repo_admin(request.user.username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        params = {
            'repo_id': repo_id,
            'username': request.user.username
        }

        try:
            RepoMetadata.objects.enable_metadata_and_tags(repo_id)
        except Exception as e:
            logger.exception(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)
        try:
            init_metadata(metadata_server_api)
            init_tags(metadata_server_api)
        except Exception as e:
            logger.error(e)
            metadata.enabled = False
            metadata.face_recognition_enabled = False
            metadata.tags_enabled = False
            metadata.details_settings = '{}'
            metadata.save()
            status_code = e.args[0] if e.args else 500
            if status_code == 400:
                error_msg = _('Metadata feature is not supported for libraries containing more than %s files') % MD_FILE_COUNT_LIMIT
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            else:
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        try:
            task_id = add_init_metadata_task(params=params)
            metadata_view = RepoMetadataViews.objects.filter(repo_id=repo_id).first()
            if not metadata_view:
                RepoMetadataViews.objects.add_view(repo_id, 'All files', 'table')
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'task_id': task_id})

    def delete(self, request, repo_id):
        """
            remove a repo's metadata manage
        """

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not is_repo_admin(request.user.username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # check dose the repo have opened metadata manage
        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled:
            error_msg = f'The repo {repo_id} has disabledd the metadata manage.'
            return api_error(status.HTTP_409_CONFLICT, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)
        try:
            metadata_server_api.delete_base()
        except Exception as err:
            logger.error(err)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        try:
            record.enabled = False
            record.face_recognition_enabled = False
            record.tags_enabled = False
            record.details_settings = '{}'
            record.save()
            RepoMetadataViews.objects.filter(repo_id=repo_id).delete()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class MetadataDetailsSettingsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def put(self, request, repo_id):
        settings = request.data.get('settings', {})
        if not settings:
            error_msg = 'settings invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = f'Library {repo_id} not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not is_repo_admin(request.user.username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is not enabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        old_details_settings = metadata.details_settings if metadata.details_settings else '{}'
        old_details_settings = json.loads(old_details_settings)
        if not old_details_settings:
            old_details_settings = {}

        old_details_settings.update(settings)
        try:
            metadata.details_settings = json.dumps(old_details_settings)
            metadata.save()
        except Exception as e:
            logger.exception(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'success': True})


class MetadataGlobalHiddenColumnsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def put(self, request, repo_id):
        global_hidden_columns = request.data.get('global_hidden_columns', [])
        if not isinstance(global_hidden_columns, list):
            error_msg = 'global_hidden_columns must be a list.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)


        if not is_repo_admin(request.user.username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            metadata.global_hidden_columns = json.dumps(global_hidden_columns)
            metadata.save()
        except Exception as e:
            logger.exception(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        return Response({'success': True})


class MetadataRecords(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id):
        """
            fetch a metadata results
            request body:
                parent_dir: optional, if not specify, search from all dirs
                name: optional, if not specify, search from all objects
                page: optional, the current page
                per_page: optional, if use page, default is 25
                is_dir: optional, True or False
                order_by: list with string, like ['`parent_dir` ASC']
        """

        # args check
        view_id = request.GET.get('view_id', '')
        start = request.GET.get('start', 0)
        limit = request.GET.get('limit', 1000)

        try:
            start = int(start)
            limit = int(limit)
        except:
            start = 0
            limit = 1000

        if start < 0:
            error_msg = 'start invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if limit < 0:
            error_msg = 'limit invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not view_id:
            error_msg = 'view_id is invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # metadata enable check
        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        tags_enabled = False
        if metadata.tags_enabled:
            tags_enabled = True

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not can_read_metadata(request, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            view = RepoMetadataViews.objects.get_view(repo_id, view_id)
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not view:
            error_msg = 'Metadata view %s not found.' % view_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            results = list_metadata_view_records(repo_id, request.user.username, view, tags_enabled, start, limit)
        except Exception as err:
            logger.error(err)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(results)

    def put(self, request, repo_id):
        records_data = request.data.get('records_data')
        if not records_data:
            error_msg = 'records_data invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if len(records_data) > METADATA_RECORD_UPDATE_LIMIT:
            error_msg = 'Number of records exceeds the limit of 1000.'
            return api_error(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, error_msg)

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission(request, repo_id, '/')
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)

        from seafevents.repo_metadata.constants import METADATA_TABLE
        try:
            columns_data = metadata_server_api.list_columns(METADATA_TABLE.id)
            columns = columns_data.get('columns', [])
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        unmodifiable_column_names = [column.get('name') for column in get_unmodifiable_columns()]

        record_id_to_record = {}
        sql = f'SELECT `_id` FROM `{METADATA_TABLE.name}` WHERE '
        parameters = []
        for record_data in records_data:
            record = record_data.get('record', {})
            if not record:
                continue
            record_id = record_data.get('record_id', '')
            if not record_id:
                error_msg = 'record_id invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            sql += f' `{METADATA_TABLE.columns.id.name}` = ? OR '
            parameters.append(record_id)
            record_id_to_record[record_id] = record

        sql = sql.rstrip('OR ')
        sql += ';'

        if not parameters:
            return Response({'success': True})

        try:
            query_result = metadata_server_api.query_rows(sql, parameters)
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        results = query_result.get('results')
        if not results:
            # file or folder has been deleted
            return Response({'success': True})

        rows = []
        for record in results:
            to_updated_record = record_id_to_record.get(record_id)
            update = get_update_record(to_updated_record, columns, unmodifiable_column_names)
            if update:
                record_id = record.get('_id')
                update[METADATA_TABLE.columns.id.name] = record_id
                rows.append(update)
        if rows:
            try:
                metadata_server_api.update_rows(METADATA_TABLE.id, rows)
            except Exception as e:
                logger.exception(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class MetadataRecord(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id):
        record_id = request.GET.get('record_id')
        parent_dir = request.GET.get('parent_dir')
        file_name = request.GET.get('file_name')
        if not record_id:
            if not parent_dir:
                error_msg = 'parent_dir invalid'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if not file_name:
                error_msg = 'file_name invalid'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not can_read_metadata(request, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)

        from seafevents.repo_metadata.constants import METADATA_TABLE

        sql = f'SELECT * FROM `{METADATA_TABLE.name}` WHERE `{METADATA_TABLE.columns.id.name}`=?;'
        parameters = [record_id]

        if not record_id:
            sql = f'SELECT * FROM `{METADATA_TABLE.name}` WHERE \
                `{METADATA_TABLE.columns.parent_dir.name}`=? AND `{METADATA_TABLE.columns.file_name.name}`=?;'
            parameters = [parent_dir, file_name]

        try:
            query_result = metadata_server_api.query_rows(sql, parameters)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        rows = query_result.get('results')

        if not rows:
            error_msg = 'Record not found'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        return Response(query_result)

    def put(self, request, repo_id):
        record_id = request.data.get('record_id')
        parent_dir = request.data.get('parent_dir')
        file_name = request.data.get('file_name')
        if not record_id:
            if not parent_dir:
                error_msg = 'parent_dir invalid'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if not file_name:
                error_msg = 'file_name invalid'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        update_data = request.data.get('data')
        if not update_data:
            error_msg = 'data invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not can_read_metadata(request, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = f'Library {repo_id} not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)

        from seafevents.repo_metadata.constants import METADATA_TABLE
        try:
            columns_data = metadata_server_api.list_columns(METADATA_TABLE.id)
            columns = columns_data.get('columns', [])
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        sql = f'SELECT * FROM `{METADATA_TABLE.name}` WHERE `{METADATA_TABLE.columns.id.name}`=?;'
        parameters = [record_id]

        if not record_id:
            sql = f'SELECT * FROM `{METADATA_TABLE.name}` WHERE \
                `{METADATA_TABLE.columns.parent_dir.name}`=? AND `{METADATA_TABLE.columns.file_name.name}`=?;'
            parameters = [parent_dir, file_name]

        try:
            query_result = metadata_server_api.query_rows(sql, parameters)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        rows = query_result.get('results')

        if not rows:
            error_msg = 'Record not found'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        unmodifiable_column_names = [column.get('name') for column in get_unmodifiable_columns()]

        record = rows[0]
        update_record = get_update_record(update_data, columns, unmodifiable_column_names)
        if not update_record:
            return Response({'success': True})

        record_id = record.get('_id')
        update_record[METADATA_TABLE.columns.id.name] = record_id
        update_records = [update_record]
        if update_records:
            try:
                metadata_server_api.update_rows(METADATA_TABLE.id, update_records)
            except Exception as e:
                logger.exception(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class MetadataColumns(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, repo_id):
        column_name = request.data.get('column_name')
        column_type = request.data.get('column_type', 'text')
        column_key = request.data.get('column_key', '')
        column_data = request.data.get('column_data', '')

        if not column_name:
            error_msg = 'column_name invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission(request, repo_id, '/')
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)

        from seafevents.repo_metadata.constants import METADATA_TABLE, MetadataColumn
        columns = metadata_server_api.list_columns(METADATA_TABLE.id).get('columns')
        column_keys = set()
        column_names = set()

        for column in columns:
            column_keys.add(column.get('key'))
            column_names.add(column.get('name'))

        if column_name in column_names:
            error_msg = 'column_name duplicated.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if column_key and column_key.startswith('_') and column_key in column_keys:
            error_msg = 'predefined column duplicated'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not column_key:
            column_key = gen_unique_id(column_keys)

        column = MetadataColumn(column_key, column_name, column_type, column_data)
        column = column.to_dict()

        try:
            metadata_server_api.add_column(METADATA_TABLE.id, column)
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'column': column})

    def put(self, request, repo_id):
        column_key = request.data.get('column_key', '')
        column_name = request.data.get('name', '')
        column_data = request.data.get('data', '')

        if not column_key:
            error_msg = 'column_key invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not column_name and not column_data:
            error_msg = 'params invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission(request, repo_id, '/')
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        from seafevents.repo_metadata.constants import METADATA_TABLE, MetadataColumn
        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)
        columns = metadata_server_api.list_columns(METADATA_TABLE.id).get('columns')
        try:
            column = next(column for column in columns if column['key'] == column_key)
        except Exception as e:
            error_msg = 'Column not found'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        new_column_name = column_name if column_name else column['name']
        old_column_data = column.get('data', {})
        new_column_data = {**old_column_data, **column_data} if column_data else column['data']

        new_column = MetadataColumn(column_key, new_column_name, column['type'], new_column_data).to_dict()
        try:
            metadata_server_api.update_column(METADATA_TABLE.id, new_column)
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'column': new_column})

    def delete(self, request, repo_id):
        column_key = request.data.get('column_key', '')
        if not column_key:
            error_msg = 'column_key invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission(request, repo_id, '/')
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        from seafevents.repo_metadata.constants import METADATA_TABLE

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)
        columns = metadata_server_api.list_columns(METADATA_TABLE.id).get('columns')
        try:
            column = next(column for column in columns if column['key'] == column_key)
        except Exception as e:
            error_msg = 'Column not found'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            metadata_server_api.delete_column(METADATA_TABLE.id, column_key)
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class MetadataBatchRecords(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, repo_id):
        """
        Get metadata records for multiple files in batch
        Request body:
            files: list of {parent_dir, file_name} objects
        """
        files = request.data.get('files', [])
        if not files or not isinstance(files, list):
            error_msg = 'files parameter is required and must be a list'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        if len(files) > METADATA_RECORD_UPDATE_LIMIT:
            error_msg = 'Number of records exceeds the limit of %s.' % METADATA_RECORD_UPDATE_LIMIT
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not can_read_metadata(request, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = f'Library {repo_id} not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)

        from seafevents.repo_metadata.constants import METADATA_TABLE

        try:
            columns_data = metadata_server_api.list_columns(METADATA_TABLE.id)
            all_columns = columns_data.get('columns', [])
            metadata_columns = []
            for column in all_columns:
                if column.get('key') in ['_rate', '_tags']:
                    metadata_columns.append({
                        'key': column.get('key'),
                        'name': column.get('name'),
                        'type': column.get('type'),
                        'data': column.get('data', {})
                    })
            
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        where_conditions = []
        parameters = []
        
        for file_info in files:
            parent_dir = file_info.get('parent_dir')
            file_name = file_info.get('file_name')
            
            if not parent_dir or not file_name:
                continue
                
            where_conditions.append(f'(`{METADATA_TABLE.columns.parent_dir.name}`=? AND `{METADATA_TABLE.columns.file_name.name}`=?)')
            parameters.extend([parent_dir, file_name])

        if not where_conditions:
            return Response({
                'results': [],
                'metadata': {'columns': metadata_columns}
            })

        where_clause = ' OR '.join(where_conditions)
        sql = f'SELECT * FROM `{METADATA_TABLE.name}` WHERE {where_clause};'
        try:
            query_result = metadata_server_api.query_rows(sql, parameters)
            results = query_result.get('results', [])

            return Response({
                'results': results,
                'metadata': {'columns': metadata_columns}
            })

        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)


class MetadataFolders(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, repo_id):
        # add metadata folder
        folder_name = request.data.get('name')

        # check view name
        if not folder_name:
            return api_error(status.HTTP_400_BAD_REQUEST, 'folder_name is invalid')

        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission(request, repo_id, '/')
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # check metadata_views
        metadata_views = RepoMetadataViews.objects.filter(repo_id=repo_id).first()
        if not metadata_views:
            error_msg = 'The metadata views does not exists.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            new_folder = RepoMetadataViews.objects.add_folder(repo_id, folder_name)
            if not new_folder:
                return api_error(status.HTTP_400_BAD_REQUEST, 'add folder failed')
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'folder': new_folder})

    def put(self, request, repo_id):
        # update metadata folder: name etc.
        folder_id = request.data.get('folder_id', None)
        folder_data = request.data.get('folder_data', None)

        # check folder_id
        if not folder_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'folder_id is invalid')

        # check folder_data
        if not folder_data:
            return api_error(status.HTTP_400_BAD_REQUEST, 'folder_data is invalid')
        if folder_data.get('_id') or folder_data.get('type') or folder_data.get('children'):
            return api_error(status.HTTP_400_BAD_REQUEST, 'folder_data is invalid')

        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission(request, repo_id, '/')
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # check metadata_views
        metadata_views = RepoMetadataViews.objects.filter(repo_id=repo_id).first()
        if not metadata_views:
            error_msg = 'The metadata views does not exists.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # check folder exist
        if folder_id not in metadata_views.folders_ids:
            return api_error(status.HTTP_400_BAD_REQUEST, 'folder %s does not exists.' % folder_id)

        try:
            result = RepoMetadataViews.objects.update_folder(repo_id, folder_id, folder_data)
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})

    def delete(self, request, repo_id):
        # delete metadata folder by id
        # check folder_id
        folder_id = request.data.get('folder_id', None)
        if not folder_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'folder_id is invalid')

        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission(request, repo_id, '/')
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # check metadata_views
        metadata_views = RepoMetadataViews.objects.filter(repo_id=repo_id).first()
        if not metadata_views:
            error_msg = 'The metadata views does not exists.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # check folder exist
        if folder_id not in metadata_views.folders_ids:
            return api_error(status.HTTP_400_BAD_REQUEST, 'folder %s does not exists.' % folder_id)

        try:
            result = RepoMetadataViews.objects.delete_folder(repo_id, folder_id)
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class MetadataViews(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id):

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not can_read_metadata(request, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            metadata_views = RepoMetadataViews.objects.list_views(repo_id)
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(metadata_views)

    def post(self, request, repo_id):
        #  Add a metadata view
        metadata_views = RepoMetadataViews.objects.filter(repo_id=repo_id).first()
        view_name = request.data.get('name')
        folder_id = request.data.get('folder_id', None)
        view_type = request.data.get('type', 'table')
        view_data = request.data.get('data', {})

        # check view name
        if not view_name:
            error_msg = 'view name is invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # check folder exist
        if folder_id:
            if not metadata_views:
                error_msg = 'The metadata views does not exists.'
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)

            if folder_id not in metadata_views.folders_ids:
                return api_error(status.HTTP_400_BAD_REQUEST, 'folder %s does not exists' % folder_id)

        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission(request, repo_id, '/')
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            new_view = RepoMetadataViews.objects.add_view(repo_id, view_name, view_type, view_data, folder_id)
            if not new_view:
                return api_error(status.HTTP_400_BAD_REQUEST, 'add view failed')
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'view': new_view})

    def put(self, request, repo_id):
        # Update a metadata view, including rename, change filters and so on
        # by a json data
        view_id = request.data.get('view_id', None)
        view_data = request.data.get('view_data', None)
        if not view_id:
            error_msg = 'view_id is invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        if not view_data:
            error_msg = 'view_data is invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        views = RepoMetadataViews.objects.filter(
            repo_id=repo_id,
        ).first()
        if not views:
            error_msg = 'The metadata views does not exists.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if view_id not in views.views_ids:
            error_msg = 'view_id %s does not exists.' % view_id
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission(request, repo_id, '/')
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            result = RepoMetadataViews.objects.update_view(repo_id, view_id, view_data)
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})

    def delete(self, request, repo_id):
        # Update a metadata view, including rename, change filters and so on
        # by a json data
        view_id = request.data.get('view_id', None)
        folder_id = request.data.get('folder_id', None)
        if not view_id:
            error_msg = 'view_id is invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        metadata_views = RepoMetadataViews.objects.filter(
            repo_id=repo_id
        ).first()
        if not metadata_views:
            error_msg = 'The metadata views does not exists.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # check view exist
        if view_id not in metadata_views.views_ids:
            error_msg = 'view_id %s does not exists.' % view_id
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # check folder exist
        if folder_id and folder_id not in metadata_views.folders_ids:
            return api_error(status.HTTP_400_BAD_REQUEST, 'folder %s does not exists' % folder_id)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission(request, repo_id, '/')
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            result = RepoMetadataViews.objects.delete_view(repo_id, view_id, folder_id)
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class MetadataViewsDuplicateView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, repo_id):
        view_id = request.data.get('view_id')
        folder_id = request.data.get('folder_id', None)
        if not view_id:
            error_msg = 'view_id invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        metadata_views = RepoMetadataViews.objects.filter(
            repo_id=repo_id
        ).first()
        if not metadata_views:
            error_msg = 'The metadata views does not exists.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if view_id not in metadata_views.views_ids:
            error_msg = 'view_id %s does not exists.' % view_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # check folder exist
        if folder_id and folder_id not in metadata_views.folders_ids:
            return api_error(status.HTTP_400_BAD_REQUEST, 'folder %s does not exists' % folder_id)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission(request, repo_id, '/')
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        try:
            new_view = RepoMetadataViews.objects.duplicate_view(repo_id, view_id, folder_id)
            if not new_view:
                return api_error(status.HTTP_400_BAD_REQUEST, 'duplicate view failed')
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'view': new_view})


class MetadataViewsDetailView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id, view_id):
        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not can_read_metadata(request, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            view = RepoMetadataViews.objects.get_view(repo_id, view_id)
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'view': view})


class MetadataViewsMoveView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, repo_id):
        # move view or folder to another position
        source_view_id = request.data.get('source_view_id')
        source_folder_id = request.data.get('source_folder_id')
        target_view_id = request.data.get('target_view_id')
        target_folder_id = request.data.get('target_folder_id')
        is_above_folder = request.data.get('is_above_folder', False)

        # must drag view or folder
        if not source_view_id and not source_folder_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'source_view_id and source_folder_id is invalid')

        # must move above to view/folder or move view into folder
        if not target_view_id and not target_folder_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'target_view_id and target_folder_id is invalid')

        # not allowed to drag folder into folder
        if not source_view_id and source_folder_id and target_view_id and target_folder_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'not allowed to drag folder into folder')

        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission(request, repo_id, '/')
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_views = RepoMetadataViews.objects.filter(
            repo_id=repo_id,
        ).first()
        if not metadata_views:
            error_msg = 'The metadata views does not exists.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # check dragged view exist
        if source_view_id and source_view_id not in metadata_views.views_ids:
            return api_error(status.HTTP_400_BAD_REQUEST, 'source_view_id %s does not exists.' % source_view_id)

        # check dragged view exist
        if source_folder_id and source_folder_id not in metadata_views.folders_ids:
            return api_error(status.HTTP_400_BAD_REQUEST, 'source_view_id %s does not exists.' % source_view_id)

        # check target view exist
        if target_view_id and target_view_id not in metadata_views.views_ids:
            return api_error(status.HTTP_400_BAD_REQUEST, 'target_view_id %s does not exists.' % target_view_id)

        # check target view exist
        if target_folder_id and target_folder_id not in metadata_views.folders_ids:
            return api_error(status.HTTP_400_BAD_REQUEST, 'target_folder_id %s does not exists.' % target_folder_id)

        try:
            results = RepoMetadataViews.objects.move_view(repo_id, source_view_id, source_folder_id, target_view_id, target_folder_id, is_above_folder)
            if not results:
                return api_error(status.HTTP_400_BAD_REQUEST, 'move view or folder failed')
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'navigation': results['navigation']})


class FacesRecords(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id):
        start = request.GET.get('start', 0)
        limit = request.GET.get('limit', 1000)

        try:
            start = int(start)
            limit = int(limit)
        except:
            start = 0
            limit = 1000

        if start < 0:
            error_msg = 'start invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if limit < 0:
            error_msg = 'limit invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled or not metadata.face_recognition_enabled:
            error_msg = f'The face recognition is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not can_read_metadata(request, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)

        from seafevents.repo_metadata.constants import FACES_TABLE
        from seafevents.face_recognition.constants import UNKNOWN_PEOPLE_NAME
        sql = f'SELECT * FROM `{FACES_TABLE.name}` LIMIT {start}, {limit}'

        try:
            query_result = metadata_server_api.query_rows(sql)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        faces_records = query_result.get('results', [])
        metadata_columns = query_result.get('metadata', [])

        dirents = seafile_api.list_dir_by_path(repo_id, '/_Internal/Faces')
        file_name_to_mtime_dict = {}
        for dirent in dirents:
            file_name, ext = os.path.splitext(dirent.obj_name)
            file_name_to_mtime_dict[file_name] = dirent.mtime

        valid_faces_records = []
        for record in faces_records:

            excluded_photo_ids = [item['row_id'] for item in record.get(FACES_TABLE.columns.excluded_photo_links.name, [])]
            included_photo_links = record.get(FACES_TABLE.columns.included_photo_links.name, [])
            valid_photo_links = [item for item in record.get(FACES_TABLE.columns.photo_links.name, []) if item['row_id'] not in excluded_photo_ids]
            valid_photo_ids = [item['row_id'] for item in valid_photo_links]
            valid_photo_links.extend([item for item in included_photo_links if item['row_id'] not in valid_photo_ids])
            if not valid_photo_links:
                continue

            valid_faces_records.append({
                FACES_TABLE.columns.id.name: record.get(FACES_TABLE.columns.id.name),
                FACES_TABLE.columns.name.name: record.get(FACES_TABLE.columns.name.name),
                FACES_TABLE.columns.photo_links.name: valid_photo_links,
                '_is_someone': record.get(FACES_TABLE.columns.name.name) != UNKNOWN_PEOPLE_NAME,
                'file_mtime': file_name_to_mtime_dict.get(record.get(FACES_TABLE.columns.id.name))
            })

        return Response({
            'metadata': metadata_columns,
            'results': valid_faces_records,
        })


class FacesRecord(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def put(self, request, repo_id):
        name = request.data.get('name')
        record_id = request.data.get('record_id')

        from seafevents.face_recognition.constants import UNKNOWN_PEOPLE_NAME
        if not name or name == UNKNOWN_PEOPLE_NAME:
            error_msg = 'name invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not record_id:
            error_msg = 'record_id invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled or not metadata.face_recognition_enabled:
            error_msg = f'The face recognition is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not is_repo_admin(request.user.username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)
        from seafevents.repo_metadata.constants import FACES_TABLE

        try:
            faces_table = get_table_by_name(metadata_server_api, FACES_TABLE.name)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not faces_table:
            return api_error(status.HTTP_404_NOT_FOUND, 'faces table not found')
        faces_table_id = faces_table['id']

        sql = f'SELECT * FROM `{FACES_TABLE.name}` WHERE `{FACES_TABLE.columns.id.name}` = "{record_id}"'
        try:
            results = metadata_server_api.query_rows(sql).get('results', [])
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        if not results:
            error_msg = 'Record not found'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        update_row = {
            FACES_TABLE.columns.id.name: record_id,
            FACES_TABLE.columns.name.name: name,
        }

        try:
            metadata_server_api.update_rows(faces_table_id, [update_row])
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class PeoplePhotos(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id, people_id):
        start = request.GET.get('start', 0)
        limit = request.GET.get('limit', 1000)

        try:
            start = int(start)
            limit = int(limit)
        except:
            start = 0
            limit = 1000

        if start < 0:
            error_msg = 'start invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if limit < 0:
            error_msg = 'limit invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled or not metadata.face_recognition_enabled:
            error_msg = f'The face recognition is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not can_read_metadata(request, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)
        from seafevents.repo_metadata.constants import METADATA_TABLE, FACES_TABLE

        sql = f'SELECT `{FACES_TABLE.columns.photo_links.name}`, `{FACES_TABLE.columns.excluded_photo_links.name}`, `{FACES_TABLE.columns.included_photo_links.name}` FROM `{FACES_TABLE.name}` WHERE `{FACES_TABLE.columns.id.name}` = "{people_id}"'

        try:
            query_result = metadata_server_api.query_rows(sql)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        faces_records = query_result.get('results')

        if not faces_records:
            return Response({'metadata': [], 'results': []})

        faces_record = faces_records[0]

        try:
            view = RepoMetadataViews.objects.get_view(repo_id, FACE_RECOGNITION_VIEW_ID)
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        from seafevents.repo_metadata.utils import gen_sorts_sql
        from seafevents.repo_metadata.constants import PrivatePropertyKeys
        try:
            columns = metadata_server_api.list_columns(METADATA_TABLE.id).get('columns')
            order_sql = gen_sorts_sql(METADATA_TABLE, columns, view.get('sorts'))
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # Reduce the size of the response
        select_columns = f'`{METADATA_TABLE.columns.id.name}`, `{METADATA_TABLE.columns.parent_dir.name}`, `{METADATA_TABLE.columns.file_name.name}`, `{METADATA_TABLE.columns.file_ctime.name}`, `{METADATA_TABLE.columns.file_mtime.name}`'
        capture_time_column_name = next((column.get('name') for column in columns if column.get('key') == PrivatePropertyKeys.CAPTURE_TIME), None)
        if capture_time_column_name:
            select_columns = f'{select_columns}, `{capture_time_column_name}`'

        try:
            excluded_record_ids = [item['row_id'] for item in faces_record.get(FACES_TABLE.columns.excluded_photo_links.name, [])]
            included_record_ids = [item['row_id'] for item in faces_record.get(FACES_TABLE.columns.included_photo_links.name, [])]
            record_ids = [item['row_id'] for item in faces_record.get(FACES_TABLE.columns.photo_links.name, []) if item['row_id'] not in excluded_record_ids]
            record_ids.extend([item for item in included_record_ids if item not in record_ids])

            if not record_ids:
                return Response({'metadata': [], 'results': []})

            record_ids_str = ', '.join(["'%s'" % id for id in record_ids])
            sql = f'SELECT {select_columns} FROM `{METADATA_TABLE.name}` WHERE `{METADATA_TABLE.columns.id.name}` IN ({record_ids_str}) {order_sql} LIMIT {start}, {limit}'
            people_photos = metadata_server_api.query_rows(sql)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(people_photos)

    def post(self, request, repo_id):
        people_ids = request.data.get('people_ids')
        record_ids = request.data.get('record_ids')

        if not people_ids or not isinstance(people_ids, list):
            error_msg ='people_ids invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not record_ids or not isinstance(record_ids, list):
            error_msg = 'record_ids invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled or not metadata.face_recognition_enabled:
            error_msg = f'The face recognition is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not is_repo_admin(request.user.username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        from seafevents.repo_metadata.constants import FACES_TABLE
        from seafevents.face_recognition.constants import UNKNOWN_PEOPLE_NAME
        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)
        try:
            faces_table = get_table_by_name(metadata_server_api, FACES_TABLE.name)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not faces_table:
            return api_error(status.HTTP_404_NOT_FOUND, 'faces table not found')
        faces_table_id = faces_table['id']

        people_id_placeholders = ', '.join(['?' for _ in people_ids])
        sql = f'SELECT * FROM `{FACES_TABLE.name}` WHERE `{FACES_TABLE.columns.id.name}` IN ({people_id_placeholders}) OR `{FACES_TABLE.columns.name.name}` = "{UNKNOWN_PEOPLE_NAME}"'

        try:
            query_result = metadata_server_api.query_rows(sql, people_ids).get('results', [])
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # build face record map
        face_records = {record[FACES_TABLE.columns.id.name]: record for record in query_result if record[FACES_TABLE.columns.id.name] in people_ids}
        unknown_people_record = next((item for item in query_result if item.get(FACES_TABLE.columns.name.name) == UNKNOWN_PEOPLE_NAME), None)

        if not unknown_people_record:
            return api_error(status.HTTP_404_NOT_FOUND, 'Unknown people not found')

        row_id_map = {}
        update_link_map = {}
        for people_id in people_ids:
            face_record = face_records.get(people_id)
            if not face_record:
                return api_error(status.HTTP_404_NOT_FOUND, f'people {people_id} not found')

            excluded_record_ids = [item['row_id'] for item in face_record.get(FACES_TABLE.columns.excluded_photo_links.name, [])]
            duplicate_record_ids = [record_id for record_id in record_ids if record_id in excluded_record_ids]
            if duplicate_record_ids:
                update_link_map[people_id] = [record_id for record_id in excluded_record_ids if record_id not in duplicate_record_ids]

            row_id_map[people_id] = record_ids

        # update links in batch
        if update_link_map:
            try:
                metadata_server_api.update_link(FACES_TABLE.excluded_face_link_id, faces_table_id, update_link_map)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # insert links in batch
        try:
            metadata_server_api.insert_link(FACES_TABLE.included_face_link_id, faces_table_id, row_id_map)
            unknown_people_record_id = unknown_people_record[FACES_TABLE.columns.id.name]
            metadata_server_api.insert_link(FACES_TABLE.excluded_face_link_id, faces_table_id, {
                unknown_people_record_id: [record_id for record_id in record_ids if record_id not in [item['row_id'] for item in unknown_people_record.get(FACES_TABLE.columns.excluded_photo_links.name, [])]]
            })
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})

    def delete(self, request, repo_id, people_id):
        record_ids = request.data.get('record_ids')

        if not record_ids or not isinstance(record_ids, list):
            error_msg = 'record_ids invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled or not metadata.face_recognition_enabled:
            error_msg = f'The face recognition is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not is_repo_admin(request.user.username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        from seafevents.repo_metadata.constants import FACES_TABLE
        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)
        try:
            faces_table = get_table_by_name(metadata_server_api, FACES_TABLE.name)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not faces_table:
            return api_error(status.HTTP_404_NOT_FOUND, 'faces table not found')
        faces_table_id = faces_table['id']

        sql = f'SELECT `{FACES_TABLE.columns.included_photo_links.name}` FROM `{FACES_TABLE.name}` WHERE `{FACES_TABLE.columns.id.name}` = "{people_id}"'
        try:
            query_result = metadata_server_api.query_rows(sql).get('results')
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not query_result:
            return api_error(status.HTTP_404_NOT_FOUND, 'people not found')

        face_record = query_result[0]
        included_record_ids = [item['row_id'] for item in face_record.get(FACES_TABLE.columns.included_photo_links.name, [])]
        duplicate_record_ids = [record_id for record_id in record_ids if record_id in included_record_ids]
        if duplicate_record_ids:
            try:
                metadata_server_api.update_link(FACES_TABLE.included_face_link_id, faces_table_id, {
                    people_id: [record_id for record_id in included_record_ids if record_id not in duplicate_record_ids]
                })
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        try:
            metadata_server_api.insert_link(FACES_TABLE.excluded_face_link_id, faces_table_id, {
                people_id: record_ids
            })
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class FaceRecognitionManage(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id):
        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is not enabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not can_read_metadata(request, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            record = RepoMetadata.objects.filter(repo_id=repo_id).first()
            if record and record.face_recognition_enabled:
                is_enabled = True
            else:
                is_enabled = False
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'enabled': is_enabled})

    def post(self, request, repo_id):
        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is not enabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not is_repo_admin(request.user.username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)
        init_faces(metadata_server_api)

        dir_id = seafile_api.get_dir_id_by_path(repo_id, FACES_SAVE_PATH)
        if not dir_id:
            seafile_api.mkdir_with_parents(repo_id, '/', FACES_SAVE_PATH, request.user.username)

        try:
            RepoMetadata.objects.enable_face_recognition(repo_id)
        except Exception as e:
            logger.exception(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        params = {
            'repo_id': repo_id,
            'username': request.user.username,
        }
        try:
            task_id = add_init_face_recognition_task(params=params)
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'task_id': task_id})

    def delete(self, request, repo_id):
        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not is_repo_admin(request.user.username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # check dose the repo have opened metadata manage
        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled or not record.face_recognition_enabled:
            error_msg = f'The repo {repo_id} has disabled the face recognition manage.'
            return api_error(status.HTTP_409_CONFLICT, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)
        try:
            remove_faces_table(metadata_server_api)
        except Exception as err:
            logger.error(err)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        parent_dir = os.path.dirname(FACES_SAVE_PATH)
        file_name = os.path.basename(FACES_SAVE_PATH)
        username = request.user.username
        seafile_api.del_file(repo_id, parent_dir, json.dumps([file_name]), username)

        try:
            record.face_recognition_enabled = False
            record.last_face_cluster_time = None
            record.save()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class MetadataExtractFileDetails(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, repo_id):
        obj_ids = request.data.get('obj_ids')
        if not obj_ids or not isinstance(obj_ids, list) or len(obj_ids) > 50:
            error_msg = 'obj_ids is invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission(request, repo_id, '/')
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        params = {
            'obj_ids': obj_ids,
            'repo_id': repo_id
        }
        try:
            resp = extract_file_details(params=params)
        except Exception as e:
            logger.exception(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'details': resp})


class MetadataRecognizeFaces(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, repo_id):
        obj_ids = request.data.get('obj_ids')
        if not obj_ids or not isinstance(obj_ids, list) or len(obj_ids) > 50:
            error_msg = 'obj_ids is invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled or not metadata.face_recognition_enabled:
            error_msg = f'The face recognition is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        permission = check_folder_permission(request, repo_id, '/')
        if permission != 'rw':
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        params = {
            'obj_ids': obj_ids,
            'repo_id': repo_id
        }
        try:
            resp = recognize_faces(params=params)
            resp_json = resp.json()
        except Exception as e:
            logger.exception(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response(resp_json, resp.status_code)


# tags
class MetadataTagsStatusManage(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def put(self, request, repo_id):
        lang = request.data.get('lang')
        if not lang:
            error_msg = 'lang invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not is_repo_admin(request.user.username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is not enabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        old_tags_enabled = metadata.tags_enabled

        try:
            metadata.tags_enabled = True
            metadata.tags_lang = lang
            metadata.save()
        except Exception as e:
            logger.exception(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        if not old_tags_enabled:
            metadata_server_api = MetadataServerAPI(repo_id, request.user.username)
            init_tags(metadata_server_api)

        return Response({'success': True})

    def delete(self, request, repo_id):
        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not is_repo_admin(request.user.username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # check dose the repo have opened metadata manage
        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled or not record.tags_enabled:
            error_msg = f'The repo {repo_id} has disabled the tags manage.'
            return api_error(status.HTTP_409_CONFLICT, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)
        try:
            remove_tags_table(metadata_server_api)
        except Exception as err:
            logger.error(err)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        try:
            record.tags_enabled = False
            record.tags_lang = None
            record.save()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class MetadataTags(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id):
        start = request.GET.get('start', 0)
        limit = request.GET.get('limit', 1000)

        try:
            start = int(start)
            limit = int(limit)
        except:
            start = 0
            limit = 1000

        if start < 0:
            error_msg = 'start invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if limit < 0:
            error_msg = 'limit invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled or not metadata.tags_enabled:
            error_msg = f'The tags is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not can_read_metadata(request, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)
        from seafevents.repo_metadata.constants import TAGS_TABLE

        sql = f'SELECT * FROM `{TAGS_TABLE.name}` ORDER BY `_ctime` LIMIT {start}, {limit}'
        try:
            query_result = metadata_server_api.query_rows(sql)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(query_result)

    def post(self, request, repo_id):
        tags_data = request.data.get('tags_data', [])

        if not tags_data:
            error_msg = 'Tags data is required.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled or not metadata.tags_enabled:
            error_msg = f'The tags is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = f'Library {repo_id} not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not can_read_metadata(request, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)

        from seafevents.repo_metadata.constants import TAGS_TABLE
        try:
            tags_table = get_table_by_name(metadata_server_api, TAGS_TABLE.name)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not tags_table:
            return api_error(status.HTTP_404_NOT_FOUND, 'tags table not found')
        tags_table_id = tags_table['id']

        exist_tags = []
        new_tags = []
        tags_names = [tag_data.get(TAGS_TABLE.columns.name.name, '') for tag_data in tags_data]
        tags_names_str = ', '.join([f'"{tag_name}"' for tag_name in tags_names])
        sql = f'SELECT * FROM {TAGS_TABLE.name} WHERE `{TAGS_TABLE.columns.name.name}` in ({tags_names_str})'

        try:
            exist_rows = metadata_server_api.query_rows(sql)
            exist_tags = exist_rows.get('results', [])
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if exist_tags:
            for tag_data in tags_data:
                tag_name = tag_data.get(TAGS_TABLE.columns.name.name, '')
                if tag_name not in tags_names:
                    new_tags.append(tag_data)
        else:
            new_tags = tags_data

        tags = exist_tags
        if not new_tags:
            return Response({'tags': tags})

        try:
            resp = metadata_server_api.insert_rows(tags_table_id, new_tags)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        row_ids = resp.get('row_ids', [])
        row_ids_str = ', '.join([f'"{id}"' for id in row_ids])
        sql = f'SELECT * FROM {TAGS_TABLE.name} WHERE `{TAGS_TABLE.columns.id.name}` in ({row_ids_str})'
        try:
            query_new_rows = metadata_server_api.query_rows(sql)
            new_tags_data = query_new_rows.get('results', [])
            tags.extend(new_tags_data)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'tags': tags})

    def put(self, request, repo_id):
        tags_data = request.data.get('tags_data')
        if not tags_data:
            error_msg = 'tags_data invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled or not metadata.tags_enabled:
            error_msg = f'The tags is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not can_read_metadata(request, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)

        from seafevents.repo_metadata.constants import TAGS_TABLE
        try:
            tags_table = get_table_by_name(metadata_server_api, TAGS_TABLE.name)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not tags_table:
            return api_error(status.HTTP_404_NOT_FOUND, 'tags table not found')
        tags_table_id = tags_table['id']

        tag_id_to_tag = {}
        sql = f'SELECT `_id` FROM `{TAGS_TABLE.name}` WHERE '
        parameters = []
        for tag_data in tags_data:
            tag = tag_data.get('tag', {})
            if not tag:
                continue
            tag_id = tag_data.get('tag_id', '')
            if not tag_id:
                error_msg = 'record_id invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            sql += f' `{TAGS_TABLE.columns.id.name}` = ? OR '
            parameters.append(tag_id)
            tag_id_to_tag[tag_id] = tag

        sql = sql.rstrip('OR ')
        sql += ';'

        if not parameters:
            return Response({'success': True})

        try:
            query_result = metadata_server_api.query_rows(sql, parameters)
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        results = query_result.get('results')
        if not results:
            # file or folder has been deleted
            return Response({'success': True})

        rows = []
        for tag in results:
            tag_id = tag.get('_id')
            update = tag_id_to_tag.get(tag_id)
            update[TAGS_TABLE.columns.id.name] = tag_id
            rows.append(update)
        if rows:
            try:
                metadata_server_api.update_rows(tags_table_id, rows)
            except Exception as e:
                logger.exception(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})

    def delete(self, request, repo_id):
        tag_ids = request.data.get('tag_ids', [])

        if not tag_ids:
            error_msg = 'Tag ids is required.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled or not metadata.tags_enabled:
            error_msg = f'The tags is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not can_read_metadata(request, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)

        from seafevents.repo_metadata.constants import TAGS_TABLE
        try:
            tags_table = get_table_by_name(metadata_server_api, TAGS_TABLE.name)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not tags_table:
            return api_error(status.HTTP_404_NOT_FOUND, 'tags table not found')
        tags_table_id = tags_table['id']

        try:
            metadata_server_api.delete_rows(tags_table_id, tag_ids)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class MetadataTagsLinks(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, repo_id):
        link_column_key = request.data.get('link_column_key')
        row_id_map = request.data.get('row_id_map')

        if not link_column_key:
            return api_error(status.HTTP_400_BAD_REQUEST, 'link_column_key invalid')

        if not row_id_map:
            return api_error(status.HTTP_400_BAD_REQUEST, 'row_id_map invalid')

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not can_read_metadata(request, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)

        try:
            metadata = metadata_server_api.get_metadata()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        from seafevents.repo_metadata.constants import TAGS_TABLE
        tables = metadata.get('tables', [])
        tags_table_id = [table['id'] for table in tables if table['name'] == TAGS_TABLE.name]
        tags_table_id = tags_table_id[0] if tags_table_id else None
        if not tags_table_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'tags not be used')

        try:
            columns_data = metadata_server_api.list_columns(tags_table_id)
            columns = columns_data.get('columns', [])

        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        link_column = [column for column in columns if column['key'] == link_column_key and column['type'] == 'link']
        link_column = link_column[0] if link_column else None
        if not link_column:
            # init self link columns
            if link_column_key == TAGS_TABLE.columns.parent_links.key or link_column_key == TAGS_TABLE.columns.sub_links.key:
                try:
                    init_tag_self_link_columns(metadata_server_api, tags_table_id)
                    link_id = TAGS_TABLE.self_link_id
                    is_linked_back = link_column_key == TAGS_TABLE.columns.sub_links.key if True else False
                except Exception as e:
                    logger.error(e)
                    error_msg = 'Internal Server Error'
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
            else:
                return api_error(status.HTTP_400_BAD_REQUEST, 'link column %s not found' % link_column_key)
        else:
            link_column_data = link_column.get('data', {})
            link_id = link_column_data.get('link_id', '')
            is_linked_back = link_column_data.get('is_linked_back', False)

        if not link_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'invalid link column')

        try:
            metadata_server_api.insert_link(link_id, tags_table_id, row_id_map, is_linked_back)
        except Exception as e:
            logger.exception(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'success': True})

    def put(self, request, repo_id):
        link_column_key = request.data.get('link_column_key')
        row_id_map = request.data.get('row_id_map')

        if not row_id_map:
            return api_error(status.HTTP_400_BAD_REQUEST, 'row_id_map invalid')

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not can_read_metadata(request, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)

        try:
            metadata = metadata_server_api.get_metadata()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        from seafevents.repo_metadata.constants import TAGS_TABLE
        tables = metadata.get('tables', [])
        tags_table_id = [table['id'] for table in tables if table['name'] == TAGS_TABLE.name]
        tags_table_id = tags_table_id[0] if tags_table_id else None
        if not tags_table_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'tags not be used')

        try:
            columns_data = metadata_server_api.list_columns(tags_table_id)
            columns = columns_data.get('columns', [])
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        link_column = [column for column in columns if column['key'] == link_column_key and column['type'] == 'link']
        link_column = link_column[0] if link_column else None
        if not link_column:
            return api_error(status.HTTP_400_BAD_REQUEST, 'link column %s not found' % link_column_key)

        link_column_data = link_column.get('data', {})
        link_id = link_column_data.get('link_id', '')
        is_linked_back = link_column_data.get('is_linked_back', False)

        if not link_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'invalid link column')

        try:
            metadata_server_api.update_link(link_id, tags_table_id, row_id_map, is_linked_back)
        except Exception as e:
            logger.exception(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'success': True})

    def delete(self, request, repo_id):
        link_column_key = request.data.get('link_column_key')
        row_id_map = request.data.get('row_id_map')

        if not link_column_key:
            return api_error(status.HTTP_400_BAD_REQUEST, 'link_id invalid')

        if not row_id_map:
            return api_error(status.HTTP_400_BAD_REQUEST, 'row_id_map invalid')

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not can_read_metadata(request, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)

        try:
            metadata = metadata_server_api.get_metadata()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        from seafevents.repo_metadata.constants import TAGS_TABLE
        tables = metadata.get('tables', [])
        tags_table_id = [table['id'] for table in tables if table['name'] == TAGS_TABLE.name]
        tags_table_id = tags_table_id[0] if tags_table_id else None
        if not tags_table_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'tags not be used')

        try:
            columns_data = metadata_server_api.list_columns(tags_table_id)
            columns = columns_data.get('columns', [])
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        link_column = [column for column in columns if column['key'] == link_column_key and column['type'] == 'link']
        link_column = link_column[0] if link_column else None
        if not link_column:
            return api_error(status.HTTP_400_BAD_REQUEST, 'link column %s not found' % link_column_key)

        link_column_data = link_column.get('data', {})
        link_id = link_column_data.get('link_id', '')
        is_linked_back = link_column_data.get('is_linked_back', False)

        if not link_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'invalid link column')

        try:
            metadata_server_api.delete_link(link_id, tags_table_id, row_id_map, is_linked_back)
        except Exception as e:
            logger.exception(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'success': True})


class MetadataFileTags(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def put(self, request, repo_id):
        file_tags_data = request.data.get('file_tags_data')
        if not file_tags_data:
            error_msg = 'file_tags_data invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled or not metadata.tags_enabled:
            error_msg = f'The tags is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not can_read_metadata(request, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        from seafevents.repo_metadata.constants import TAGS_TABLE, METADATA_TABLE
        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)

        row_id_map = {}
        
        for file_tags in file_tags_data:
            record_id = file_tags.get('record_id', '')
            tags = file_tags.get('tags', [])
            if not record_id:
                continue
            
            row_id_map[record_id] = tags

        if not row_id_map:
            return api_error(status.HTTP_400_BAD_REQUEST, 'No valid file_tags_data provided')

        try:
            metadata_server_api.update_link(TAGS_TABLE.file_link_id, METADATA_TABLE.id, row_id_map)
        except Exception as e:
            logger.exception(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'success': True })


class MetadataTagFiles(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id, tag_id):
        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled or not metadata.tags_enabled:
            error_msg = f'The tags is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not can_read_metadata(request, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)

        from seafevents.repo_metadata.constants import TAGS_TABLE, METADATA_TABLE

        tag_files_record_sql = f'SELECT * FROM {TAGS_TABLE.name} WHERE `{TAGS_TABLE.columns.id.name}` = "{tag_id}"'
        try:
            tag_query = metadata_server_api.query_rows(tag_files_record_sql)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        tag_files_records = tag_query.get('results', [])
        if not tag_files_records:
            return Response({'metadata': [], 'results': []})

        tag_files_record_ids = tag_files_records[0].get(TAGS_TABLE.columns.file_links.name, [])
        if not tag_files_record_ids:
            return Response({'metadata': [], 'results': []})

        tag_files_sql = 'SELECT `%s`, `%s`, `%s`, `%s`, `%s`, `%s` FROM %s WHERE `%s` IN (%s)' % (METADATA_TABLE.columns.id.name, METADATA_TABLE.columns.file_name.name, \
                                                                                    METADATA_TABLE.columns.parent_dir.name, METADATA_TABLE.columns.size.name, \
                                                                                    METADATA_TABLE.columns.file_mtime.name, METADATA_TABLE.columns.tags.name, \
                                                                                    METADATA_TABLE.name, METADATA_TABLE.columns.id.name, \
                                                                                    ', '.join(["'%s'" % id.get('row_id') for id in tag_files_record_ids]))
        try:
            tag_files_query = metadata_server_api.query_rows(tag_files_sql)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(tag_files_query)


class MetadataTagsFiles(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, repo_id):
        tags_ids = request.data.get('tags_ids', None)

        if not tags_ids:
            return api_error(status.HTTP_400_BAD_REQUEST, 'tags_ids is invalid.')

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled or not metadata.tags_enabled:
            error_msg = f'The tags is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not can_read_metadata(request, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)

        from seafevents.repo_metadata.constants import TAGS_TABLE, METADATA_TABLE

        tags_ids_str = ', '.join([f'"{id}"' for id in tags_ids])
        sql = f'SELECT * FROM {TAGS_TABLE.name} WHERE `{TAGS_TABLE.columns.id.name}` in ({tags_ids_str})'
        try:
            query_new_rows = metadata_server_api.query_rows(sql)
            found_tags = query_new_rows.get('results', [])
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        if not found_tags:
            return Response([])

        tags_files_ids = []
        for tag in found_tags:
            tags_files_ids.extend(tag.get(TAGS_TABLE.columns.file_links.name, []))

        if not tags_files_ids:
            return Response([])

        tags_files_sql = 'SELECT `%s`, `%s`, `%s`, `%s`, `%s`, `%s` FROM %s WHERE `%s` IN (%s)' % (METADATA_TABLE.columns.id.name, METADATA_TABLE.columns.file_name.name, \
                                                                                    METADATA_TABLE.columns.parent_dir.name, METADATA_TABLE.columns.size.name, \
                                                                                    METADATA_TABLE.columns.file_mtime.name, METADATA_TABLE.columns.tags.name, \
                                                                                    METADATA_TABLE.name, METADATA_TABLE.columns.id.name, \
                                                                                    ', '.join(["'%s'" % id.get('row_id') for id in tags_files_ids]))
        try:
            tags_files_query = metadata_server_api.query_rows(tags_files_sql)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(tags_files_query)


class MetadataMergeTags(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, repo_id):
        target_tag_id = request.data.get('target_tag_id')
        merged_tags_ids = request.data.get('merged_tags_ids')

        if not target_tag_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'target_tag_id invalid')

        if not merged_tags_ids:
            return api_error(status.HTTP_400_BAD_REQUEST, 'merged_tags_ids invalid')

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not can_read_metadata(request, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)

        try:
            metadata = metadata_server_api.get_metadata()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        from seafevents.repo_metadata.constants import TAGS_TABLE
        tables = metadata.get('tables', [])
        tags_table_id = [table['id'] for table in tables if table['name'] == TAGS_TABLE.name]
        tags_table_id = tags_table_id[0] if tags_table_id else None
        if not tags_table_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'tags not be used')

        try:
            columns_data = metadata_server_api.list_columns(tags_table_id)
            columns = columns_data.get('columns', [])

        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        op_tags_ids = [target_tag_id] + merged_tags_ids
        op_tags_ids_str = ', '.join([f'"{id}"' for id in op_tags_ids])
        sql = f'SELECT * FROM {TAGS_TABLE.name} WHERE `{TAGS_TABLE.columns.id.name}` in ({op_tags_ids_str})'
        try:
            query_new_rows = metadata_server_api.query_rows(sql)
            op_tags = query_new_rows.get('results', [])
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        if not op_tags:
            return api_error(status.HTTP_400_BAD_REQUEST, 'tags not found')

        target_tag = next((tag for tag in op_tags if tag.get(TAGS_TABLE.columns.id.name) == target_tag_id), None)
        if not target_tag:
            return api_error(status.HTTP_400_BAD_REQUEST, 'target_tag_id invalid')

        merged_tags = [tag for tag in op_tags if  tag[TAGS_TABLE.columns.id.name] in merged_tags_ids]
        if not merged_tags:
            return api_error(status.HTTP_400_BAD_REQUEST, 'merged_tags_ids invalid')

        # get unique parent/child/file links from merged tags which not exist in target tag
        exist_parent_tags_ids = [link['row_id'] for link in target_tag.get(TAGS_TABLE.columns.parent_links.key, [])]
        exist_child_tags_ids = [link['row_id'] for link in target_tag.get(TAGS_TABLE.columns.sub_links.key, [])]
        exist_files_ids = [link['row_id'] for link in target_tag.get(TAGS_TABLE.columns.file_links.key, [])]
        new_parent_tags_ids = []
        new_child_tags_ids = []
        new_files_ids = []
        for merged_tag in merged_tags:
            merged_parent_tags_ids = [link['row_id'] for link in merged_tag.get(TAGS_TABLE.columns.parent_links.key, [])]
            merged_child_tags_ids = [link['row_id'] for link in merged_tag.get(TAGS_TABLE.columns.sub_links.key, [])]
            merged_files_ids = [link['row_id'] for link in merged_tag.get(TAGS_TABLE.columns.file_links.key, [])]
            for merged_parent_tag_id in merged_parent_tags_ids:
                if merged_parent_tag_id not in op_tags_ids and merged_parent_tag_id not in exist_parent_tags_ids:
                    new_parent_tags_ids.append(merged_parent_tag_id)
                    exist_parent_tags_ids.append(merged_parent_tag_id)

            for merged_child_tag_id in merged_child_tags_ids:
                if merged_child_tag_id not in op_tags_ids and merged_child_tag_id not in exist_child_tags_ids:
                    new_child_tags_ids.append(merged_child_tag_id)
                    exist_child_tags_ids.append(merged_child_tag_id)

            for merged_file_id in merged_files_ids:
                if merged_file_id not in exist_files_ids:
                    new_files_ids.append(merged_file_id)
                    exist_files_ids.append(merged_file_id)

        parent_link_column = [column for column in columns if column['key'] == TAGS_TABLE.columns.parent_links.key and column['type'] == 'link']
        parent_link_column = parent_link_column[0] if parent_link_column else None

        # add new parent tags
        if new_parent_tags_ids:
            try:
                metadata_server_api.insert_link(TAGS_TABLE.self_link_id, tags_table_id, { target_tag_id: new_parent_tags_ids })
            except Exception as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        # add new child tags
        if new_child_tags_ids:
            try:
                metadata_server_api.insert_link(TAGS_TABLE.self_link_id, tags_table_id, { target_tag_id: new_child_tags_ids }, True)
            except Exception as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        # add new tag files
        if new_files_ids:
            try:
                metadata_server_api.insert_link(TAGS_TABLE.file_link_id, tags_table_id, { target_tag_id: new_files_ids })
            except Exception as e:
                logger.error(e)
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')


        # remove merge tags
        try:
            metadata_server_api.delete_rows(tags_table_id, merged_tags_ids)
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'success': True})


class PeopleCoverPhoto(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def put(self, request, repo_id, people_id):
        record_id = request.data.get('record_id')
        if not record_id:
            error_msg = 'record_id invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if (
            not metadata
            or not metadata.enabled
            or not metadata.face_recognition_enabled
        ):
            error_msg = f'The face recognition is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not is_repo_admin(request.user.username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)

        from seafevents.repo_metadata.constants import METADATA_TABLE

        sql = f'SELECT `{METADATA_TABLE.columns.obj_id.name}`, `{METADATA_TABLE.columns.parent_dir.name}`, `{METADATA_TABLE.columns.file_name.name}` FROM `{METADATA_TABLE.name}` WHERE `{METADATA_TABLE.columns.id.name}` = "{record_id}"'

        try:
            query_result = metadata_server_api.query_rows(sql).get('results')
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if not query_result:
            return api_error(status.HTTP_404_NOT_FOUND, 'record not found')

        row = query_result[0]
        obj_id = row.get(METADATA_TABLE.columns.obj_id.name)
        parent_dir = row.get(METADATA_TABLE.columns.parent_dir.name)
        file_name = row.get(METADATA_TABLE.columns.file_name.name)
        path = os.path.join(parent_dir, file_name)

        token = seafile_api.get_fileserver_access_token(repo_id, obj_id, 'download', request.user.username, use_onetime=True)
        if not token:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        params = {
            'repo_id': repo_id,
            'path': path,
            'download_token': token,
            'people_id': people_id,
        }

        try:
            update_people_cover_photo(params)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class MetadataMigrateTags(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def _create_metadata_tags(self, repo_tags, tags_table_id, metadata_server_api, TAGS_TABLE):
        sql = f'SELECT `{TAGS_TABLE.columns.name.name}`,`{TAGS_TABLE.columns.id.name}` FROM {TAGS_TABLE.name}'
        existing_tags_result = metadata_server_api.query_rows(sql)
        existing_tag_records = existing_tags_result.get('results', [])
        existing_tag_map = {
            tag_dict.get(TAGS_TABLE.columns.name.name, '') :
            tag_dict.get(TAGS_TABLE.columns.id.name, '')
            for tag_dict in existing_tag_records
        }
        
        tags_to_create = [] # [{name:'', color:''}, ...]
        old_tag_name_to_metadata_tag_id = {} # {old_tag_name:id,} Existing tags

        for repo_tag in repo_tags:
            tag_name = repo_tag.name
            tag_color = repo_tag.color
            
            if tag_name in existing_tag_map:
                # Tag already exists, no need to create it
                new_tag_id = existing_tag_map.get(tag_name)
                old_tag_name_to_metadata_tag_id[tag_name] = new_tag_id
            else:
                # Tag needs to be created
                tags_to_create.append({
                    TAGS_TABLE.columns.name.name: tag_name,
                    TAGS_TABLE.columns.color.name: tag_color
                })
        
        if tags_to_create:
            response = metadata_server_api.insert_rows(tags_table_id, tags_to_create)
            new_tag_ids = response.get('row_ids', [])
            for idx, tag in enumerate(tags_to_create):
                new_tag_id = new_tag_ids[idx]
                tag_name = tag.get(TAGS_TABLE.columns.name.name)
                old_tag_name_to_metadata_tag_id[tag_name] = new_tag_id
        return old_tag_name_to_metadata_tag_id
    
    def _get_old_tags_info(self, tagged_files):
        old_tag_name_to_file_paths = {} # {old_tag_name: {file_path,....}}
        file_paths_set = set() # Used for querying metadata later
        for tagged_file in tagged_files:
            old_tag_name = tagged_file.repo_tag.name
            parent_path = tagged_file.file_uuid.parent_path
            filename = tagged_file.file_uuid.filename
            file_path = posixpath.join(parent_path, filename)
            
            if old_tag_name not in old_tag_name_to_file_paths:
                old_tag_name_to_file_paths[old_tag_name] = set()
            
            old_tag_name_to_file_paths[old_tag_name].add(file_path)
            file_paths_set.add(file_path)
        return old_tag_name_to_file_paths, file_paths_set

    def _get_metadata_records(self, metadata_server_api, file_paths_set, METADATA_TABLE):
        if not file_paths_set:
            return []
        dir_paths = []
        filenames = []
        for file_path in file_paths_set:
            parent_dir = os.path.dirname(file_path)
            filename = os.path.basename(file_path)
            dir_paths.append(parent_dir)
            filenames.append(filename)
        
        batch_size = 100
        all_metadata_records = []
        
        for i in range(0, len(dir_paths), batch_size):
            batch_dir_paths = dir_paths[i:i+batch_size]
            batch_filenames = filenames[i:i+batch_size]
            
            where_conditions = []
            parameters = []
            for j in range(len(batch_dir_paths)):
                where_conditions.append(f"(`{METADATA_TABLE.columns.parent_dir.name}` = ? AND `{METADATA_TABLE.columns.file_name.name}` = ?)")
                parameters.append(batch_dir_paths[j])
                parameters.append(batch_filenames[j])
                
            where_clause = " OR ".join(where_conditions)
            sql = f'''
                SELECT `{METADATA_TABLE.columns.id.name}`, 
                `{METADATA_TABLE.columns.file_name.name}`, 
                `{METADATA_TABLE.columns.parent_dir.name}` 
                FROM `{METADATA_TABLE.name}` 
                WHERE `{METADATA_TABLE.columns.is_dir.name}` = FALSE
                AND ({where_clause})
                '''
                
            query_result = metadata_server_api.query_rows(sql, parameters)
            batch_metadata_records = query_result.get('results', [])
            all_metadata_records.extend(batch_metadata_records)

        return all_metadata_records
    
    def _handle_tags_link(self, metadata_records, metadata_tag_id_to_file_paths, METADATA_TABLE):
        file_path_to_record_id = {}  # {file_path: record_id}
        for record in metadata_records:
            parent_dir = record.get(METADATA_TABLE.columns.parent_dir.name)
            file_name = record.get(METADATA_TABLE.columns.file_name.name)
            record_id = record.get(METADATA_TABLE.columns.id.name)
            
            file_path = posixpath.join(parent_dir, file_name)
            file_path_to_record_id[file_path] = record_id
        # create record id to tag id mapping
        record_to_tags_map = {}  # {record_id: [tag_id1, tag_id2]}
        for tag_id, file_paths in metadata_tag_id_to_file_paths.items():
            for file_path in file_paths:
                record_id = file_path_to_record_id.get(file_path)
                if not record_id:
                    continue
                    
                if record_id not in record_to_tags_map:
                    record_to_tags_map[record_id] = []
                    
                record_to_tags_map[record_id].append(tag_id)
        
        return record_to_tags_map
    
    def post(self, request, repo_id):
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        repo_name = repo.name

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled:
            error_msg = f'Metadata extension is not enabled for library {repo_name}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        tags_enabled = metadata.tags_enabled
        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)
        if not tags_enabled:
            metadata.tags_enabled = True
            metadata.tags_lang = 'en'
            metadata.save()
            init_tags(metadata_server_api)
        
        if not is_repo_admin(request.user.username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        from seafevents.repo_metadata.constants import TAGS_TABLE, METADATA_TABLE
        tags_table = get_table_by_name(metadata_server_api, TAGS_TABLE.name)
        if not tags_table:
            return api_error(status.HTTP_404_NOT_FOUND, 'tags table not found')
        tags_table_id = tags_table['id']
        
        # create new tags
        repo_tags = RepoTags.objects.get_all_by_repo_id(repo_id)
        if not repo_tags:
            return Response({'success': True})
        metadata_tags = self._create_metadata_tags(repo_tags, tags_table_id, metadata_server_api, TAGS_TABLE)

        tagged_files = FileTags.objects.select_related('repo_tag').filter(repo_tag__repo_id=repo_id)
        if not tagged_files:
            repo_tags.delete()
            return Response({'success': True})
        old_tag_name_to_file_paths, file_paths_set = self._get_old_tags_info(tagged_files)
        
        metadata_tag_id_to_file_paths = {}  # {tag_id: file_paths}
        for tag_name, tag_id in metadata_tags.items():
            if tag_name not in old_tag_name_to_file_paths:
                continue
            file_paths = old_tag_name_to_file_paths[tag_name]
            metadata_tag_id_to_file_paths[tag_id] = file_paths
        
        try:
            # query records
            metadata_records = self._get_metadata_records(metadata_server_api, file_paths_set, METADATA_TABLE)
            record_to_tags_map = self._handle_tags_link(metadata_records, metadata_tag_id_to_file_paths, METADATA_TABLE)
            metadata_server_api.insert_link(
                TAGS_TABLE.file_link_id, 
                METADATA_TABLE.id, 
                record_to_tags_map
            )
            # clear old tag data
            tagged_files.delete()
            repo_tags.delete()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        return Response({'success': True})


class MetadataExportTags(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, repo_id):
        tags_ids = request.data.get('tags_ids', None)
        if not tags_ids:
            return api_error(status.HTTP_400_BAD_REQUEST, 'tags_ids invalid')

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled or not metadata.tags_enabled:
            error_msg = f'The tags is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not can_read_metadata(request, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)

        from seafevents.repo_metadata.constants import TAGS_TABLE


        export_data = []
        tags_ids_str = ', '.join([f'"{id}"' for id in tags_ids])
        sql = f'SELECT * FROM {TAGS_TABLE.name} WHERE `{TAGS_TABLE.columns.id.name}` in ({tags_ids_str})'
        try:
            query_result = metadata_server_api.query_rows(sql).get('results')
            for tag in query_result:
                tag_parent_links = tag.get(TAGS_TABLE.columns.parent_links.key, [])
                tag_sub_links = tag.get(TAGS_TABLE.columns.sub_links.key, [])
                export_data.append({
                    '_id': tag.get(TAGS_TABLE.columns.id.name, ''),
                    '_tag_name': tag.get(TAGS_TABLE.columns.name.name, ''),
                    '_tag_color': tag.get(TAGS_TABLE.columns.color.name, ''),
                    '_tag_parent_links': [link_info.get('row_id', '') for link_info in tag_parent_links],
                    '_tag_sub_links': [link_info.get('row_id', '') for link_info in tag_sub_links],
                })
                
            response = HttpResponse(
                json.dumps(export_data, ensure_ascii=False),
                content_type='application/json'
            )
            response['Content-Disposition'] = 'attachment; filename="tags.json"'
            return response
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)


class MetadataImportTags(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def _handle_tag_links(self, new_tags, existing_tags, exist_tags_id_map, imported_existing_tags, resp, tags_table):
        exist_tags_ids = [tag.get(tags_table.columns.id.name, '') for tag in existing_tags]
        all_tags = new_tags + imported_existing_tags

        tags_id_map = {}
        imported_tags_ids = [tag_data.get(tags_table.columns.id.name, '') for tag_data in all_tags]
        for index, tag in enumerate(new_tags):
            old_tag_id = tag.get(tags_table.columns.id.name, '')
            tag[tags_table.columns.id.name] = resp.get('row_ids', [])[index]
            tags_id_map[old_tag_id] = tag.get(tags_table.columns.id.name, '')
        tags_id_map.update(exist_tags_id_map)

        processed_tags = [] # remove some non-existent tag ids
        for tag in new_tags:
            child_tags_ids = tag.get(tags_table.columns.sub_links.key, [])
            new_child_tags_ids = list(set(child_tags_ids) & set(imported_tags_ids))
            tag[tags_table.columns.sub_links.key] = new_child_tags_ids
            processed_tags.append(tag)
        for tag in imported_existing_tags:
            child_tags_ids = tag.get(tags_table.columns.sub_links.key, [])
            new_child_tags_ids = list(set(child_tags_ids) & set(imported_tags_ids))
            tag[tags_table.columns.sub_links.key] = new_child_tags_ids
            # Update the imported tag ID to an existing tag ID on the server
            tag[tags_table.columns.id.name] = tags_id_map[tag.get(tags_table.columns.id.name, '')]
            processed_tags.append(tag)
        
        child_links_map = {}
        # old child links -> new child links  and remove exist tags
        for tag in processed_tags:
            tag_id = tag.get(tags_table.columns.id.name, '')
            old_child_links = tag.get(tags_table.columns.sub_links.key, [])
            new_child_links = [tags_id_map[link] for link in old_child_links if link in tags_id_map]
            formatted_child_links = list(set(new_child_links) - set(exist_tags_ids))
            if formatted_child_links:
                child_links_map[tag_id] = formatted_child_links
        
        return child_links_map

    def _get_existing_tags(self, metadata_server_api, tag_names, tags_table):
        tag_names_str = ', '.join([f'"{tag_name}"' for tag_name in tag_names])
        sql = f'SELECT * FROM {tags_table.name} WHERE `{tags_table.columns.name.name}` in ({tag_names_str})'
        
        exist_rows = metadata_server_api.query_rows(sql)
        existing_tags = exist_rows.get('results', [])

        for item in existing_tags:
            tag_sub_links = item.get('_tag_sub_links', [])
            if tag_sub_links:
                sub_links = []
                for link in tag_sub_links:
                    sub_links.append(link['row_id'])
                item['_tag_sub_links'] = sub_links
        
        return existing_tags

    def _classify_tags(self, file_content, existing_tags, tags_table):
        new_tags = []
        imported_existing_tags = []
        existing_id_map = {}
        
        if existing_tags:
            existing_tag_names = [tag.get(tags_table.columns.name.name, '') for tag in existing_tags]
            processed_names = set()
            
            for tag_data in file_content:
                tag_name = tag_data.get(tags_table.columns.name.name, '')
                
                if tag_name in existing_tag_names and tag_name not in processed_names:
                    idx = existing_tag_names.index(tag_name)
                    imported_existing_tags.append(tag_data)
                    existing_id_map[tag_data.get(tags_table.columns.id.name, '')] = (
                        existing_tags[idx].get(tags_table.columns.id.name, '')
                    )
                elif tag_name not in processed_names:
                    new_tags.append(tag_data)
                    processed_names.add(tag_name)
        else:
            new_tags = file_content
            
        return new_tags, imported_existing_tags, existing_id_map

    def post(self, request, repo_id):
        file = request.FILES.get('file', None)
        if not file:
            return api_error(status.HTTP_400_BAD_REQUEST, 'file invalid')

        metadata = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not metadata or not metadata.enabled or not metadata.tags_enabled:
            error_msg = f'The tags is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = f'Library {repo_id} not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not can_read_metadata(request, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)
        from seafevents.repo_metadata.constants import TAGS_TABLE
        try:
            tags_table = get_table_by_name(metadata_server_api, TAGS_TABLE.name)
            if not tags_table:
                return api_error(status.HTTP_404_NOT_FOUND, 'tags table not found')
            tags_table_id = tags_table['id']
            file_content = json.loads(file.read().decode('utf-8'))
            tag_names = [tag.get(TAGS_TABLE.columns.name.name, '') for tag in file_content]
            if not tag_names:
                return Response({'success': True})
                
            existing_tags = self._get_existing_tags(metadata_server_api, tag_names, TAGS_TABLE)
            new_tags, imported_existing_tags, existing_id_map = self._classify_tags(
                file_content, existing_tags, TAGS_TABLE
            )
            
            if new_tags:
                create_tags_data = [
                    {
                        TAGS_TABLE.columns.name.name: tag.get(TAGS_TABLE.columns.name.name, ''),
                        TAGS_TABLE.columns.color.name: tag.get(TAGS_TABLE.columns.color.name, '')
                    }
                    for tag in new_tags
                ]
                resp = metadata_server_api.insert_rows(tags_table_id, create_tags_data)
            else:
                return Response({'success': True})
            
            # child links map structure: {tag_id: [child_tag_id1, child_tag_id2], ....}
            child_links_map = self._handle_tag_links(
                new_tags, existing_tags, existing_id_map, 
                imported_existing_tags, resp, TAGS_TABLE
            )
            
            if child_links_map:
                metadata_server_api.insert_link(TAGS_TABLE.self_link_id, tags_table_id, child_links_map, True)            
        except Exception as e:
            logger.exception(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')
        return Response({'success': True})


class MetadataStatistics(APIView):
    """
    API for retrieving library metadata statistics for the statistics view.
    Provides aggregated data for file type distribution, timeline analysis,
    creator breakdown, and summary statistics.
    """
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id):
        """
        Get statistics data for metadata view including:
        - File type distribution (for pie chart)
        - Files by creation/modification time (for bar chart)  
        - Files by creator (for horizontal bar chart)
        - Summary statistics (total files and collaborators count)
        """
        # Resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # Permission check
        if not can_read_metadata(request, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # Check if metadata is enabled
        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            metadata_server_api = MetadataServerAPI(repo_id, request.user.username)
            
            # Get all file records (excluding directories)
            from seafevents.repo_metadata.constants import METADATA_TABLE
            
            # Base SQL to get all files (not directories)
            sql = f'''
                SELECT 
                    `{METADATA_TABLE.columns.file_name.name}`,
                    `{METADATA_TABLE.columns.parent_dir.name}`,
                    `{METADATA_TABLE.columns.file_ctime.name}`,
                    `{METADATA_TABLE.columns.file_mtime.name}`,
                    `{METADATA_TABLE.columns.file_creator.name}`,
                    `{METADATA_TABLE.columns.file_modifier.name}`,
                    `{METADATA_TABLE.columns.file_type.name}`,
                    `{METADATA_TABLE.columns.is_dir.name}`
                FROM `{METADATA_TABLE.name}`
                WHERE `{METADATA_TABLE.columns.is_dir.name}` = false
                ORDER BY `{METADATA_TABLE.columns.file_ctime.name}` DESC
            '''
            
            logger.info(f'Fetching metadata statistics for repo {repo_id}')
            results = metadata_server_api.query_rows(sql, [])
            
            if not results or 'results' not in results:
                logger.warning(f'No metadata results found for repo {repo_id}')
                return Response({
                    'file_type_stats': [],
                    'time_stats': [],
                    'creator_stats': [],
                    'summary_stats': {
                        'total_files': 0,
                        'total_collaborators': 0
                    }
                })
            
            files_data = results['results']
            logger.info(f'Processing {len(files_data)} files for statistics')
            
            # Debug: log first few records to understand structure
            if files_data:
                logger.info(f'Sample record keys: {list(files_data[0].keys())}')
                logger.info(f'Sample record: {files_data[0]}')
            
            # Process statistics
            statistics = self._process_statistics(files_data)
            
            return Response(statistics)
            
        except Exception as e:
            logger.exception(f'Error generating metadata statistics for repo {repo_id}: {e}')
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

    def _process_statistics(self, files_data):
        """
        Process raw file data into statistics for visualization
        """
        from collections import defaultdict
        from datetime import datetime
        from seafevents.repo_metadata.constants import METADATA_TABLE
        
        # Initialize counters
        file_type_counts = defaultdict(int)
        time_stats = defaultdict(int)
        creator_counts = defaultdict(int)
        collaborators = set()
        
        # Process each file
        for file_data in files_data:
            filename = file_data.get(METADATA_TABLE.columns.file_name.name, '')
            ctime = file_data.get(METADATA_TABLE.columns.file_ctime.name)
            creator = file_data.get(METADATA_TABLE.columns.file_creator.name, '')
            modifier = file_data.get(METADATA_TABLE.columns.file_modifier.name, '')
            file_type = file_data.get(METADATA_TABLE.columns.file_type.name, '')
            
            # File type statistics (use database file_type directly)
            # If no file_type is set, use 'other' as default
            display_type = file_type if file_type else 'other'
            file_type_counts[display_type] += 1
            
            # Time statistics (by year)
            if ctime:
                try:
                    # Parse datetime string to extract year
                    if isinstance(ctime, str):
                        dt = datetime.fromisoformat(ctime.replace('Z', '+00:00'))
                    else:
                        dt = ctime
                    year = dt.year
                    time_stats[year] += 1
                except (ValueError, AttributeError) as e:
                    logger.warning(f'Failed to parse datetime {ctime}: {e}')
            
            # Creator statistics
            if creator:
                creator_counts[creator] += 1
                collaborators.add(creator)
            
            # Track modifiers as collaborators too
            if modifier and modifier != creator:
                collaborators.add(modifier)
        
        # Format file type statistics
        file_type_stats = [
            {'type': file_type, 'count': count}
            for file_type, count in file_type_counts.items()
        ]
        
        # Format time statistics (sorted by year)
        time_stats_list = [
            {'year': year, 'count': count}
            for year, count in sorted(time_stats.items())
        ]
        
        # Format creator statistics (top 10, sorted by count)
        creator_stats_sorted = sorted(creator_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        creator_stats = [
            {'creator': creator, 'count': count}
            for creator, count in creator_stats_sorted
        ]
        
        # Summary statistics
        summary_stats = {
            'total_files': len(files_data),
            'total_collaborators': len(collaborators)
        }
        
        logger.info(f'Statistics processed: {len(file_type_stats)} file types, {len(time_stats_list)} years, {len(creator_stats)} creators')
        
        return {
            'file_type_stats': file_type_stats,
            'time_stats': time_stats_list,
            'creator_stats': creator_stats,
            'summary_stats': summary_stats
        }
