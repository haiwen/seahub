import logging, requests, stat, posixpath, jwt, time
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from seahub.api2.utils import api_error, to_python_boolean
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.repo_metadata.models import RepoMetadata
from seahub.settings import ENABLE_METADATA_MANAGEMENT, MATEDATA_SERVER_URL, METEDATA_SERVER_SECRET_KEY
from seahub.views import check_folder_permission
from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seaserv import seafile_api

logger = logging.getLogger(__name__)

class __structure_table(object):
    def __init__(self, id, name):
        self.id = id
        self.name = name

class __structure_column(object):
    def __init__(self, key, name, type):
        self.key = key
        self.name = name
        self.type = type
    def to_build_column_dict(self):
        return {
            'name': self.name,
            'type': self.type
        }

TABLE = __structure_table('0001', 'Table1')
COLUMN_ID = __structure_column('0', '_id', 'text')
COLUMN_CREATOR = __structure_column('16', 'creator', 'text')
COLUMN_CREATE_TIME = __structure_column('17', 'create_time', 'date')
COLUMN_MODIFIER = __structure_column('18', 'modifier', 'text')
COLUMN_MODIFY_TIME = __structure_column('19', 'modify_time', 'date')
COLUMN_CURRENT_DIR = __structure_column('20', 'current_dir', 'text')
COLUMN_NAME = __structure_column('21', 'name', 'text')
COLUMN_IS_DIR = __structure_column('22', 'is_dir', 'text')

def gen_headers(repo_id):
    payload = {
        'exp': int(time.time()) + 300, 
        'base_id': repo_id
    }
    token = jwt.encode(payload, METEDATA_SERVER_SECRET_KEY, algorithm='HS256')
    return {"Authorization": "Bearer %s" % token}

def scan_library(repo_id, current_dir = '/'):
    '''
        scan a library recursively
    '''
    dirents = seafile_api.list_dir_by_path(repo_id, current_dir) #this one only shows is_dir and name without modifier
    scan_result = []
    for tmp_dirent in dirents:
        is_dir = stat.S_ISDIR(tmp_dirent.mode)
        dirent = seafile_api.get_dirent_by_path(repo_id, posixpath.join(current_dir, tmp_dirent.obj_name))
        scan_result.append([
            '' if is_dir else dirent.modifier, #creator, the dir has not creator
            timestamp_to_isoformat_timestr(dirent.mtime), #ctime
            '' if is_dir else dirent.modifier, #modifier, the dir has not modifier
            timestamp_to_isoformat_timestr(dirent.mtime), #mtime
            current_dir, 
            dirent.obj_name, #name
            'True' if is_dir else 'False'
        ])
        if is_dir:
            scan_result += scan_library(repo_id, posixpath.join(current_dir, dirent.obj_name))
    return scan_result

def check_and_rollback(response, repo_id, headers):
    if response.status_code >= 200 and response.status_code < 300:
        return
    else:
        url = f'{MATEDATA_SERVER_URL}/api/v1/base/{repo_id}'
        requests.delete(url, headers=headers)
        if isinstance(response.reason, bytes):
            try:
                reason = response.reason.decode("utf-8")
            except UnicodeDecodeError:
                reason = response.reason.decode("iso-8859-1")
        else:
            reason = response.reason
        return response.status_code, reason

def initial_metadata_base(repo_id): 
    headers = gen_headers(repo_id)

    #create a metadata base for repo_id
    url = f'{MATEDATA_SERVER_URL}/api/v1/base/{repo_id}'
    response = requests.post(url, headers=headers)
    if err := check_and_rollback(response, repo_id, headers):
        return err

    # Add columns: creator, create_time, modifier, modify_time, current_dir, name
    url = f'{MATEDATA_SERVER_URL}/api/v1/base/{repo_id}/columns'
    data = {
        'table_id': TABLE.id,
        'column': COLUMN_CREATOR.to_build_column_dict()
    }
    response = requests.post(url, json=data, headers=headers)
    if err := check_and_rollback(response, repo_id, headers):
        return err
    
    data = {
        'table_id': TABLE.id,
        'column': COLUMN_CREATE_TIME.to_build_column_dict()
    }
    response = requests.post(url, json=data, headers=headers)
    if err := check_and_rollback(response, repo_id, headers):
        return err
    
    data = {
        'table_id': TABLE.id,
        'column': COLUMN_MODIFIER.to_build_column_dict()
    }
    response = requests.post(url, json=data, headers=headers)
    if err := check_and_rollback(response, repo_id, headers):
        return err
    
    data = {
        'table_id': TABLE.id,
        'column': COLUMN_MODIFY_TIME.to_build_column_dict()
    }
    response = requests.post(url, json=data, headers=headers)
    if err := check_and_rollback(response, repo_id, headers):
        return err
    
    data = {
        'table_id': TABLE.id,
        'column': COLUMN_CURRENT_DIR.to_build_column_dict()
    }
    response = requests.post(url, json=data, headers=headers)
    if err := check_and_rollback(response, repo_id, headers):
        return err

    data = {
        'table_id': TABLE.id,
        'column': COLUMN_NAME.to_build_column_dict()
    }
    response = requests.post(url, json=data, headers=headers)
    if err := check_and_rollback(response, repo_id, headers):
        return err
    
    data = {
        'table_id': TABLE.id,
        'column': COLUMN_IS_DIR.to_build_column_dict()
    }
    response = requests.post(url, json=data, headers=headers)
    response.raise_for_status
    if err := check_and_rollback(response, repo_id, headers):
        return err

    #scan files and dirs
    rows = scan_library(repo_id)

    #insert current metadata to md server from root dir
    url = f'{MATEDATA_SERVER_URL}/api/v1/base/{repo_id}/rows'
    data = {
            'table_id': TABLE.id,
            'column_keys': [
                COLUMN_CREATOR.key,
                COLUMN_CREATE_TIME.key,
                COLUMN_MODIFIER.key,
                COLUMN_MODIFY_TIME.key, 
                COLUMN_CURRENT_DIR.key,
                COLUMN_NAME.key,
                COLUMN_IS_DIR.key
            ],
            'rows': rows
        }
    response = requests.post(url, json=data, headers=headers)
    if err := check_and_rollback(response, repo_id, headers):
        return err

