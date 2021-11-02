# Copyright (c) 2012-2016 Seafile Ltd.
import os
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from seaserv import ccnet_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.settings import LICENSE_PATH
from seahub.utils import get_file_type_and_ext, is_pro_version
from seahub.utils.licenseparse import parse_license
from seahub.utils.error_msg import file_type_error_msg, file_size_error_msg

logger = logging.getLogger(__name__)
HOST_DIR = '/shared/seafile/'


class AdminLicense(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle, )
    permission_classes = (IsAdminUser,)

    def post(self, request):

        if not request.user.admin_permissions.can_config_system():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        license_file = request.FILES.get('license', None)
        if not license_file:
            error_msg = 'license can not be found.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        file_type, ext = get_file_type_and_ext(license_file.name)
        if ext != 'txt':
            error_msg = file_type_error_msg(ext, 'txt')
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if license_file.size > 1024 * 1024 * 5: # 5mb
            error_msg = file_size_error_msg(license_file.size, 5*1024*1024)
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        license_dir = os.path.dirname(LICENSE_PATH)
        try:
            if not os.path.exists(license_dir):
                error_msg = 'path %s invalid.' % LICENSE_PATH
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            with open(LICENSE_PATH, 'wb') as fd:
                fd.write(license_file.read())

            # copy license to the host in docker
            if os.path.exists(HOST_DIR):
                os.system('cp %s %s' % (LICENSE_PATH, HOST_DIR))

            ccnet_api.reload_license()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # get license info
        is_pro = is_pro_version()
        if is_pro:
            license_dict = parse_license()
        else:
            license_dict = {}

        if license_dict:
            try:
                max_users = int(license_dict.get('MaxUsers', 3))
            except ValueError as e:
                logger.error(e)
                max_users = 0
        else:
            max_users = 0

        license_info = {
            'license_expiration': license_dict.get('Expiration', ''),
            'license_mode': license_dict.get('Mode', ''),
            'license_maxusers': max_users,
            'license_to': license_dict.get('Name', ''),
        }

        return Response(license_info, status=status.HTTP_200_OK)
