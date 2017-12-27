# Copyright (c) 2012-2016 Seafile Ltd.
import os
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.settings import SEAHUB_DATA_ROOT, MEDIA_ROOT
from seahub.utils.auth import get_custom_login_bg_image_path

logger = logging.getLogger(__name__)



class AdminLoginBgImage(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle, )
    permission_classes = (IsAdminUser,)

    def post(self, request):
        image_file = request.FILES.get('login_bg_image', None)
        if not image_file:
            error_msg = 'background image invalid'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not os.path.exists(SEAHUB_DATA_ROOT):
            os.makedirs(SEAHUB_DATA_ROOT)

        custom_login_bg_image_path = get_custom_login_bg_image_path()
        custom_dir = os.path.join(SEAHUB_DATA_ROOT,
                os.path.dirname(custom_login_bg_image_path))
        if not os.path.exists(custom_dir):
            os.makedirs(custom_dir)

        try:
            custom_login_bg_image_file = os.path.join(SEAHUB_DATA_ROOT,
                    custom_login_bg_image_path)
            # save login background image file to custom dir
            with open(custom_login_bg_image_file, 'w') as fd:
                fd.write(image_file.read())

            custom_symlink = os.path.join(MEDIA_ROOT,
                    os.path.dirname(custom_login_bg_image_path))
            # create symlink for custom dir
            if not os.path.exists(custom_symlink):
                os.symlink(custom_dir, custom_symlink)

        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
