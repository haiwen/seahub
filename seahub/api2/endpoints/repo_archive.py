import os
import json
import logging
import configparser
from rest_framework import status
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from seahub.api2.base import APIView
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error
from seahub.settings import ENABLE_STORAGE_CLASSES, REPO_ARCHIVE_STORAGE_ID
from seaserv import seafile_api
from seahub.api2.endpoints.utils import add_repo_archive_task_request
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger(__name__)

def get_seafile_db_url():
    env = os.environ
    seafile_conf = os.path.join(env['SEAFILE_CENTRAL_CONF_DIR'], 'seafile.conf')
    cp = configparser.ConfigParser()
    cp.read(seafile_conf)
    host = cp.get('database', 'host')
    port = cp.get('database', 'port')
    user = cp.get('database', 'user')
    passwd = cp.get('database', 'password')
    db_name = cp.get('database', 'db_name')
    return 'mysql+pymysql://' + user + ':' + passwd + '@' + host + ':' + port + '/' + db_name

def get_default_storage_id():
    env = os.environ
    seafile_conf = os.path.join(env['SEAFILE_CENTRAL_CONF_DIR'], 'seafile.conf')
    cp = configparser.ConfigParser()
    cp.read(seafile_conf)
    
    storage_classes_file = cp.get('storage', 'storage_classes_file')
    if not os.path.isabs(storage_classes_file):
        storage_classes_file = os.path.join(env['SEAFILE_CENTRAL_CONF_DIR'], storage_classes_file)
        
    with open(storage_classes_file, 'r') as f:
        json_cfg = json.load(f)
        
    for bend in json_cfg:
        if bend.get('is_default', False):
            return bend['storage_id']
    
    # If no default set, return the first one? Or None?
    if len(json_cfg) > 0:
        return json_cfg[0]['storage_id']
    return None

class RepoArchiveView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)

    def get_archive_status(self, repo_id):
        url = get_seafile_db_url()
        try:
            engine = create_engine(url, echo=False)
            session = sessionmaker(engine)()
            sql = "SELECT archive_status FROM RepoInfo WHERE repo_id='{}'".format(repo_id)
            result = session.execute(text(sql)).fetchone()
            session.close()
            if result:
                return result[0]
            return None
        except Exception as e:
            logger.error("Failed to get archive status: %s", e)
            raise e

    def set_archive_status(self, repo_id, status):
        url = get_seafile_db_url()
        try:
            engine = create_engine(url, echo=False)
            session = sessionmaker(engine)()
            if status is None:
                sql = "UPDATE RepoInfo SET archive_status=NULL WHERE repo_id='{}'".format(repo_id)
            else:
                sql = "UPDATE RepoInfo SET archive_status='{}' WHERE repo_id='{}'".format(status, repo_id)
            session.execute(text(sql))
            session.commit()
            session.close()
        except Exception as e:
            logger.error("Failed to set archive status: %s", e)
            raise e

    def get(self, request, repo_id):
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Repo not found.')

        # Check if user is admin
        is_admin = request.user.is_staff

        # Get archive status
        archive_status = None
        try:
            archive_status = self.get_archive_status(repo_id)
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Failed to get archive status.')

        # Base condition: storage classes enabled and user is admin
        base_condition = ENABLE_STORAGE_CLASSES and is_admin

        # can_archive: when archive_status is null/empty (not archived, not in progress)
        can_archive = base_condition and (archive_status is None or archive_status == '')

        # can_unarchive: when archive_status is 'archived'
        can_unarchive = base_condition and archive_status == 'archived'

        return Response({
            'archive_status': archive_status or '',
            'can_archive': can_archive,
            'can_unarchive': can_unarchive
        })

    def post(self, request, repo_id):
        if not ENABLE_STORAGE_CLASSES:
             return api_error(status.HTTP_403_FORBIDDEN, 'Storage classes not enabled.')
        
        repo = seafile_api.get_repo(repo_id)
        if not repo:
             return api_error(status.HTTP_404_NOT_FOUND, 'Repo not found.')

        try:
             archive_status = self.get_archive_status(repo_id)
        except Exception:
             return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Failed to get archive status.')
        
        op_type = None
        if not archive_status:
             op_type = 'archive'
        elif archive_status == 'archived':
             op_type = 'unarchive'
        else:
             return api_error(status.HTTP_400_BAD_REQUEST, 'Repository is in %s state.' % archive_status)
             
        orig_storage_id = repo.storage_id
        dest_storage_id = None
        
        if op_type == 'archive':
             dest_storage_id = REPO_ARCHIVE_STORAGE_ID
             if orig_storage_id == dest_storage_id:
                 return api_error(status.HTTP_400_BAD_REQUEST, 'Repository is already in archive storage.')
        else: # unarchive
             try:
                 dest_storage_id = get_default_storage_id()
             except Exception as e:
                 logger.error(e)
                 return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Failed to get default storage id.')
             
             if not dest_storage_id:
                 return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Default storage id not found.')

        try:
            status_val = 'in_archiving' if op_type == 'archive' else 'in_unarchiving'
            self.set_archive_status(repo_id, status_val)
        
            task_id = add_repo_archive_task_request(repo_id, orig_storage_id, dest_storage_id, op_type, request.user.username)
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Failed to start task.')

        return Response({'task_id': task_id})
