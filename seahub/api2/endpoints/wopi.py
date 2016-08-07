import os
import json
import logging
import urllib2
import requests

from rest_framework.views import APIView

from django.http import HttpResponse
from django.core.cache import cache

from pysearpc import SearpcError
from seaserv import get_repo, seafile_api, get_file_id_by_path

from seahub.utils import gen_inner_file_get_url, gen_file_upload_url
from seahub.views import check_file_lock
from seahub.settings import FILE_LOCK_EXPIRATION_DAYS

from seahub.utils.wopi import check_can_edit_file_by_OWA, get_file_info_by_token

from seahub import settings
WOPI_ACCESS_TOKEN_EXPIRATION = getattr(settings, 'WOPI_ACCESS_TOKEN_EXPIRATION', 30 * 60)

logger = logging.getLogger(__name__)
json_content_type = 'application/json; charset=utf-8'

class WOPIFilesView(APIView):

    def get(self, request, file_id, format=None):
        """ WOPI endpoint for check file info
        """

        token = request.GET.get('access_token', None)
        request_user, repo_id, file_path = get_file_info_by_token(token)

        if not request_user or not repo_id or not file_path:
            logger.error('access_token invalid.')
            return HttpResponse(json.dumps({}), status=401,
                                content_type=json_content_type)

        repo = get_repo(repo_id)
        if not repo:
            logger.error('Library %s not found.') % repo_id
            return HttpResponse(json.dumps({}), status=401,
                                content_type=json_content_type)

        obj_id = get_file_id_by_path(repo_id, file_path)
        if not obj_id:
            logger.error('File %s not found.') % file_path
            return HttpResponse(json.dumps({}), status=401,
                                content_type=json_content_type)

        try:
            file_size = seafile_api.get_file_size(repo.store_id,
                                                  repo.version,
                                                  obj_id)
        except SearpcError as e:
            logger.error(e)
            return HttpResponse(json.dumps({}), status=500,
                                content_type=json_content_type)

        if file_size == -1:
            logger.error('File %s not found.') % file_path
            return HttpResponse(json.dumps({}), status=401,
                                content_type=json_content_type)

        result = {}
        result['BaseFileName'] = os.path.basename(file_path)
        result['OwnerId'] = request_user
        result['Size'] = file_size
        # used for office web app cache
        result['Version'] = obj_id

        if check_can_edit_file_by_OWA(request_user, repo_id, file_path):
            result['SupportsLocks'] = True
            result['SupportsUpdate'] = True
            result['UserCanWrite'] = True

        return HttpResponse(json.dumps(result), status=200,
                            content_type=json_content_type)

    def post(self, request, file_id, format=None):

        token = request.GET.get('access_token', None)
        request_user, repo_id, file_path = get_file_info_by_token(token)

        # check basic file info
        if not request_user or not repo_id or not file_path:
            logger.error('access_token invalid.')
            return HttpResponse(json.dumps({}), status=401,
                                content_type=json_content_type)

        repo = get_repo(repo_id)
        if not repo:
            logger.error('Library %s not found.') % repo_id
            return HttpResponse(json.dumps({}), status=401,
                                content_type=json_content_type)

        obj_id = get_file_id_by_path(repo_id, file_path)
        if not obj_id:
            logger.error('File %s not found.') % file_path
            return HttpResponse(json.dumps({}), status=401,
                                content_type=json_content_type)

        # check file lock info
        is_locked, locked_by_request_user = check_file_lock(repo_id,
            file_path, request_user)

        # action according to HTTP_X_WOPI_OVERRIDE header from OWA
        x_wopi_override = request.META.get('HTTP_X_WOPI_OVERRIDE', None)
        if not x_wopi_override:
            return HttpResponse(json.dumps({'error_msg': 'HTTP_X_WOPI_OVERRIDE missing'}),
                    status=401, content_type=json_content_type)

        key_locked_by_OWA = '_'.join(['WOPI_LOCK_', repo_id, file_path, 'locked_by_OWA'])
        if x_wopi_override in ('LOCK', 'REFRESH_LOCK'):
            if not is_locked:
                seafile_api.lock_file(repo_id, file_path, request_user,
                    FILE_LOCK_EXPIRATION_DAYS)
                cache.set(key_locked_by_OWA, True, WOPI_ACCESS_TOKEN_EXPIRATION)

        elif x_wopi_override == 'UNLOCK':
            if is_locked and cache.get(key_locked_by_OWA):
                seafile_api.unlock_file(repo_id, file_path.lstrip('/'))
                cache.delete(key_locked_by_OWA)

        else:
            return HttpResponse(json.dumps({'error_msg': 'HTTP_X_WOPI_OVERRIDE invalid'}),
                    status=401, content_type=json_content_type)

        return HttpResponse()

class WOPIFileContentsView(APIView):

    def get(self, request, file_id, format=None):
        """ WOPI endpoint for get file content
        """

        token = request.GET.get('access_token', None)
        request_user, repo_id, file_path = get_file_info_by_token(token=token)

        if not request_user or not repo_id or not file_path:
            logger.error('access_token invalid.')
            return HttpResponse(json.dumps({}), status=401,
                                content_type=json_content_type)

        repo = get_repo(repo_id)
        if not repo:
            logger.error('Library %s not found.') % repo_id
            return HttpResponse(json.dumps({}), status=401,
                                content_type=json_content_type)

        obj_id = get_file_id_by_path(repo_id, file_path)
        if not obj_id:
            logger.error('File %s not found.') % file_path
            return HttpResponse(json.dumps({}), status=401,
                                content_type=json_content_type)

        file_name = os.path.basename(file_path)
        try:
            fileserver_token = seafile_api.get_fileserver_access_token(repo_id,
                                       obj_id, 'view', '', use_onetime = False)
        except SearpcError as e:
            logger.error(e)
            return HttpResponse(json.dumps({}), status=500,
                                content_type=json_content_type)

        inner_path = gen_inner_file_get_url(fileserver_token, file_name)

        try:
            file_content = urllib2.urlopen(inner_path).read()
        except urllib2.URLError as e:
            logger.error(e)
            return HttpResponse(json.dumps({}), status=500,
                                content_type=json_content_type)

        return HttpResponse(file_content, content_type="application/octet-stream")

    def post(self, request, file_id, format=None):

        token = request.GET.get('access_token', None)
        request_user, repo_id, file_path = get_file_info_by_token(token=token)

        if not request_user or not repo_id or not file_path:
            logger.error('access_token invalid.')
            return HttpResponse(json.dumps({}), status=401,
                                content_type=json_content_type)

        repo = get_repo(repo_id)
        if not repo:
            logger.error('Library %s not found.') % repo_id
            return HttpResponse(json.dumps({}), status=401,
                                content_type=json_content_type)

        obj_id = get_file_id_by_path(repo_id, file_path)
        if not obj_id:
            logger.error('File %s not found.') % file_path
            return HttpResponse(json.dumps({}), status=401,
                                content_type=json_content_type)

        try:
            file_obj = request.read()

            # get file update url
            token = seafile_api.get_fileserver_access_token(repo_id, 'dummy', 'update', request_user)
            update_url = gen_file_upload_url(token, 'update-api')

            # update file
            files = {
                'file': file_obj,
                'file_name': os.path.basename(file_path),
                'target_file': file_path,
            }
            requests.post(update_url, files=files)
        except Exception as e:
            logger.error(e)
            return HttpResponse(json.dumps({}), status=500,
                                content_type=json_content_type)

        return HttpResponse(json.dumps({}), status=200,
                            content_type=json_content_type)
