import logging, stat, posixpath, time
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from seahub.api2.utils import api_error, to_python_boolean
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.repo_metadata.models import RepoMetadata
from seahub.repo_metadata.metadata_server_api import MetadataServerAPI, METADATA_TABLE, METADATA_COLUMN_ID, METADATA_COLUMN_CREATOR, METADATA_COLUMN_CREATED_TIME, METADATA_COLUMN_MODIFIER, METADATA_COLUMN_MODIFIED_TIME, METADATA_COLUMN_PARENT_DIR, METADATA_COLUMN_NAME, METADATA_COLUMN_IS_DIR
from seahub.settings import ENABLE_METADATA_MANAGEMENT, METADATA_SERVER_URL
from seahub.views import check_folder_permission
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seaserv import seafile_api

logger = logging.getLogger(__name__)

def scan_library(repo_id, parent_dir = '/'):
    """
        scan a library recursively
    """
    dirents = seafile_api.list_dir_by_path(repo_id, parent_dir) #this one only shows is_dir and name without modifier
    scan_result = []
    for tmp_dirent in dirents:
        is_dir = stat.S_ISDIR(tmp_dirent.mode)
        dirent = seafile_api.get_dirent_by_path(repo_id, posixpath.join(parent_dir, tmp_dirent.obj_name))
        scan_result.append([
            '' if is_dir else dirent.modifier, #creator, the dir has not creator
            timestamp_to_isoformat_timestr(dirent.mtime), #ctime
            '' if is_dir else dirent.modifier, #modifier, the dir has not modifier
            timestamp_to_isoformat_timestr(dirent.mtime), #mtime
            parent_dir, 
            dirent.obj_name, #name
            'True' if is_dir else 'False'
        ])
        if is_dir:
            scan_result += scan_library(repo_id, posixpath.join(parent_dir, dirent.obj_name))
    return scan_result

def initial_metadata_base(repo_id, user): 
    metadata_server_api = MetadataServerAPI(repo_id, user)
    #create a metadata base for repo_id
    metadata_server_api.create_base()

    # Add columns: creator, created_time, modifier, modified_time, parent_dir, name
    metadata_server_api.add_column(METADATA_TABLE, METADATA_COLUMN_CREATOR)

    metadata_server_api.add_column(METADATA_TABLE, METADATA_COLUMN_CREATED_TIME)
    
    metadata_server_api.add_column(METADATA_TABLE, METADATA_COLUMN_MODIFIER)
    
    metadata_server_api.add_column(METADATA_TABLE, METADATA_COLUMN_MODIFIED_TIME)
    
    metadata_server_api.add_column(METADATA_TABLE, METADATA_COLUMN_PARENT_DIR)
    
    metadata_server_api.add_column(METADATA_TABLE, METADATA_COLUMN_NAME)
    
    metadata_server_api.add_column(METADATA_TABLE, METADATA_COLUMN_IS_DIR)

    #scan files and dirs
    rows = scan_library(repo_id)

    #insert current metadata to md server from root dir
    metadata_server_api.insert_rows(METADATA_TABLE, [
        METADATA_COLUMN_CREATOR,
        METADATA_COLUMN_CREATED_TIME,
        METADATA_COLUMN_MODIFIER,
        METADATA_COLUMN_MODIFIED_TIME,
        METADATA_COLUMN_PARENT_DIR,
        METADATA_COLUMN_NAME,
        METADATA_COLUMN_IS_DIR
    ], rows)

def check_repo_metadata_is_enable(repo_id):
    records = RepoMetadata.objects.filter(repo_id=repo_id)
    if not records:
        return False
    
    record = records.first()
    return record.enabled

