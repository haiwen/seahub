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
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error
from seahub.share.utils import is_repo_admin
from seahub.api2.endpoints.utils import add_repo_archive_task_request
from seahub.settings import ENABLE_STORAGE_CLASSES


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
    
    return None

def get_archive_storage_id():
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
        if bend.get('is_archive', False):
            return bend['storage_id']
    
    return None

class RepoArchiveView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

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

        op_type = request.data.get('op_type')
        if op_type not in ('archive', 'unarchive'):
            return api_error(status.HTTP_400_BAD_REQUEST, 'op_type invalid.')

        if op_type == 'archive':
            origin_storage_id = repo.storage_id or get_default_storage_id()
            dest_storage_id = get_archive_storage_id()
            if not dest_storage_id:
                error_msg = 'get_archive_storage_id failed.'
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)
        else:  # unarchive
            origin_storage_id = repo.storage_id
            dest_storage_id = get_default_storage_id()
            if not dest_storage_id:
                error_msg = 'get_default_storage_id failed.'
                return api_error(status.HTTP_404_NOT_FOUND, error_msg)        

        try:
            task_id = add_repo_archive_task_request(repo_id, origin_storage_id, dest_storage_id, op_type, request.user.username)
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'task_id': task_id})
