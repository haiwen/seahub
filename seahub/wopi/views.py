# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8

import os
import json
import logging
import urllib2
import requests
import hashlib
import urlparse
import posixpath

from rest_framework.views import APIView

from django.http import HttpResponse
from django.core.cache import cache

from pysearpc import SearpcError
from seaserv import seafile_api

from seahub.base.accounts import User, ANONYMOUS_EMAIL
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.utils import gen_inner_file_get_url, \
    gen_inner_file_upload_url, is_pro_version
from seahub.settings import SITE_ROOT

from seahub.wopi.utils import get_file_info_by_token

logger = logging.getLogger(__name__)
json_content_type = 'application/json; charset=utf-8'

WOPI_LOCK_EXPIRATION = 30 * 60

def generate_file_lock_key_value(request):

    token = request.GET.get('access_token', None)

    info_dict = get_file_info_by_token(token)
    repo_id = info_dict['repo_id']
    file_path= info_dict['file_path']

    repo = seafile_api.get_repo(repo_id)
    if repo.is_virtual:
        origin_repo_id = repo.origin_repo_id
        origin_file_path = posixpath.join(repo.origin_path, file_path.strip('/'))

        file_path_hash = hashlib.sha256(origin_file_path.encode('utf8')).hexdigest()
        lock_cache_key = '_'.join(['HTTP_X_WOPI_LOCK', origin_repo_id, file_path_hash])
    else:
        file_path_hash = hashlib.sha256(file_path.encode('utf8')).hexdigest()
        lock_cache_key = '_'.join(['HTTP_X_WOPI_LOCK', repo_id, file_path_hash])

    x_wopi_lock = request.META.get('HTTP_X_WOPI_LOCK', None)

    return lock_cache_key, x_wopi_lock

def lock_file(request):
    key, value = generate_file_lock_key_value(request)
    cache.set(key, value, WOPI_LOCK_EXPIRATION)

def unlock_file(request):
    key, value = generate_file_lock_key_value(request)
    cache.delete(key)

def refresh_file_lock(request):
    lock_file(request)

def file_is_locked(request):
    key, value = generate_file_lock_key_value(request)
    return True if cache.get(key, '') else False

def get_current_lock_id(request):
    key, value = generate_file_lock_key_value(request)
    return cache.get(key, '')

def access_token_check(func):

    def _decorated(view, request, file_id, *args, **kwargs):

        token = request.GET.get('access_token', None)
        if not token:
            logger.error('access_token invalid.')
            return HttpResponse(json.dumps({}), status=401,
                                content_type=json_content_type)

        info_dict = get_file_info_by_token(token)
        if not info_dict:
            logger.error('Get wopi cache value failed: wopi_access_token_%s.' % token)
            return HttpResponse(json.dumps({}), status=404,
                    content_type=json_content_type)

        request_user = info_dict['request_user']
        repo_id = info_dict['repo_id']
        file_path= info_dict['file_path']
        obj_id = info_dict['obj_id']

        if not request_user or not repo_id or not file_path:
            logger.error('File info invalid, user: %s, repo_id: %s, path: %s.' \
                    % (request_user, repo_id, file_path))
            return HttpResponse(json.dumps({}), status=404,
                                content_type=json_content_type)

        if request_user != ANONYMOUS_EMAIL:
            try:
                User.objects.get(email=request_user)
            except User.DoesNotExist:
                logger.error('User %s not found.' % request_user)
                return HttpResponse(json.dumps({}), status=404,
                                    content_type=json_content_type)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            logger.error('Library %s not found.' % repo_id)
            return HttpResponse(json.dumps({}), status=404,
                                content_type=json_content_type)

        if not obj_id:
            # if not cache file obj_id, then get it from seafile_api
            obj_id = seafile_api.get_file_id_by_path(repo_id, file_path)

        if not obj_id:
            logger.error('File %s not found.' % file_path)
            return HttpResponse(json.dumps({}), status=404,
                                content_type=json_content_type)

        return func(view, request, file_id, *args, **kwargs)

    return _decorated