def check_repo_metadata_is_enable(repo_id, require_record=False):
    records = RepoMetadata.objects.filter(repo_id=repo_id)
    if not records:
        return False
    
    record = records.first()
    return (record.enabled, record) if require_record else record.enabled

class MetadataManage(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id):
        '''
            check the repo has enabled the metadata manage or not
        '''
        if not ENABLE_METADATA_MANAGEMENT or not MATEDATA_SERVER_URL:
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
            return Response({
                'enabled': check_repo_metadata_is_enable(repo_id)
            })
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
            
    def post(self, request, repo_id):
        '''
            enable a new repo's metadata manage
        '''

        if not ENABLE_METADATA_MANAGEMENT or not MATEDATA_SERVER_URL:
                error_msg = "Function is not supported"
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        # check dose the repo have opened metadata manage
        if check_repo_metadata_is_enable(repo_id):
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
        
        err = initial_metadata_base(repo_id)
        if err:
            status_code, reason = err
            logger.error(f'Metadata initial err, {status_code}: {reason}')
            return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, f'error from metadata server with code  {status_code}: {reason}')
        
        try:
            repo_metadata = RepoMetadata(repo_id=repo_id, enabled=True)
            repo_metadata.save()
            return Response({
                'success': True
            })
        except Exception as e:
            #rollback
            headers = gen_headers(repo_id)
            url = f'{MATEDATA_SERVER_URL}/api/v1/base/{repo_id}'
            requests.delete(url, headers=headers)

            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

    def delete(self, request, repo_id):
        '''
            remove a repo's metadata manage
        '''
        if not ENABLE_METADATA_MANAGEMENT or not MATEDATA_SERVER_URL:
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
        enabled, record = check_repo_metadata_is_enable(repo_id, True)
        if not enabled:
            error_msg = f'The repo {repo_id} has not enabled the metadata manage.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        try:
            url = f'{MATEDATA_SERVER_URL}/api/v1/base/{repo_id}'
            headers = gen_headers(repo_id)
            response = requests.delete(url, headers=headers)
            if response.status_code < 200 or response.status_code > 299:
                return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, f'error from metadata server with code {response.status_code}: {response.reason}')
            
            record.enabled = False
            record.save()
            return Response({
                'success': True
            })
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
        
