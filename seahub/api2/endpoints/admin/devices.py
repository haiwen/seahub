import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from pysearpc import SearpcError

from seahub.utils.devices import do_unlink_device
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.views import is_registered_user

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.api2.models import TokenV2

logger = logging.getLogger(__name__)

class AdminDevices(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def get(self, request, format=None):

        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '50'))
        except ValueError:
            current_page = 1
            per_page = 50

        platform = request.GET.get('platform', None)

        start = (current_page - 1) * per_page
        end = current_page * per_page + 1
        devices = TokenV2.objects.get_devices(platform, start, end)

        if len(devices) == end - start:
            devices = devices[:per_page]
            has_next_page = True
        else:
            has_next_page = False

        return_results = []
        for device in devices:
            result = {}
            result['client_version'] = device.client_version
            result['device_id'] = device.device_id
            result['device_name'] = device.device_name
            result['last_accessed'] = datetime_to_isoformat_timestr(device.last_accessed)
            result['last_login_ip'] = device.last_login_ip
            result['user'] = device.user
            result['platform'] = device.platform
            return_results.append(result)

        return Response(({'has_next_page': has_next_page}, return_results))

    def delete(self, request, format=None):

        platform = request.data.get('platform', '')
        device_id = request.data.get('device_id', '')
        user = request.data.get('user', '')

        if not platform:
            error_msg = 'platform invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not device_id:
            error_msg = 'device_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not user or not is_registered_user(user):
            error_msg = 'user invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            do_unlink_device(user, platform, device_id)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})

