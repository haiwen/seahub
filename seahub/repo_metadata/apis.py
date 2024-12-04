import json
import logging
import os
from datetime import datetime

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from seahub.api2.utils import api_error
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.repo_metadata.models import RepoMetadata, RepoMetadataViews
from seahub.views import check_folder_permission
from seahub.repo_metadata.utils import add_init_metadata_task, gen_unique_id, init_metadata, \
    get_unmodifiable_columns, can_read_metadata, init_faces, \
    extract_file_details, get_someone_similar_faces, remove_faces_table, FACES_SAVE_PATH, \
    init_tags, remove_tags_table, add_init_face_recognition_task
from seahub.repo_metadata.metadata_server_api import MetadataServerAPI, list_metadata_view_records
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.utils.repo import is_repo_admin
from seaserv import seafile_api


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
        try:
            record = RepoMetadata.objects.filter(repo_id=repo_id).first()
            if record and record.enabled:
                is_enabled = True
            if record and record.tags_enabled:
                is_tags_enabled = True
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({
            'enabled': is_enabled,
            'tags_enabled': is_tags_enabled,
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
            RepoMetadata.objects.enable_metadata(repo_id)
        except Exception as e:
            logger.exception(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)
        init_metadata(metadata_server_api)

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

        # recource check
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
            record.save()
            RepoMetadataViews.objects.filter(repo_id=repo_id).delete()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

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

        #args check
        view_id = request.GET.get('view_id', '')
        start = request.GET.get('start', 0)
        limit = request.GET.get('limit', 100)

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
            results = list_metadata_view_records(repo_id, request.user.username, view, start, limit)
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
            record_id = record.get('_id')
            to_updated_record = record_id_to_record.get(record_id)
            update = {
                METADATA_TABLE.columns.id.name: record_id,
            }
            column_name, value = list(to_updated_record.items())[0]
            if column_name not in unmodifiable_column_names:
                try:
                    column = next(column for column in columns if column['name'] == column_name)
                    if value and column['type'] == 'date':
                        column_data = column.get('data', {})
                        format = column_data.get('format', 'YYYY-MM-DD')
                        saved_format = '%Y-%m-%d'
                        if 'HH:mm:ss' in format:
                            saved_format = '%Y-%m-%d %H:%M:%S'
                        elif 'HH:mm' in format:
                            saved_format = '%Y-%m-%d %H:%M'

                        datetime_obj = datetime.strptime(value, saved_format)
                        update[column_name] = datetime_to_isoformat_timestr(datetime_obj)
                    elif column['type'] == 'single-select' and not value:
                        update[column_name] = None
                    else:
                        update[column_name] = value
                    rows.append(update)
                except Exception as e:
                    pass
        if rows:
            try:
                metadata_server_api.update_rows(METADATA_TABLE.id, rows)
            except Exception as e:
                logger.exception(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})

class MetadataRecordInfo(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id):
        parent_dir = request.GET.get('parent_dir')
        name = request.GET.get('name')
        if not parent_dir:
            error_msg = 'parent_dir invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not name:
            error_msg = 'name invalid'
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

        sql = f'SELECT * FROM `{METADATA_TABLE.name}` WHERE \
            `{METADATA_TABLE.columns.parent_dir.name}`=? AND `{METADATA_TABLE.columns.file_name.name}`=?;'
        parameters = [parent_dir, name]

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
        view_name = request.data.get('name')
        view_type = request.data.get('type', 'table')
        view_data = request.data.get('data', {})
        if not view_name:
            error_msg = 'view name is invalid.'
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

        try:
            new_view = RepoMetadataViews.objects.add_view(repo_id, view_name, view_type, view_data)
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
            repo_id = repo_id,
        ).first()
        if not views:
            error_msg = 'The metadata views does not exists.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if view_id not in views.view_ids:
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
        if not view_id:
            error_msg = 'view_id is invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        views = RepoMetadataViews.objects.filter(
            repo_id=repo_id
        ).first()
        if not views:
            error_msg = 'The metadata views does not exists.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if view_id not in views.view_ids:
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
            result = RepoMetadataViews.objects.delete_view(repo_id, view_id)
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
        if not view_id:
            error_msg = 'view_id invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        views = RepoMetadataViews.objects.filter(
            repo_id=repo_id
        ).first()
        if not views:
            error_msg = 'The metadata views does not exists.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if view_id not in views.view_ids:
            error_msg = 'view_id %s does not exists.' % view_id
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
            result = RepoMetadataViews.objects.duplicate_view(repo_id, view_id)
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'view': result})


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
        # put view_id in front of target_view_id
        view_id = request.data.get('view_id')
        if not view_id:
            error_msg = 'view_id is invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        target_view_id = request.data.get('target_view_id')
        if not target_view_id:
            error_msg = 'target_view_id is invalid.'
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

        if view_id not in views.view_ids:
            error_msg = 'view_id %s does not exists.' % view_id
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if target_view_id not in views.view_ids:
            error_msg = 'target_view_id %s does not exists.' % target_view_id
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
            results = RepoMetadataViews.objects.move_view(repo_id, view_id, target_view_id)
        except Exception as e:
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

        from seafevents.repo_metadata.constants import FACES_TABLE

        try:
            metadata = metadata_server_api.get_metadata()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        tables = metadata.get('tables', [])
        faces_table_id = [table['id'] for table in tables if table['name'] == FACES_TABLE.name]
        faces_table_id = faces_table_id[0] if faces_table_id else None
        if not faces_table_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'face recognition not be used')

        sql = f'SELECT `{FACES_TABLE.columns.id.name}`, `{FACES_TABLE.columns.name.name}`, `{FACES_TABLE.columns.photo_links.name}`, `{FACES_TABLE.columns.vector.name}` FROM `{FACES_TABLE.name}` WHERE `{FACES_TABLE.columns.photo_links.name}` IS NOT NULL LIMIT {start}, {limit}'

        try:
            query_result = metadata_server_api.query_rows(sql)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        faces_records = query_result.get('results')
        metadata_columns = query_result.get('metadata', [])
        metadata_columns.append({
            'key': '_is_someone',
            'type': 'checkbox',
            'name': '_is_someone',
            'data': None,
        })

        if not faces_records:
            return Response({
                'metadata': metadata_columns,
                'results': [],
            })

        if not query_result:
            return Response({
                'metadata': metadata_columns,
                'results': [],
            })

        for record in faces_records:
            vector = record.get(FACES_TABLE.columns.vector.name, None)
            record['_is_someone'] = bool(vector)
            if FACES_TABLE.columns.vector.name in record:
                del record[FACES_TABLE.columns.vector.name]

        return Response({
            'metadata': metadata_columns,
            'results': faces_records,
        })


