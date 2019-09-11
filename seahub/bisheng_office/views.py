# -*- coding: utf-8 -*-

import os
import json
import copy
import logging
import urllib.parse
import requests

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from django.core.cache import cache

from seaserv import seafile_api

from seahub.api2.utils import api_error
from seahub.api2.throttling import UserRateThrottle

from seahub.base.accounts import User
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.utils import gen_file_get_url, gen_inner_file_upload_url, \
        get_file_type_and_ext, normalize_file_path
from seahub.avatar.templatetags.avatar_tags import api_avatar_url

from seahub.bisheng_office.settings import BISHENG_OFFICE_HOST_DOMAIN, \
        BISHENG_OFFICE_MIME_TYPE, BISHENG_OFFICE_PRIVILEGE

logger = logging.getLogger(__name__)


# https://ibisheng.cn/apps/blog/posts/onlyoffice-api.html
class BishengOfficeView(APIView):

    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        """ Return file info.
        """

        # argument check
        doc_id = request.GET.get('doc_id', '')
        if not doc_id:
            error_msg = 'doc_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        file_info = cache.get('BISHENG_OFFICE_' + doc_id)
        if not file_info:
            error_msg = 'doc_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        username = file_info.get('username')
        if not username:
            error_msg = 'username invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        repo_id = file_info.get('repo_id')
        if not repo_id:
            error_msg = 'repo_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        file_path = file_info.get('file_path')
        if not file_path:
            error_msg = 'file_path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        file_path = normalize_file_path(file_path)

        # resource check
        try:
            User.objects.get(email=username)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % username
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not seafile_api.get_repo(repo_id):
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not seafile_api.get_file_id_by_path(repo_id, file_path):
            error_msg = 'File %s not found.' % file_path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        parent_dir = os.path.dirname(file_path)
        permission = seafile_api.check_permission_by_path(repo_id, parent_dir, username)
        if not permission:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # get file basic info
        file_name = os.path.basename(file_path.rstrip('/'))
        filetype, fileext = get_file_type_and_ext(file_name)

        # get file raw url
        file_id = seafile_api.get_file_id_by_path(repo_id, file_path)
        download_token = seafile_api.get_fileserver_access_token(repo_id,
                file_id, 'download', username, use_onetime=True)
        raw_url = gen_file_get_url(download_token, file_name)

        # get avatar url
        url, _, _ = api_avatar_url(username, int(72))

        # prepare file permission
        privilege = copy.deepcopy(BISHENG_OFFICE_PRIVILEGE)
        can_edit = file_info.get('can_edit', False)
        if not can_edit:
            privilege.remove('FILE_WRITE')

        # prepare response
        file_info = {
            'doc': {
                'docId': doc_id,
                'title': file_name,
                'mime_type': BISHENG_OFFICE_MIME_TYPE[fileext],
                'fetchUrl': raw_url,
                'thumbnail': "",
                'fromApi': True
            },
            'user': {
                'uid': username,
                'oid': username,
                'nickName': email2nickname(username),
                'avatar': url,
                'privilege': privilege
            },
        }

        return Response(file_info)

    def post(self, request):
        """ Save file.
        """

        # 在默认情况下，所有的编辑参与者退出编辑5分钟之后，毕升Office会触发回存逻辑；
        # 或者在所以用户退出编辑之后，如果有用户再打开预览，也会触发回存。

        # {u'action': u'saveBack',
        #  u'data': {u'changesUrl': u'2bd816895cb7a72dffa4810d2ba5c474/changes.zip',
        #            u'delta': 10,
        #            u'docId': u'2bd816895cb7a72dffa4810d2ba5c474',
        #            u'docURL': u'/s3/draft/...',
        #            u'modifyBy': [{u'avatar': u'http://192.168.1.113:8000/media/avatars/default.png',
        #                           u'nickName': u'lian',
        #                           u'oid': u'lian@lian.com',
        #                           u'privilege': None,
        #                           u'uid': u'lian@lian.com'}],
        #            u'unchanged': False},
        #  u'docId': u'2bd816895cb7a72dffa4810d2ba5c474'}

        post_data = json.loads(request.body)

        # check action from bisheng server
        action = post_data.get('action')
        if action != 'saveBack':
            return Response()

        # ger file basic info
        doc_id = post_data.get('docId')
        file_info = cache.get('BISHENG_OFFICE_' + doc_id)

        username = file_info.get('username')
        repo_id = file_info.get('repo_id')
        file_path = file_info.get('file_path')

        # get content of new editted file
        data = post_data.get('data')
        file_url = urllib.parse.urljoin(BISHENG_OFFICE_HOST_DOMAIN, data.get('docURL'))
        files = {
            'file': requests.get(file_url).content,
            'file_name': os.path.basename(file_path),
            'target_file': file_path,
        }

        # prepare update token for seafhttp
        fake_obj_id = {'online_office_update': True,}
        update_token = seafile_api.get_fileserver_access_token(
            repo_id, json.dumps(fake_obj_id), 'update', username)

        # update file
        update_url = gen_inner_file_upload_url('update-api', update_token)
        requests.post(update_url, files=files)

        return Response()