class MetadataManageRecords(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, repo_id):
        '''
            fetch a metadata results
            request body:
                parent_dir: optional, if not specify, search from all dirs
                name: optional, if not specify, search from all objects
                page: optional, the current page
                perpage: optional, if use page, default is 25
                is_dir: optional, True or False
        '''
        if not ENABLE_METADATA_MANAGEMENT or not MATEDATA_SERVER_URL:
                error_msg = "Function is not supported"
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        
        #args check
        parent_dir = request.GET.get('parent_dir')
        name = request.GET.get('name')
        page = request.GET.get('page')
        perpage = request.GET.get('perpage')
        is_dir = request.GET.get('is_dir')

        if page:
            try:
                page = int(page)
            except ValueError:
                error_msg = 'Page is not vaild.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            
            if perpage:
                try:
                    perpage = int(perpage)
                except ValueError:
                    error_msg = 'Perpage is not vaild.'
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
                
            else:
                perpage = 25

        if is_dir:
            try:
                is_dir = to_python_boolean(is_dir)
            except:
                error_msg = 'is_dir is not vaild.'
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
        
        sql = f'SELECT `{COLUMN_ID.name}`, `{COLUMN_CREATOR.name}`, `{COLUMN_CREATE_TIME.name}`, `{COLUMN_MODIFIER.name}`, `{COLUMN_MODIFY_TIME.name}`, `{COLUMN_CURRENT_DIR.name}`, `{COLUMN_NAME.name}`, `{COLUMN_IS_DIR.name}` FROM `{TABLE.name}`'

        parameters = []

        if parent_dir:
            sql += f' WHERE `{COLUMN_CURRENT_DIR.name}` LIKE ?'
            parameters.append(parent_dir)
            if name:
                sql += f' AND `{COLUMN_NAME.name}` LIKE ?'
                parameters.append(name)

            if is_dir:
                sql += f' AND `{COLUMN_IS_DIR.name}` LIKE ?'
                parameters.append(str(is_dir))
        elif name:
            sql += f' WHERE `{COLUMN_NAME.name}` LIKE ?'
            parameters.append(name)

            if is_dir:
                sql += f' AND `{COLUMN_IS_DIR.name}` LIKE ?'
                parameters.append(str(is_dir))
        elif is_dir:
            sql += f' WHERE `{COLUMN_IS_DIR.name}` LIKE ?'
            parameters.append(str(is_dir))

        sql += f' ORDER BY `{COLUMN_CURRENT_DIR.name}` ASC, `{COLUMN_IS_DIR.name}` DESC, `{COLUMN_NAME.name}` ASC'

        if page:
            sql += f' LIMIT {(page - 1) * perpage}, {page * perpage}'

        sql += ';'

        post_data = {
            'sql': sql
        }

        if parameters:
            post_data['params'] = parameters

        #query_result
        url = f'{MATEDATA_SERVER_URL}/api/v1/base/{repo_id}/query'
        headers = gen_headers(repo_id)
        response = requests.post(url, json=post_data, headers=headers)
        if response.status_code < 200 or response.status_code > 299:
            return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, f'error from metadata server with code {response.status_code}: {response.reason}')
        
        response_results = response.json()['results']
        if response_results:
            results = [
                {
                    COLUMN_ID.name: result[0],
                    COLUMN_CREATOR.name: result[1],
                    COLUMN_CREATE_TIME.name: result[2],
                    COLUMN_MODIFIER.name: result[3],
                    COLUMN_MODIFY_TIME.name: result[4],
                    COLUMN_CURRENT_DIR.name: result[5],
                    COLUMN_NAME.name: result[6],
                    COLUMN_IS_DIR.name: True if result[7] == 'True' else False
                }
                for result in response_results
            ]
        else:
            results = []
        return Response({
            'results': results
        })

    def post(self, request, repo_id):
        '''
            add a metadata results
            request body:
                parent_dir: required, if not specify, search from all dirs
                name: required, if not specify, search from all objects
        '''
        if not ENABLE_METADATA_MANAGEMENT or not MATEDATA_SERVER_URL:
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
        is_dir = stat.S_ISDIR(dirent.mode)
        sql = f'SELECT `{COLUMN_ID.name}` FROM `{TABLE.name}` WHERE `{COLUMN_CURRENT_DIR.name}` = "{parent_dir}" AND `{COLUMN_NAME.name}` = "{name}" AND `{COLUMN_IS_DIR.name}` = "{True if is_dir else False}";'

        url = f'{MATEDATA_SERVER_URL}/api/v1/base/{repo_id}/query'
        headers = gen_headers(repo_id)
        response = requests.post(url, json={'sql': sql}, headers=headers)
        if response.status_code < 200 or response.status_code > 299:
            return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, f'error from metadata server with code {response.status_code}: {response.reason}')
        
        query_result = response.json().get('results')
        if query_result:
            error_msg = 'dirent %s has inserted in metadata base.' % dirent_path
            return api_error(status.HTTP_409_CONFLICT, error_msg)

        url = f'{MATEDATA_SERVER_URL}/api/v1/base/{repo_id}/rows'
        data = {
                'table_id': TABLE.id,
                'column_keys': [
                    COLUMN_CREATOR.key,
                    COLUMN_CREATE_TIME.key,
                    COLUMN_MODIFIER.key,
                    COLUMN_MODIFY_TIME.key, 
                    COLUMN_CURRENT_DIR.key,
                    COLUMN_NAME.key,
                    COLUMN_IS_DIR.key
                ],
                'rows': [[
                    '' if is_dir else dirent.modifier, #creator, the dir has not creator
                    timestamp_to_isoformat_timestr(dirent.mtime), #ctime
                    '' if is_dir else dirent.modifier, #modifier, the dir has not modifier
                    timestamp_to_isoformat_timestr(dirent.mtime), #mtime
                    parent_dir, 
                    dirent.obj_name, #name
                    'True' if is_dir else 'False'
                ]]
            }

        response = requests.post(url, json=data, headers=headers)
        if response.status_code >= 200 and response.status_code <= 299:
            return Response({
                'success': True
            })
        else:
            return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, f'error from metadata server with code {response.status_code}: {response.reason}')
        