class FacesRecord(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def put(self, request, repo_id):
        name = request.data.get('name')
        record_id = request.data.get('record_id')
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
        from seafevents.repo_metadata.constants import FACES_TABLE

        try:
            metadata = metadata_server_api.get_metadata()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        tables = metadata.get('tables', [])
        faces_table_id = [table['id'] for table in tables if table['name'] == FACES_TABLE.name]
        faces_table_id = faces_table_id[0] if faces_table_id else None
        if not faces_table_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'face recognition not be used')

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
        from seafevents.repo_metadata.constants import METADATA_TABLE, FACES_TABLE

        try:
            metadata = metadata_server_api.get_metadata()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        tables = metadata.get('tables', [])
        faces_table_id = [table['id'] for table in tables if table['name'] == FACES_TABLE.name]
        faces_table_id = faces_table_id[0] if faces_table_id else None
        if not faces_table_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'face recognition not be used')

        sql = f'SELECT `{FACES_TABLE.columns.photo_links.name}` FROM `{FACES_TABLE.name}` WHERE `{FACES_TABLE.columns.id.name}` = "{people_id}" LIMIT {start}, {limit}'

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
            record_ids = [item['row_id'] for item in faces_record.get(FACES_TABLE.columns.photo_links.name, [])]
            selected_ids = record_ids[start:limit]
            selected_ids_str = ', '.join(["'%s'" % id for id in selected_ids])

            sql = f'SELECT `{METADATA_TABLE.columns.id.name}`, `{METADATA_TABLE.columns.parent_dir.name}`, `{METADATA_TABLE.columns.file_name.name}`, `{METADATA_TABLE.columns.file_ctime.name}` FROM `{METADATA_TABLE.name}` WHERE `{METADATA_TABLE.columns.id.name}` IN ({selected_ids_str}) ORDER BY `{METADATA_TABLE.columns.file_ctime.name}`'
            someone_photos_result = metadata_server_api.query_rows(sql)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response(someone_photos_result)


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
        # recource check
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