class WOPIFilesView(APIView):

    @access_token_check
    def get(self, request, file_id, format=None):
        """ WOPI endpoint for check file info
        """

        token = request.GET.get('access_token', None)

        info_dict = get_file_info_by_token(token)
        request_user = info_dict['request_user']
        repo_id = info_dict['repo_id']
        file_path= info_dict['file_path']
        obj_id = info_dict['obj_id']
        can_edit = info_dict['can_edit']
        can_download = info_dict['can_download']

        repo = seafile_api.get_repo(repo_id)

        if not obj_id:
            # if not cache file obj_id, then get it from seafile_api
            obj_id = seafile_api.get_file_id_by_path(repo_id, file_path)

        try:
            file_size = seafile_api.get_file_size(repo.store_id,
                    repo.version, obj_id)
        except SearpcError as e:
            logger.error(e)
            return HttpResponse(json.dumps({}), status=500,
                                content_type=json_content_type)

        if file_size == -1:
            logger.error('File %s not found.' % file_path)
            return HttpResponse(json.dumps({}), status=401,
                                content_type=json_content_type)

        result = {}
        # necessary
        result['BaseFileName'] = os.path.basename(file_path)
        result['Size'] = file_size
        result['UserId'] = request_user
        result['Version'] = obj_id

        try:
            if is_pro_version():
                result['OwnerId'] = seafile_api.get_repo_owner(repo_id) or \
                        seafile_api.get_org_repo_owner(repo_id)
            else:
                result['OwnerId'] = seafile_api.get_repo_owner(repo_id)
        except Exception as e:
            logger.error(e)
            return HttpResponse(json.dumps({}), status=500,
                                content_type=json_content_type)

        # optional
        if request_user != ANONYMOUS_EMAIL:
            result['UserFriendlyName'] = email2nickname(request_user)
            result['IsAnonymousUser'] = False
        else:
            result['IsAnonymousUser'] = True

        absolute_uri = request.build_absolute_uri('/')
        result['PostMessageOrigin'] = urlparse.urljoin(absolute_uri, SITE_ROOT).strip('/')
        result['HideSaveOption'] = True
        result['HideExportOption'] = True
        result['EnableOwnerTermination'] = True
        result['SupportsLocks'] = True
        result['SupportsGetLock'] = True

        result['DisablePrint'] = True if not can_download else False
        result['HidePrintOption'] = True if not can_download else False

        result['SupportsUpdate'] = True if can_edit else False
        result['UserCanWrite'] = True if can_edit else False
        result['ReadOnly'] = True if not can_edit else False

        # new file creation feature is not implemented on wopi host(seahub)
        # hide save as button on view/edit file page
        result['UserCanNotWriteRelative'] = False

        return HttpResponse(json.dumps(result), status=200,
                            content_type=json_content_type)

    @access_token_check
    def post(self, request, file_id, format=None):

        response_409 = HttpResponse(json.dumps({}),
                status=409, content_type=json_content_type)

        x_wopi_override = request.META.get('HTTP_X_WOPI_OVERRIDE', None)
        x_wopi_lock = request.META.get('HTTP_X_WOPI_LOCK', None)
        x_wopi_oldlock = request.META.get('HTTP_X_WOPI_OLDLOCK', None)
        current_lock_id = get_current_lock_id(request)

        if x_wopi_override == 'LOCK':

            if x_wopi_oldlock:
                # UnlockAndRelock endpoint
                if file_is_locked(request):
                    if x_wopi_oldlock != current_lock_id:
                        # If the file is currently locked
                        # and the X-WOPI-OldLock value does NOT match the lock currently on the file
                        # the host must return a “lock mismatch” response (409 Conflict)
                        # and include an X-WOPI-Lock response header containing the value of the current lock on the file
                        response_409['X-WOPI-Lock'] = current_lock_id
                        return response_409
                    else:
                        unlock_file(request)
                        lock_file(request)
                        return HttpResponse()
                else:
                    response_409['X-WOPI-Lock'] = ''
                    return response_409
            else:
                # Lock endpoint
                if not file_is_locked(request):
                    # If the file is currently unlocked
                    # the host should lock the file and return 200 OK.
                    lock_file(request)
                    return HttpResponse()
                else:
                    # If the file is currently locked
                    # and the X-WOPI-Lock value matches the lock currently on the file
                    # the host should treat the request as if it is a RefreshLock request
                    # That is, the host should refresh the lock timer and return 200 OK.
                    if current_lock_id == x_wopi_lock:
                        refresh_file_lock(request)
                        return HttpResponse()
                    else:
                        # In all other cases
                        # the host must return a “lock mismatch” response (409 Conflict)
                        # and include an X-WOPI-Lock response header
                        # containing the value of the current lock on the file.
                        response_409['X-WOPI-Lock'] = current_lock_id
                        return response_409

        elif x_wopi_override == 'GET_LOCK':
            response = HttpResponse()
            if not file_is_locked(request):
                # If the file is currently NOT locked
                # the host must return a 200 OK
                # and include an X-WOPI-Lock response header set to the empty string.
                response['X-WOPI-Lock'] = ''
                return response
            else:
                # If the file is currently locked
                # the host should return a 200 OK
                # and include an X-WOPI-Lock response header
                # containing the value of the current lock on the file.
                response['X-WOPI-Lock'] = current_lock_id
                return response

        elif x_wopi_override in ('REFRESH_LOCK', 'UNLOCK'):
            if file_is_locked(request):
                # If the file is currently locked
                # and the X-WOPI-Lock value does NOT match the lock currently on the file
                # the host must return a “lock mismatch” response (409 Conflict)
                # and include an X-WOPI-Lock response header containing the value of the current lock on the file
                if x_wopi_lock != current_lock_id:
                    response_409['X-WOPI-Lock'] = current_lock_id
                    return response_409
                else:
                    if x_wopi_override == 'REFRESH_LOCK':
                        refresh_file_lock(request)
                    else:
                        unlock_file(request)

                    return HttpResponse()
            else:
                # or if the file is unlocked
                # the host must return a “lock mismatch” response (409 Conflict)
                # and include an X-WOPI-Lock response header containing the value of the current lock on the file
                # In the case where the file is unlocked
                # the host must set X-WOPI-Lock to the empty string
                response_409['X-WOPI-Lock'] = ''
                return response_409

        else:
            logger.info('HTTP_X_WOPI_OVERRIDE: %s' % x_wopi_override)
            logger.info('HTTP_X_WOPI_LOCK: %s' % x_wopi_lock)
            logger.info('HTTP_X_WOPI_OLDLOCK: %s' % x_wopi_oldlock)
            return HttpResponse(json.dumps({'error_msg': 'HTTP_X_WOPI_OVERRIDE invalid'}),
                    status=401, content_type=json_content_type)

