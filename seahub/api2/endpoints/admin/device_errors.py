# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api
from pysearpc import SearpcError

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.api2.models import TokenV2
from seahub.base.templatetags.seahub_tags import email2nickname

from seahub.utils.timeutils import timestamp_to_isoformat_timestr
from seahub.utils import is_pro_version

logger = logging.getLogger(__name__)

class AdminDeviceErrors(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle, )
    permission_classes = (IsAdminUser,)

    def get(self, request, format=None):
        if not is_pro_version():
            error_msg = 'Feature disabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        return_results = []
        try:
            device_errors = seafile_api.list_repo_sync_errors()
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        for error in device_errors:
            result = {}
            result['email'] = error.email if error.email else ''
            result['name'] = email2nickname(error.email)
            result['device_ip'] = error.peer_ip if error.peer_ip else ''
            result['repo_name'] = error.repo_name if error.repo_name else ''
            result['repo_id'] = error.repo_id if error.repo_id else ''
            result['error_msg'] = error.error_con if error.error_con else ''

            tokens = TokenV2.objects.filter(device_id = error.peer_id)
            if tokens:
                result['device_name'] = tokens[0].device_name
                result['client_version'] = tokens[0].client_version
            else:
                result['device_name'] = ''
                result['client_version'] = ''

            if error.error_time:
                result['error_time'] = timestamp_to_isoformat_timestr(error.error_time)
            else:
                result['error_time'] = ''

            return_results.append(result)

        return Response(return_results)

    def delete(self, request, format=None):
        if not is_pro_version():
            error_msg = 'Feature disabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            seafile_api.clear_repo_sync_errors()
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