def list_metadata_records(repo_id, user, parent_dir=None, name=None, is_dir=None, page=None, per_page=25, order_by=None):
    sql = f'SELECT `{METADATA_COLUMN_ID.name}`, `{METADATA_COLUMN_CREATOR.name}`, `{METADATA_COLUMN_CREATED_TIME.name}`, `{METADATA_COLUMN_MODIFIER.name}`, `{METADATA_COLUMN_MODIFIED_TIME.name}`, `{METADATA_COLUMN_PARENT_DIR.name}`, `{METADATA_COLUMN_NAME.name}`, `{METADATA_COLUMN_IS_DIR.name}` FROM `{METADATA_TABLE.name}`'

    parameters = []

    if parent_dir:
        sql += f' WHERE `{METADATA_COLUMN_PARENT_DIR.name}` LIKE ?'
        parameters.append(parent_dir)
        if name:
            sql += f' AND `{METADATA_COLUMN_NAME.name}` LIKE ?'
            parameters.append(name)

        if is_dir:
            sql += f' AND `{METADATA_COLUMN_IS_DIR.name}` LIKE ?'
            parameters.append(str(is_dir))
    elif name:
        sql += f' WHERE `{METADATA_COLUMN_NAME.name}` LIKE ?'
        parameters.append(name)

        if is_dir:
            sql += f' AND `{METADATA_COLUMN_IS_DIR.name}` LIKE ?'
            parameters.append(str(is_dir))
    elif is_dir:
        sql += f' WHERE `{METADATA_COLUMN_IS_DIR.name}` LIKE ?'
        parameters.append(str(is_dir))

    sql += f' ORDER BY {order_by}' if order_by else f' ORDER BY `{METADATA_COLUMN_PARENT_DIR.name}` ASC, `{METADATA_COLUMN_IS_DIR.name}` DESC, `{METADATA_COLUMN_NAME.name}` ASC' 

    if page:
        sql += f' LIMIT {(page - 1) * per_page}, {page * per_page}'

    sql += ';'

    #query_result
    metadata_server_api = MetadataServerAPI(repo_id, user)

    response_results = metadata_server_api.query_rows(sql, parameters)['results']
    if response_results:
        results = [
            {
                METADATA_COLUMN_ID.name: result[0],
                METADATA_COLUMN_CREATOR.name: result[1],
                METADATA_COLUMN_CREATED_TIME.name: result[2],
                METADATA_COLUMN_MODIFIER.name: result[3],
                METADATA_COLUMN_MODIFIED_TIME.name: result[4],
                METADATA_COLUMN_PARENT_DIR.name: result[5],
                METADATA_COLUMN_NAME.name: result[6],
                METADATA_COLUMN_IS_DIR.name: True if result[7] == 'True' else False
            }
            for result in response_results
        ]
    else:
        results = []

    return results