class MetadataManageRecord(APIView):
    #authentication_classes = (TokenAuthentication, SessionAuthentication)
    #permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def put(self, request, repo_id, record_id):
        '''
            modify a metadata base recode by the record_id
            for simplfying the precudures, all parameters are required
            request body:
                creator, required
                create_time, required
                modifier, required,
                modify_time, required
                current_dir, required
                name, required
        '''

        if not ENABLE_METADATA_MANAGEMENT or not MATEDATA_SERVER_URL:
                error_msg = "Function is not supported"
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        creator = request.data.get('creator')
        create_time = request.data.get('create_time')
        modifier = request.data.get('modifier')
        modify_time = request.data.get('modify_time')
        current_dir = request.data.get('current_dir')
        name = request.data.get('name')

        #args check
        for body_key in ('creator', 'create_time', 'modifier', 'modify_time', 'current_dir', 'name'):
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
        dirent_path = posixpath.join(current_dir, name)
        dirent = seafile_api.get_dirent_by_path(repo_id, dirent_path)
        if not dirent:
            error_msg = 'dirent %s not found.' % dirent_path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        
        # check the current dirent exists or not
        is_dir = stat.S_ISDIR(dirent.mode)
        url = f'{MATEDATA_SERVER_URL}/api/v1/base/{repo_id}/query'

        sql = f'SELECT `{COLUMN_ID.name}` FROM `{TABLE.name}` WHERE `{COLUMN_CURRENT_DIR.name}` = "{current_dir}" AND `{COLUMN_NAME.name}` = "{name}" AND `{COLUMN_ID.name}` != "{record_id}" AND `{COLUMN_IS_DIR.name}` = "{True if is_dir else False}";'

        headers = gen_headers(repo_id)
        response = requests.post(url, json={'sql': sql}, headers=headers)
        if response.status_code < 200 or response.status_code > 299:
            return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, f'error from metadata server with code {response.status_code} in querying result: {response.reason}')
        
        query_result = response.json().get('results')
        if query_result:
            error_msg = f'The {"folder" if is_dir else "file"} {dirent_path} is exists in the metadata base'
            return api_error(status.HTTP_409_CONFLICT, error_msg)

        # dirent type originality check
        sql = f'SELECT `{COLUMN_ID.name}` FROM `{TABLE.name}` WHERE `{COLUMN_ID.name}` = "{record_id}" AND `{COLUMN_IS_DIR.name}` != "{True if is_dir else False}";'
        
        response = requests.post(url, json={'sql': sql}, headers=headers)
        if response.status_code < 200 or response.status_code > 299:
            return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, f'error from metadata server with code {response.status_code}: {response.reason}')
        
        query_result = response.json().get('results')
        if query_result:
            error_msg = f'The type of new dirent {dirent_path} is not matched with the original type'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        url = f'{MATEDATA_SERVER_URL}/api/v1/base/{repo_id}/rows'
        data = {
                'table_id': TABLE.id,
                'column_keys': [
                    COLUMN_ID.key,
                    COLUMN_CREATOR.key,
                    COLUMN_CREATE_TIME.key,
                    COLUMN_MODIFIER.key,
                    COLUMN_MODIFY_TIME.key, 
                    COLUMN_CURRENT_DIR.key,
                    COLUMN_NAME.key
                ],
                'rows': [[
                    record_id,
                    creator,
                    create_time,
                    modifier,
                    modify_time,
                    current_dir, 
                    name
                ]]
            }
        

        response = requests.put(url, json=data, headers=headers)
        if response.status_code >= 200 and response.status_code < 299:
            return Response({
                'success': True
            })
        else:
            return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, f'error from metadata server with code {response.status_code}: {response.reason}')

    def delete(self, request, repo_id, record_id):
        if not ENABLE_METADATA_MANAGEMENT or not MATEDATA_SERVER_URL:
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
        '''permission = check_folder_permission(request, repo_id, '/')
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        '''

        url = f'{MATEDATA_SERVER_URL}/api/v1/base/{repo_id}/rows'
        data = {
                'table_id': TABLE.id,
                'row_ids': [
                    record_id
                ]
            }
        headers = gen_headers(repo_id)
        response = requests.delete(url, json=data, headers=headers)
        if response.status_code >= 200 and response.status_code <= 299:
            return Response({
                'success': True
            })
        else:
            return api_error(status.HTTP_503_SERVICE_UNAVAILABLE, f'error from metadata server with code {response.status_code}: {response.reason}')