class WOPIFilesContentsView(APIView):

    @access_token_check
    def get(self, request, file_id, format=None):
        """ WOPI endpoint for get file content
        """

        token = request.GET.get('access_token', None)
        info_dict = get_file_info_by_token(token)
        repo_id = info_dict['repo_id']
        file_path= info_dict['file_path']
        obj_id = info_dict['obj_id']

        if not obj_id:
            # if not cache file obj_id, then get it from seafile_api
            obj_id = seafile_api.get_file_id_by_path(repo_id, file_path)

        file_name = os.path.basename(file_path)
        try:
            fileserver_token = seafile_api.get_fileserver_access_token(repo_id,
                    obj_id, 'view', '', use_onetime = False)
        except SearpcError as e:
            logger.error(e)
            return HttpResponse(json.dumps({}), status=500,
                    content_type=json_content_type)

        if not fileserver_token:
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

    @access_token_check
    def post(self, request, file_id, format=None):

        token = request.GET.get('access_token', None)
        info_dict = get_file_info_by_token(token)
        request_user = info_dict['request_user']
        repo_id = info_dict['repo_id']
        file_path= info_dict['file_path']

        try:
            file_obj = request.read()

            # get file update url
            fake_obj_id = {'online_office_update': True,}
            token = seafile_api.get_fileserver_access_token(repo_id,
                    json.dumps(fake_obj_id), 'update', request_user)

            if not token:
                return HttpResponse(json.dumps({}), status=500,
                        content_type=json_content_type)

            update_url = gen_inner_file_upload_url('update-api', token)

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
