import logging

from seaserv import ccnet_api, seafile_api

from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.permissions import IsProVersion, IsOrgAdminUser
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

from seahub.base.accounts import User
from seahub.organizations.models import OrgSAMLConfig

try:
    from seahub.settings import MULTI_TENANCY
except ImportError:
    MULTI_TENANCY = False

logger = logging.getLogger(__name__)


class OrgAdminDeleteOrg(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def delete(self, request, org_id):

        if not MULTI_TENANCY:
            error_msg = 'Feature is not enabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        org_id = int(org_id)
        if org_id == 0:
            error_msg = 'org_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %s not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            # remove org users
            users = ccnet_api.get_org_emailusers(org.url_prefix, -1, -1)
            for u in users:
                ccnet_api.remove_org_user(org_id, u.email)
                User.objects.get(email=u.email).delete()

            # remove org groups
            groups = ccnet_api.get_org_groups(org_id, -1, -1)
            for g in groups:
                ccnet_api.remove_org_group(org_id, g.gid)

            # remove org repos
            seafile_api.remove_org_repo_by_org_id(org_id)

            # remove org saml config
            OrgSAMLConfig.objects.filter(org_id=org_id).delete()

            # remove org
            ccnet_api.remove_org(org_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
