# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

from seaserv import seafile_api

logger = logging.getLogger(__name__)


class CancelZipTaskView(APIView):

    throttle_classes = (UserRateThrottle, )

    def post(self, request, format=None):
        """ stop progress when download dir/multi.
        Permission checking:
        """
        token = request.POST.get('token', None)
        if not token:
            error_msg = 'token invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            process = seafile_api.cancel_zip_task(token)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