class MetadataManage(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id):
        """
            check the repo has enabled the metadata manage or not
        """
        if not ENABLE_METADATA_MANAGEMENT or not METADATA_SERVER_URL:
                error_msg = "Function is not supported"
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
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
            is_enabled = check_repo_metadata_is_enable(repo_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        
        return Response({'enabled': is_enabled})
            
    def put(self, request, repo_id):
        """
            enable a new repo's metadata manage
        """

        if not ENABLE_METADATA_MANAGEMENT or not METADATA_SERVER_URL:
                error_msg = "Function is not supported"
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
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

        try:
            metadata_server_api = MetadataServerAPI(repo_id, request.user.username)
            try:
                initial_metadata_base(repo_id, request.user.username)
            except ConnectionError as err:
                try:
                    metadata_server_api.delete_base()
                except:
                    pass
                logger.error(err)
                status_code, reason = err
                return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, f'error from metadata server with code {status_code}: {reason}')
            except Exception as err:
                try:
                    metadata_server_api.delete_base()
                except:
                    pass
                logger.error(err)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            if record:
                record.enabled = True
                record.save()
            else:
                repo_metadata = RepoMetadata(repo_id=repo_id, enabled=True)
                repo_metadata.save()
            
        except Exception as e:
            #rollback
            try:
                metadata_server_api.delete_base()
            except:
                pass

            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        
        return Response({'success': True})

    def delete(self, request, repo_id):
        """
            remove a repo's metadata manage
        """
        if not ENABLE_METADATA_MANAGEMENT or not METADATA_SERVER_URL:
                error_msg = "Function is not supported"
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
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
            error_msg = f'The repo {repo_id} has not enabled the metadata manage.'
            return api_error(status.HTTP_409_CONFLICT, error_msg)
        
        try:
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
        if not ENABLE_METADATA_MANAGEMENT or not METADATA_SERVER_URL:
                error_msg = "Function is not supported"
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        
        #args check
        parent_dir = request.GET.get('parent_dir')
        name = request.GET.get('name')
        page = request.GET.get('page', '1')
        per_page = request.GET.get('per_page', '1000')
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
        if not check_repo_metadata_is_enable(repo_id):
            error_msg = f'The metadata module is not enable for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

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
            results = list_metadata_records(repo_id, request.user.username, parent_dir, name, is_dir, page, per_page, order_by)
        except ConnectionError as err:
            logger.error(err)
            status_code, reason = err
            return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, f'error from metadata server with code {status_code}: {reason}')
        except Exception as err:
            logger.error(err)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        
        return Response({'results': results})

    def post(self, request, repo_id):
        """
            add a metadata results
            request body:
                parent_dir: required, if not specify, search from all dirs
                name: required, if not specify, search from all objects
        """
        if not ENABLE_METADATA_MANAGEMENT or not METADATA_SERVER_URL:
                error_msg = "Function is not supported"
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        # args check
        parent_dir = request.data.get('parent_dir')
        name = request.data.get('name')

        if not parent_dir:
            error_msg = 'parent_dir is not specified.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        if not name:
            error_msg = 'name is not specified.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # metadata enable check
        if not check_repo_metadata_is_enable(repo_id):
            error_msg = f'The metadata module is not enable for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

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
        
        # dirent check
        dirent_path = posixpath.join(parent_dir, name)
        dirent = seafile_api.get_dirent_by_path(repo_id, dirent_path)
        if not dirent:
            error_msg = 'dirent %s not found.' % dirent_path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        # check the current dirent exists or not
        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)
        is_dir = stat.S_ISDIR(dirent.mode)
        sql = f'SELECT `{METADATA_COLUMN_ID.name}` FROM `{METADATA_TABLE.name}` WHERE `{METADATA_COLUMN_PARENT_DIR.name}` = "{parent_dir}" AND `{METADATA_COLUMN_NAME.name}` = "{name}" AND `{METADATA_COLUMN_IS_DIR.name}` = "{True if is_dir else False}";'

        try:
            query_result = metadata_server_api.query_rows(sql)['results']
        except ConnectionError as err:
            logger.error(err)
            status_code, reason = err
            return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, f'error from metadata server with code {status_code}: {reason}')
        except Exception as err:
            logger.error(err)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        
        if query_result:
            error_msg = 'dirent %s has inserted in metadata base.' % dirent_path
            return api_error(status.HTTP_409_CONFLICT, error_msg)
        

        try:
            metadata_server_api.insert_rows(METADATA_TABLE, [
                METADATA_COLUMN_CREATOR,
                METADATA_COLUMN_CREATED_TIME,
                METADATA_COLUMN_MODIFIER,
                METADATA_COLUMN_MODIFIED_TIME, 
                METADATA_COLUMN_PARENT_DIR,
                METADATA_COLUMN_NAME,
                METADATA_COLUMN_IS_DIR
            ], [
                    [
                        '' if is_dir else dirent.modifier, #creator, the dir has not creator
                        timestamp_to_isoformat_timestr(dirent.mtime), #ctime
                        '' if is_dir else dirent.modifier, #modifier, the dir has not modifier
                        timestamp_to_isoformat_timestr(dirent.mtime), #mtime
                        parent_dir, 
                        dirent.obj_name, #name
                        'True' if is_dir else 'False'
                    ]
            ])
        except ConnectionError as err:
            logger.error(err)
            status_code, reason = err
            return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, f'error from metadata server with code {status_code}: {reason}')
        except Exception as err:
            logger.error(err)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
        
