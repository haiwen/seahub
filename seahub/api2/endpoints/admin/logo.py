# Copyright (c) 2012-2016 Seafile Ltd.
import os
import logging
from PIL import Image

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.settings import SEAHUB_DATA_ROOT, MEDIA_ROOT, \
        CUSTOM_LOGO_PATH, MEDIA_URL
from seahub.utils import get_file_type_and_ext, PREVIEW_FILEEXT, \
    get_service_url
from seahub.utils.file_types import IMAGE
from seahub.utils.error_msg import file_type_error_msg, file_size_error_msg

logger = logging.getLogger(__name__)

class AdminLogo(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle, )
    permission_classes = (IsAdminUser,)

    def post(self, request):

        if not request.user.admin_permissions.can_config_system():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        logo_file = request.FILES.get('logo', None)
        if not logo_file:
            error_msg = 'Logo can not be found.'
            logger.error(error_msg)
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        file_type, ext = get_file_type_and_ext(logo_file.name)
        if file_type != IMAGE:
            error_msg = file_type_error_msg(ext, PREVIEW_FILEEXT.get(IMAGE))
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if logo_file.size > 1024 * 1024 * 20: # 20mb
            error_msg = file_size_error_msg(logo_file.size, 20*1024*1024)
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not os.path.exists(SEAHUB_DATA_ROOT):
            os.makedirs(SEAHUB_DATA_ROOT)

        custom_dir = os.path.join(SEAHUB_DATA_ROOT, os.path.dirname(CUSTOM_LOGO_PATH))
        if not os.path.exists(custom_dir):
            os.makedirs(custom_dir)

        try:
            # save logo file to custom dir
            custom_logo_file = os.path.join(SEAHUB_DATA_ROOT, CUSTOM_LOGO_PATH)
            image = Image.open(logo_file)
            image.save(custom_logo_file)

            # create symlink for custom dir
            custom_symlink = os.path.join(MEDIA_ROOT, os.path.dirname(CUSTOM_LOGO_PATH))
            if not os.path.exists(custom_symlink):
                os.symlink(custom_dir, custom_symlink)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'logo_path': get_service_url() + MEDIA_URL + CUSTOM_LOGO_PATH})