# tags
class MetadataTagsStatusManage(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def put(self, request, repo_id):
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

        try:
           metadata.tags_enabled = True
           metadata.save()
        except Exception as e:
            logger.exception(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

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
        from seafevents.repo_metadata.constants import TAGS_TABLE

        try:
            metadata = metadata_server_api.get_metadata()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        tables = metadata.get('tables', [])
        tags_table_id = [table['id'] for table in tables if table['name'] == TAGS_TABLE.name]
        tags_table_id = tags_table_id[0] if tags_table_id else None
        if not tags_table_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'tags not be used')

        sql = f'SELECT * FROM `{TAGS_TABLE.name}` ORDER BY `_ctime` LIMIT {0}, {1000}'

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
            error_msg = f'Tags data is required.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

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

        from seafevents.repo_metadata.constants import TAGS_TABLE
        try:
            metadata = metadata_server_api.get_metadata()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        tables = metadata.get('tables', [])
        tags_table_id = [table['id'] for table in tables if table['name'] == TAGS_TABLE.name]
        tags_table_id = tags_table_id[0] if tags_table_id else None
        if not tags_table_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'tags not be used')

        try:
            resp = metadata_server_api.insert_rows(tags_table_id, tags_data)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        row_ids = resp.get('row_ids', [])

        if not row_ids:
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        sql = 'SELECT * FROM %s WHERE `%s` in (%s)' % (TAGS_TABLE.name, TAGS_TABLE.columns.id.name, ', '.join(["'%s'" % id for id in row_ids]))

        try:
            query_new_rows = metadata_server_api.query_rows(sql)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({ 'tags': query_new_rows.get('results', []) })

    def put(self, request, repo_id):
        tags_data = request.data.get('tags_data')
        if not tags_data:
            error_msg = 'tags_data invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

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

        from seafevents.repo_metadata.constants import TAGS_TABLE
        try:
            metadata = metadata_server_api.get_metadata()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        tables = metadata.get('tables', [])
        tags_table_id = [table['id'] for table in tables if table['name'] == TAGS_TABLE.name]
        tags_table_id = tags_table_id[0] if tags_table_id else None
        if not tags_table_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'tags not be used')

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
            error_msg = f'Tag ids is required.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

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

        from seafevents.repo_metadata.constants import TAGS_TABLE
        try:
            metadata = metadata_server_api.get_metadata()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        tables = metadata.get('tables', [])
        tags_table_id = [table['id'] for table in tables if table['name'] == TAGS_TABLE.name]
        tags_table_id = tags_table_id[0] if tags_table_id else None
        if not tags_table_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'tags not be used')

        try:
            resp = metadata_server_api.delete_rows(tags_table_id, tag_ids)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

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

        tags = request.data.get('tags', [])

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

        from seafevents.repo_metadata.constants import TAGS_TABLE, METADATA_TABLE
        try:
            metadata = metadata_server_api.get_metadata()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        tables = metadata.get('tables', [])
        tags_table_id = [table['id'] for table in tables if table['name'] == TAGS_TABLE.name]
        tags_table_id = tags_table_id[0] if tags_table_id else None
        if not tags_table_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'tags not be used')

        file_record_ids = []
        file_tags_map = {}
        for file_tags in file_tags_data:
            record_id = file_tags.get('record_id', '')
            tags = file_tags.get('tags', [])
            if record_id:
                file_record_ids.append(record_id)
                file_tags_map[record_id] = tags

        if not file_record_ids:
            return Response({'success': [], 'fail': []})

        file_record_ids_str = ', '.join(["'%s'" % id for id in file_record_ids])
        current_result_sql = f'SELECT `{METADATA_TABLE.columns.tags.key}`, `{METADATA_TABLE.columns.id.key}` FROM `{METADATA_TABLE.name}` WHERE `{METADATA_TABLE.columns.id.key}` IN ({file_record_ids_str})'
        try:
            current_result_query = metadata_server_api.query_rows(current_result_sql)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        success_records = []
        failed_records = []
        files_records = current_result_query.get('results', [])
        if not files_records:
            return api_error(status.HTTP_404_NOT_FOUND, 'files not found')

        for file_record in files_records:
            current_tags = file_record.get(METADATA_TABLE.columns.tags.key, [])
            record_id = file_record.get(METADATA_TABLE.columns.id.key)
            tags = file_tags_map[record_id]

            try:
                if not current_tags:
                    metadata_server_api.insert_link(repo_id, TAGS_TABLE.link_id, METADATA_TABLE.id, { record_id: tags })
                else:
                    metadata_server_api.update_link(repo_id, TAGS_TABLE.link_id, METADATA_TABLE.id, { record_id: tags })
                success_records.append(record_id)
            except Exception as e:
                failed_records.append(record_id)

        return Response({'success': success_records, 'fail': failed_records})


class MetadataTagFiles(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id, tag_id):
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

        from seafevents.repo_metadata.constants import TAGS_TABLE, METADATA_TABLE
        try:
            metadata = metadata_server_api.get_metadata()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        tables = metadata.get('tables', [])
        tags_table_id = [table['id'] for table in tables if table['name'] == TAGS_TABLE.name]
        tags_table_id = tags_table_id[0] if tags_table_id else None
        if not tags_table_id:
            return api_error(status.HTTP_404_NOT_FOUND, 'tags not be used')

        tag_files_record_sql = f'SELECT * FROM {TAGS_TABLE.name} WHERE `{TAGS_TABLE.columns.id.name}` = "{tag_id}"'
        try:
            tag_query = metadata_server_api.query_rows(tag_files_record_sql)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        tag_files_records = tag_query.get('results', [])
        if not tag_files_records:
            return Response({ 'metadata': [], 'results': [] })

        tag_files_record = tag_files_records[0]
        tag_files_record_ids = tag_files_record.get(TAGS_TABLE.columns.file_links.name , [])

        if not tag_files_record_ids:
            return Response({ 'metadata': [], 'results': [] })

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

