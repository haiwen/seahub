import os
import json
import logging
import configparser

from rest_framework import status
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated

from seaserv import seafile_api

from seahub.api2.base import APIView
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error
from seahub.share.utils import is_repo_admin
from seahub.api2.endpoints.utils import add_repo_archive_task_request
from seahub.settings import ENABLE_STORAGE_CLASSES
from seahub.utils.db_api import SeafileDB

from seahub import settings as seahub_settings


REPO_ARCHIVE_STORAGE_ID = getattr(seahub_settings, 'REPO_ARCHIVE_STORAGE_ID', None)
logger = logging.getLogger(__name__)


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


    def post(self, request, repo_id):
        # whether storage classes is enabled
        if not ENABLE_STORAGE_CLASSES:
            error_msg = 'Storage classes not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
            
        # permission check
        if not is_repo_admin(request.user.username, repo_id):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        seafile_db_api = SeafileDB()

        try:
             archive_status = seafile_db_api.get_archive_status(repo_id)
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
            seafile_db_api.set_archive_status(repo_id, status_val)
        
            task_id = add_repo_archive_task_request(repo_id, orig_storage_id, dest_storage_id, op_type, request.user.username)
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Failed to start task.')

        return Response({'task_id': task_id})
