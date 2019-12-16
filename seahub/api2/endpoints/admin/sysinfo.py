# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api, ccnet_api
from pysearpc import SearpcError

from seahub.utils import is_pro_version
from seahub.utils.licenseparse import parse_license

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.models import TokenV2
from seahub.api2.utils import api_error

try:
    from seahub.settings import MULTI_TENANCY
except ImportError:
    MULTI_TENANCY = False

logger = logging.getLogger(__name__)

class SysInfo(APIView):
    """Show system info.
    """
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def get(self, request, format=None):

        if not request.user.admin_permissions.can_view_system_info():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        # count repos
        try:
            repos_count = seafile_api.count_repos()
        except SearpcError as e:
            logger.error(e)
            repos_count = 0

        # count groups
        try:
            groups_count = len(ccnet_api.get_all_groups(-1, -1))
        except Exception as e:
            logger.error(e)
            groups_count = 0

        # count orgs
        if MULTI_TENANCY:
            multi_tenancy_enabled = True
            try:
                org_count = ccnet_api.count_orgs()
            except Exception as e:
                logger.error(e)
                org_count = 0
        else:
            multi_tenancy_enabled = False
            org_count = 0

        # count users
        try:
            active_db_users = ccnet_api.count_emailusers('DB')
        except Exception as e:
            logger.error(e)
            active_db_users = 0

        try:
            active_ldap_users = ccnet_api.count_emailusers('LDAP')
        except Exception as e:
            logger.error(e)
            active_ldap_users = 0

        try:
            inactive_db_users = ccnet_api.count_inactive_emailusers('DB')
        except Exception as e:
            logger.error(e)
            inactive_db_users = 0

        try:
            inactive_ldap_users = ccnet_api.count_inactive_emailusers('LDAP')
        except Exception as e:
            logger.error(e)
            inactive_ldap_users = 0

        active_users = active_db_users + active_ldap_users if \
            active_ldap_users > 0 else active_db_users

        inactive_users = inactive_db_users + inactive_ldap_users if \
            inactive_ldap_users > 0 else inactive_db_users

        # get license info
        is_pro = is_pro_version()
        if is_pro:
            license_dict = parse_license()
        else:
            license_dict = {}

        if license_dict:
            with_license = True
            try:
                max_users = int(license_dict.get('MaxUsers', 3))
            except ValueError as e:
                logger.error(e)
                max_users = 0
        else:
            with_license = False
            max_users = 0

        # count total file number
        try:
            total_files_count = seafile_api.get_total_file_number()
        except Exception as e:
            logger.error(e)
            total_files_count = 0

        # count total storage
        try:
            total_storage = seafile_api.get_total_storage()
        except Exception as e:
            logger.error(e)
            total_storage = 0

        # count devices number
        try:
            total_devices_count = TokenV2.objects.get_total_devices_count()
        except Exception as e:
            logger.error(e)
            total_devices_count = 0

        # count current connected devices
        try:
            current_connected_devices_count = TokenV2.objects.\
                    get_current_connected_devices_count()
        except Exception as e:
            logger.error(e)
            current_connected_devices_count = 0

        info = {
            'users_count': active_users + inactive_users,
            'active_users_count': active_users,
            'repos_count': repos_count,
            'total_files_count': total_files_count,
            'groups_count': groups_count,
            'org_count': org_count,
            'multi_tenancy_enabled': multi_tenancy_enabled,
            'is_pro': is_pro,
            'with_license': with_license,
            'license_expiration': license_dict.get('Expiration', ''),
            'license_mode': license_dict.get('Mode', ''),
            'license_maxusers': max_users,
            'license_to': license_dict.get('Name', ''),
            'total_storage': total_storage,
            'total_devices_count': total_devices_count,
            'current_connected_devices_count': current_connected_devices_count
        }

        return Response(info)
