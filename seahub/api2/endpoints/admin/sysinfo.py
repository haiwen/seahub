import logging
import os

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
from seahub.api2.utils import api_error

import seahub.settings
try:
    from seahub.settings import MULTI_TENANCY
except ImportError:
    MULTI_TENANCY = False

logger = logging.getLogger(__name__)

class SysInfo(APIView):
    """Show system info.
    """
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle, )
    permission_classes = (IsAdminUser,)

    def get(self, request, format=None):
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

        active_users = active_db_users + active_ldap_users if active_ldap_users > 0 \
                else active_db_users

        inactive_users = inactive_db_users + inactive_ldap_users if inactive_ldap_users > 0 \
                else inactive_db_users

        is_pro = is_pro_version()
        if is_pro:
            license_file = os.path.join(seahub.settings.PROJECT_ROOT, '../../seafile-license.txt')
            license_dict = parse_license(license_file)
        else:
            license_dict = {}

        if license_dict:
            with_license = True
        else:
            with_license = False

        info = {
            'users_count': active_users + inactive_users,
            'active_users_count': active_users,
            'repos_count': repos_count,
            'groups_count': groups_count,
            'org_count': org_count,
            'multi_tenancy_enabled': multi_tenancy_enabled,
            'is_pro': is_pro,
            'with_license': with_license,
            'license': license_dict
        }

        return Response(info)
