# Copyright (c) 2012-2016 Seafile Ltd.
# encoding: utf-8

import os
import json
import socket
import logging
import posixpath
import urllib.parse
import urllib.request

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication

from django.http import HttpResponse

from seaserv import seafile_api

from seahub.api2.utils import api_error
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication

from seahub.utils import gen_inner_file_get_url
from seahub.views import check_folder_permission
from seahub.cad.settings import WEBCAD_ROOT_FOLDER, \
        WEBCAD_DWG_PATH, WEBCAD_OCF_PATH, WEBCAD_HOST, WEBCAD_PORT

logger = logging.getLogger(__name__)


def dwg_to_ocf(dwg_filename, ocf_filename):

    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    except socket.error as m:
        logger.error(m)
        return False

    s.connect((WEBCAD_HOST, WEBCAD_PORT))

    # send data to webcad
    input_dict = {
        "path": '',
        "name": dwg_filename,
        "ocf": ocf_filename,
        "layout": "",
        "utoken": "",
        "taskClass": "MakeOcf",
        "id": 1
    }

    message = {
        "status": 0,
        "host": "webcad",
        "input": json.dumps(input_dict),
        "output": ""
    }
    try:
        s.sendall(bytes(json.dumps(message), encoding='utf-8'))
        s.sendall(bytes(0))
    except socket.error as m:
        logger.error(m)
        return False

    # receive data
    buffer = []
    while True:
        d = s.recv(1024)
        if d:
            buffer.append(d)
        else:
            break

    rec_data = b''.join(buffer)
    rec_str = rec_data.decode(encoding='utf-8')
    s.close()

    rec_json = json.loads(rec_str.strip('\x00'))
    output_str = rec_json.get('output', '')
    output_json = json.loads(output_str)

    return output_json.get('msg', '') == 'OK'


class CadApiFileContentView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, format=None):
        """ get file content
        """

        # parameter check
        repo_id = request.GET.get('repo_id', None)
        file_path = request.GET.get('file_path', None)

        if not repo_id:
            error_msg = 'repo_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not file_path:
            error_msg = 'file_path invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        if not seafile_api.get_repo(repo_id):
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        obj_id = seafile_api.get_file_id_by_path(repo_id, file_path)
        if not obj_id:
            error_msg = 'file %s not found.' % file_path
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if not check_folder_permission(request, repo_id, '/'):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # process dwg and ocf file
        base_filename = "{}_{}_{}".format(repo_id, file_path, obj_id)
        base_filename = urllib.parse.quote(base_filename, safe='')

        dwg_filename = "{}.dwg".format(base_filename)
        dwg_filepath = posixpath.join(WEBCAD_ROOT_FOLDER,
                                      WEBCAD_DWG_PATH,
                                      dwg_filename)

        if not os.path.exists(dwg_filepath):

            try:
                fileserver_token = seafile_api.get_fileserver_access_token(repo_id,
                                                                           obj_id,
                                                                           'download',
                                                                           request.user.username,
                                                                           use_onetime=False)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            if not fileserver_token:
                logger.error('No fileserver token')
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            file_name = os.path.basename(file_path)
            inner_path = gen_inner_file_get_url(fileserver_token, file_name)

            try:
                file_content = urllib.request.urlopen(inner_path).read()
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            with open(dwg_filepath, 'wb') as f:
                f.write(file_content)

        ocf_filename = "{}.ocf".format(base_filename)
        ocf_filepath = posixpath.join(WEBCAD_ROOT_FOLDER,
                                      WEBCAD_OCF_PATH,
                                      ocf_filename)

        if not os.path.exists(ocf_filepath):
            success = dwg_to_ocf(dwg_filename, ocf_filename)
            if not success:
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        with open(ocf_filepath, 'rb') as f:
            ocf_file_content = f.read()

        return HttpResponse(ocf_file_content, content_type="application/octet-stream")
