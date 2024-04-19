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

from seahub.utils.db_api import SeafileDB

logger = logging.getLogger(__name__)


class AdminDeviceErrors(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle, )
    permission_classes = (IsAdminUser,)

    def get(self, request, format=None):
        if not is_pro_version():
            error_msg = 'Feature disabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '100'))
        except ValueError:
            current_page = 1
            per_page = 100

        start = (current_page - 1) * per_page
        limit = per_page + 1

        return_results = []
        try:
            seafile_db = SeafileDB()
            device_errors = seafile_db.get_devices_error(start, limit)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if len(device_errors) > per_page:
            device_errors = device_errors[:per_page]
            has_next_page = True
        else:
            has_next_page = False
        for error in device_errors:
            result = dict()
            result['email'] = error.get('email', '')
            result['name'] = email2nickname(error.get('email', ''))
            result['device_ip'] = error.get('peer_ip', '')
            result['repo_name'] = error.get('repo_name', '')
            result['repo_id'] = error.get('repo_id', '')
            result['error_msg'] = error.get('error_con', '')

            tokens = TokenV2.objects.filter(device_id=error.get('peer_id', ''))
            if tokens:
                result['device_name'] = tokens[0].device_name
                result['client_version'] = tokens[0].client_version
            else:
                result['device_name'] = ''
                result['client_version'] = ''

            error_time = error.get('error_time')
            if error_time:
                result['error_time'] = timestamp_to_isoformat_timestr(error_time)
            else:
                result['error_time'] = ''

            return_results.append(result)

        page_info = {
            'has_next_page': has_next_page,
            'current_page': current_page
        }

        return Response({"page_info": page_info, "device_errors": return_results})

    def delete(self, request, format=None):
        if not is_pro_version():
            error_msg = 'Feature disabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            seafile_api.clear_repo_sync_errors()
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
