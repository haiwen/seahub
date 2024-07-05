import logging
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from seahub.api2.utils import api_error, to_python_boolean
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.repo_metadata.models import RepoMetadata
from seahub.views import check_folder_permission
from seahub.repo_metadata.utils import add_init_metadata_task, gen_unique_id
from seahub.repo_metadata.metadata_server_api import MetadataServerAPI, list_metadata_records

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
        # recource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        permission = check_folder_permission(request, repo_id, '/')
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        try:
            record = RepoMetadata.objects.filter(repo_id=repo_id).first()
            if record and record.enabled:
                is_enabled = True
            else:
                is_enabled = False
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        
        return Response({'enabled': is_enabled})

    def put(self, request, repo_id):
        """
            enable a new repo's metadata manage
        """

        # check dose the repo have opened metadata manage
        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if record and record.enabled:
            error_msg = f'The metadata module is enabled for repo {repo_id}.'
            return api_error(status.HTTP_409_CONFLICT, error_msg)

        # recource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        permission = check_folder_permission(request, repo_id, '/')
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        params = {
            'repo_id': repo_id,
            'username': request.user.username
        }

        try:
            task_id = add_init_metadata_task(params=params)
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
        permission = check_folder_permission(request, repo_id, '/')
        if not permission:
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
        except ConnectionError as err:
            logger.error(err)
            status_code, reason = err
            return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, f'error from metadata server with code {status_code}: {reason}')
        except Exception as err:
            logger.error(err)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
            
        try:
            record.enabled = False
            record.save()
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
        parent_dir = request.GET.get('parent_dir')
        name = request.GET.get('name')
        page = request.GET.get('page', 1)
        per_page = request.GET.get('per_page', 1000)
        is_dir = request.GET.get('is_dir')
        order_by = request.GET.get('order_by')

        try:
            page = int(page)
            per_page = int(per_page)
        except:
            page = 1
            per_page = 1000

        if page <= 0:
            error_msg = 'page invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        if per_page <= 0:
            error_msg = 'per_page invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if is_dir:
            try:
                is_dir = to_python_boolean(is_dir)
            except:
                error_msg = 'is_dir is invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        # metadata enable check
        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled:
            error_msg = f'The metadata module is disabled for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        permission = check_folder_permission(request, repo_id, '/')
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        try:
            results = list_metadata_records(repo_id, request.user.username, parent_dir, name, is_dir, page, per_page, order_by)
        except ConnectionError as err:
            logger.error(err)
            status_code, reason = err
            return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, f'error from metadata server with code {status_code}: {reason}')
        except Exception as err:
            logger.error(err)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        
        return Response(results)


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

        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled:
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

        from seafevents.repo_metadata.metadata_server_api import METADATA_TABLE

        sql = f'SELECT * FROM `{METADATA_TABLE.name}` WHERE \
            `{METADATA_TABLE.columns.parent_dir.name}`=? AND `{METADATA_TABLE.columns.file_name.name}`=?;'
        parameters = [parent_dir, name]

        try:
            query_result = metadata_server_api.query_rows(sql, parameters)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        sys_columns = [
            METADATA_TABLE.columns.id.key,
            METADATA_TABLE.columns.file_creator.key,
            METADATA_TABLE.columns.file_ctime.key,
            METADATA_TABLE.columns.file_modifier.key,
            METADATA_TABLE.columns.file_mtime.key,
            METADATA_TABLE.columns.parent_dir.key,
            METADATA_TABLE.columns.file_name.key,
            METADATA_TABLE.columns.is_dir.key,
        ]

        rows = query_result.get('results')

        if not rows:
            error_msg = 'Record not found'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        metadata = query_result.get('metadata')
        editable_columns = []
        name_to_key = {}
        for col in metadata:
            col_key = col.get('key')
            col_name = col.get('name')
            name_to_key[col_name] = col_key
            if col_key in sys_columns:
                continue
            editable_columns.append(col.get('name'))

        row = {name_to_key[name]: value for name, value in rows[0].items()}
        query_result['row'] = row
        query_result['editable_columns'] = editable_columns

        query_result.pop('results', None)

        return Response(query_result)


class MetadataRecord(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def put(self, request, repo_id, record_id):
        column_name = request.data.get('column_name')
        new_value = request.data.get('value')

        if not column_name:
            error_msg = 'column_name invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not new_value:
            error_msg = 'value invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        record = RepoMetadata.objects.filter(repo_id=repo_id).first()
        if not record or not record.enabled:
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

        from seafevents.repo_metadata.metadata_server_api import METADATA_TABLE

        sys_column_names = [
            METADATA_TABLE.columns.id.name,
            METADATA_TABLE.columns.file_creator.name,
            METADATA_TABLE.columns.file_ctime.name,
            METADATA_TABLE.columns.file_modifier.name,
            METADATA_TABLE.columns.file_mtime.name,
            METADATA_TABLE.columns.parent_dir.name,
            METADATA_TABLE.columns.file_name.name,
            METADATA_TABLE.columns.is_dir.name,
        ]

        if column_name in sys_column_names:
            error_msg = 'column_name invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        row = {
            METADATA_TABLE.columns.id.name: record_id,
            column_name: new_value
        }

        try:
            metadata_server_api.update_rows(METADATA_TABLE.id, [row])
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

        from seafevents.repo_metadata.metadata_server_api import METADATA_TABLE, MetadataColumn
        columns = metadata_server_api.list_columns(METADATA_TABLE.id).get('columns')
        column_keys = set()
        column_names = set()

        for column in columns:
            column_keys.add(column.get('key'))
            column_names.add(column.get('name'))

        if column_name in column_names:
            error_msg = 'column_name duplicated.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        column_key = gen_unique_id(column_keys)
        column = MetadataColumn(column_key, column_name, column_type)

        try:
            metadata_server_api.add_column(METADATA_TABLE.id, column.to_dict())
        except Exception as e:
            logger.exception(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