class MetadataRecord(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def put(self, request, repo_id, record_id):
        """
            modify a metadata base recode by the record_id
            for simplfying the precudures, all parameters are required
            request body:
                parent_dir, required
                name, required
        """

        if not ENABLE_METADATA_MANAGEMENT or not METADATA_SERVER_URL:
                error_msg = "Function is not supported"
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        parent_dir = request.data.get('parent_dir')
        name = request.data.get('name')

        #args check
        for body_key in ('parent_dir', 'name'):
            if eval(body_key) is None:
                error_msg = f"{body_key} is not specified"
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # metadata enable check
        if not check_repo_metadata_is_enable(repo_id):
            error_msg = f'The metadata module is not enable for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

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
        
        # dirent check
        dirent_path = posixpath.join(parent_dir, name)
        dirent = seafile_api.get_dirent_by_path(repo_id, dirent_path)
        if not dirent:
            error_msg = 'dirent %s not found.' % dirent_path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        # check the current dirent exists or not
        is_dir = stat.S_ISDIR(dirent.mode)

        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)

        sql = f'SELECT `{METADATA_COLUMN_ID.name}` FROM `{METADATA_TABLE.name}` WHERE `{METADATA_COLUMN_PARENT_DIR.name}` = "{parent_dir}" AND `{METADATA_COLUMN_NAME.name}` = "{name}" AND `{METADATA_COLUMN_ID.name}` != "{record_id}" AND `{METADATA_COLUMN_IS_DIR.name}` = "{True if is_dir else False}";'

        try:
            query_result = metadata_server_api.query_rows(sql)['results']
        except ConnectionError as err:
            logger.error(err)
            status_code, reason = err
            return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, f'error from metadata server with code {status_code}: {reason}')
        except Exception as err:
            logger.error(err)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        
        if query_result:
            error_msg = f'The {"folder" if is_dir else "file"} {dirent_path} is exists in the metadata base'
            return api_error(status.HTTP_409_CONFLICT, error_msg)

        # dirent type originality check
        sql = f'SELECT `{METADATA_COLUMN_ID.name}` FROM `{METADATA_TABLE.name}` WHERE `{METADATA_COLUMN_ID.name}` = "{record_id}" AND `{METADATA_COLUMN_IS_DIR.name}` != "{True if is_dir else False}";'
        
        try:
            query_result = metadata_server_api.query_rows(sql)['results']
        except ConnectionError as err:
            logger.error(err)
            status_code, reason = err
            return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, f'error from metadata server with code {status_code}: {reason}')
        except Exception as err:
            logger.error(err)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        
        if query_result:
            error_msg = f'The type of new dirent {dirent_path} is not matched with the original type'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        modifier = request.user.username
        modify_time = timestamp_to_isoformat_timestr(int(time.time()))

        try:
            metadata_server_api.update_rows(METADATA_TABLE, [
                METADATA_COLUMN_ID,
                METADATA_COLUMN_MODIFIER,
                METADATA_COLUMN_MODIFIED_TIME, 
                METADATA_COLUMN_PARENT_DIR,
                METADATA_COLUMN_NAME
            ], [
                [
                    record_id,
                    modifier,
                    modify_time,
                    parent_dir, 
                    name
                ]
            ])
        except ConnectionError as err:
            logger.error(err)
            status_code, reason = err
            return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, f'error from metadata server with code {status_code}: {reason}')
        except Exception as err:
            logger.error(err)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({
            'success': True
        })

    def delete(self, request, repo_id, record_id):
        if not ENABLE_METADATA_MANAGEMENT or not METADATA_SERVER_URL:
                error_msg = "Function is not supported"
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        # metadata enable check
        if not check_repo_metadata_is_enable(repo_id):
            error_msg = f'The metadata module is not enable for repo {repo_id}.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

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
        
        metadata_server_api = MetadataServerAPI(repo_id, request.user.username)
        try:
            metadata_server_api.delete_rows(METADATA_TABLE, [record_id])
        except ConnectionError as err:
            logger.error(err)
            status_code, reason = err
            return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, f'error from metadata server with code {status_code}: {reason}')
        except Exception as err:
            logger.error(err)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({
            'success': True
        })
