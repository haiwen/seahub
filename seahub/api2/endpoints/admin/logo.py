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
from seahub.settings import SEAHUB_DATA_ROOT, MEDIA_ROOT

logger = logging.getLogger(__name__)

CUSTOM_LOGO_PATH = 'custom/mylogo.png'

class AdminLogo(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle, )
    permission_classes = (IsAdminUser,)

    def post(self, request):

        logo_file = request.FILES.get('logo', None)
        if not logo_file:
            error_msg = 'logo invalid.'
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

        return Response({'success': True})
