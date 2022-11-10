# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api, ccnet_api
from pysearpc import SearpcError

from seahub.utils.devices import do_unlink_device
from seahub.utils.timeutils import datetime_to_isoformat_timestr, \
        timestamp_to_isoformat_timestr

from seahub.api2.permissions import IsProVersion, IsOrgAdminUser
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.api2.models import TokenV2, DESKTOP_PLATFORMS, MOBILE_PLATFORMS
from seahub.base.templatetags.seahub_tags import email2nickname

logger = logging.getLogger(__name__)


class OrgAdminDevices(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def get(self, request, org_id):

        org_id = int(org_id)
        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '50'))
        except ValueError:
            current_page = 1
            per_page = 50

        start = (current_page - 1) * per_page
        end = current_page * per_page + 1

        platform = request.GET.get('platform', None)
        org_users = ccnet_api.get_org_users_by_url_prefix(org.url_prefix, -1, -1)
        org_user_emails = [user.email for user in org_users]

        devices = TokenV2.objects.filter(wiped_at=None)

        if platform == 'desktop':
            devices = devices.filter(platform__in=DESKTOP_PLATFORMS) \
                             .filter(user__in=org_user_emails) \
                             .order_by('-last_accessed')[start: end]

        elif platform == 'mobile':
            devices = devices.filter(platform__in=MOBILE_PLATFORMS) \
                             .filter(user__in=org_user_emails) \
                             .order_by('-last_accessed')[start: end]
        else:
            devices = devices.order_by('-last_accessed') \
                             .filter(user__in=org_user_emails)[start: end]

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
            result['user_name'] = email2nickname(device.user)
            result['platform'] = device.platform

            result['is_desktop_client'] = False
            if result['platform'] in DESKTOP_PLATFORMS:
                result['is_desktop_client'] = True

            return_results.append(result)

        page_info = {
            'has_next_page': has_next_page,
            'current_page': current_page
        }
        return Response({"page_info": page_info, "devices": return_results})

    def delete(self, request, org_id):

        org_id = int(org_id)
        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        platform = request.data.get('platform', '')
        device_id = request.data.get('device_id', '')
        remote_wipe = request.data.get('wipe_device', '')
        user = request.data.get('user', '')

        if not platform:
            error_msg = 'platform invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not device_id:
            error_msg = 'device_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if not user:
            error_msg = 'user invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        remote_wipe = True if remote_wipe == 'true' else False

        try:
            do_unlink_device(user, platform, device_id, remote_wipe=remote_wipe)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})


class OrgAdminDevicesErrors(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle, )
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def get(self, request, org_id):

        org_id = int(org_id)
        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

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
            device_errors = seafile_api.list_org_repo_sync_errors(org_id, start, limit)
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if len(device_errors) > per_page:
            device_errors = device_errors[:per_page]
            has_next_page = True
        else:
            has_next_page = False

        for error in device_errors:
            result = {}
            result['email'] = error.email if error.email else ''
            result['name'] = email2nickname(error.email)
            result['device_ip'] = error.peer_ip if error.peer_ip else ''
            result['repo_name'] = error.repo_name if error.repo_name else ''
            result['repo_id'] = error.repo_id if error.repo_id else ''
            result['error_msg'] = error.error_con if error.error_con else ''

            tokens = TokenV2.objects.filter(device_id=error.peer_id)
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

        page_info = {
            'has_next_page': has_next_page,
            'current_page': current_page
        }

        return Response({"page_info": page_info, "device_errors": return_results})

    def delete(self, request, org_id):

        org_id = int(org_id)
        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            seafile_api.clear_repo_sync_errors()
        except SearpcError as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
