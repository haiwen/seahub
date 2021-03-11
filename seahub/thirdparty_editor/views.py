# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8

import os
import json
import logging
import urllib.request
import urllib.error
import urllib.parse

from rest_framework.views import APIView

from django.http import HttpResponse
from django.core.cache import cache

from pysearpc import SearpcError
from seaserv import seafile_api

from seahub.base.accounts import User, ANONYMOUS_EMAIL
from seahub.utils import gen_inner_file_get_url


logger = logging.getLogger(__name__)
json_content_type = 'application/json; charset=utf-8'


def access_token_check(func):

    def _decorated(view, request, *args, **kwargs):

        token = request.GET.get('access_token', None)
        if not token:
            logger.error('access_token invalid.')
            return HttpResponse(json.dumps({}), status=401,
                                content_type=json_content_type)

        info_dict = cache.get('thirdparty_editor_access_token_' + token)
        if not info_dict:
            logger.error('Get thirdparty editor cache value failed, access token is %s.' % token)
            return HttpResponse(json.dumps({}), status=404, content_type=json_content_type)

        request_user = info_dict['request_user']
        repo_id = info_dict['repo_id']
        file_path = info_dict['file_path']
        # TODO
        # permission = info_dict['permission']

        if not request_user or not repo_id or not file_path:
            logger.error('File info invalid, user:{}, repo_id:{}, path:{}.'.format(request_user,
                                                                                   repo_id,
                                                                                   file_path))
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

        obj_id = seafile_api.get_file_id_by_path(repo_id, file_path)
        if not obj_id:
            logger.error('File %s not found.' % file_path)
            return HttpResponse(json.dumps({}), status=404,
                                content_type=json_content_type)

        return func(view, request, *args, **kwargs)

    return _decorated


class ThirdpartyEditorFileInfoView(APIView):

    @access_token_check
    def get(self, request, format=None):
        """ WOPI endpoint for check file info
        """

        token = request.GET.get('access_token', None)

        info_dict = cache.get('thirdparty_editor_access_token_' + token)
        request_user = info_dict['request_user']
        repo_id = info_dict['repo_id']
        file_path = info_dict['file_path']

        repo = seafile_api.get_repo(repo_id)

        obj_id = seafile_api.get_file_id_by_path(repo_id, file_path)

        try:
            file_size = seafile_api.get_file_size(repo.store_id, repo.version, obj_id)
        except SearpcError as e:
            logger.error(e)
            return HttpResponse(json.dumps({}), status=500,
                                content_type=json_content_type)

        if file_size == -1:
            logger.error('File %s not found.' % file_path)
            return HttpResponse(json.dumps({}), status=401,
                                content_type=json_content_type)

        result = {}
        result['username'] = request_user
        result['repo_id'] = repo_id
        result['file_name'] = os.path.basename(file_path)
        result['file_size'] = file_size
        result['file_path'] = file_path

        return HttpResponse(json.dumps(result, ensure_ascii=False), status=200,
                            content_type=json_content_type)


class ThirdpartyEditorFileContentView(APIView):

    @access_token_check
    def get(self, request, format=None):
        """ get file content
        """

        token = request.GET.get('access_token', None)
        info_dict = cache.get('thirdparty_editor_access_token_' + token)
        repo_id = info_dict['repo_id']
        file_path = info_dict['file_path']

        obj_id = seafile_api.get_file_id_by_path(repo_id, file_path)
        file_name = os.path.basename(file_path)
        try:
            fileserver_token = seafile_api.get_fileserver_access_token(repo_id,
                                                                       obj_id,
                                                                       'view',
                                                                       '',
                                                                       use_onetime=False)
        except SearpcError as e:
            logger.error(e)
            return HttpResponse(json.dumps({}), status=500, content_type=json_content_type)

        if not fileserver_token:
            return HttpResponse(json.dumps({}), status=500, content_type=json_content_type)

        inner_path = gen_inner_file_get_url(fileserver_token, file_name)

        try:
            file_content = urllib.request.urlopen(inner_path).read()
        except urllib.error.URLError as e:
            logger.error(e)
            return HttpResponse(json.dumps({}), status=500,
                                content_type=json_content_type)

        return HttpResponse(file_content, content_type="application/octet-stream")
