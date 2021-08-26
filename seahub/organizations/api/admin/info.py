# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication

from seaserv import ccnet_api, seafile_api

from seahub.api2.permissions import IsProVersion
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication

from seahub.organizations.models import OrgMemberQuota
from seahub.organizations.settings import ORG_MEMBER_QUOTA_ENABLED
from seahub.organizations.api.permissions import IsOrgAdmin

logger = logging.getLogger(__name__)

class OrgAdminInfo(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdmin)

    def get(self, request):
        """Get info of an organization
        """

        org = request.user.org
        org_id = org.org_id

        # space quota
        try:
            storage_quota = seafile_api.get_org_quota(org_id)
        except Exception as e:
            logger.error(e)
            storage_quota = 0

        # storage usage
        try:
            storage_usage = seafile_api.get_org_quota_usage(org_id)
        except Exception as e:
            logger.error(e)
            storage_usage = 0

        # member quota
        if ORG_MEMBER_QUOTA_ENABLED:
            member_quota = OrgMemberQuota.objects.get_quota(org_id)
        else:
            member_quota = None

        # member usage
        try:
            url_prefix = request.user.org.url_prefix
            org_members = ccnet_api.get_org_emailusers(url_prefix, -1, -1)
        except Exception as e:
            logger.error(e)
            org_members = []

        member_usage = 0
        active_members = 0
        if org_members:
            member_usage = len(org_members)
            active_members = len([m for m in org_members if m.is_active])

        info = {}
        info['org_id'] = org_id
        info['org_name'] = org.org_name
        info['storage_quota'] = storage_quota
        info['storage_usage'] = storage_usage
        info['member_quota'] = member_quota
        info['member_usage'] = member_usage
        info['active_members'] = active_members

        return Response(info)
