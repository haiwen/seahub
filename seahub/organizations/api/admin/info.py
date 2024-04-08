# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication

from django.utils.translation import gettext as _

from seaserv import ccnet_api, seafile_api

from seahub.api2.utils import api_error
from seahub.api2.permissions import IsProVersion
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication

from seahub.organizations.models import OrgMemberQuota
from seahub.organizations.settings import ORG_MEMBER_QUOTA_ENABLED, \
        ORG_ENABLE_ADMIN_CUSTOM_NAME
from seahub.organizations.api.permissions import IsOrgAdmin

logger = logging.getLogger(__name__)


def get_org_info(request, org_id):

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

    file_ext_white_list = seafile_api.org_get_file_ext_white_list(org_id)

    info = {}
    info['storage_quota'] = storage_quota
    info['storage_usage'] = storage_usage
    info['member_quota'] = member_quota
    info['member_usage'] = member_usage
    info['active_members'] = active_members
    info['file_ext_white_list'] = file_ext_white_list

    return info


class OrgAdminInfo(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdmin)

    def get(self, request):
        """Get info of an organization
        """

        org = request.user.org
        org_id = org.org_id

        info = get_org_info(request, org_id)
        info['org_id'] = org_id
        info['org_name'] = org.org_name

        return Response(info)

    def put(self, request):
        """Update info of an organization
        """

        new_name = request.data.get('org_name', None)
        if new_name:

            if not ORG_ENABLE_ADMIN_CUSTOM_NAME:
                error_msg = _('Feature is not enabled.')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            org_id = request.user.org.org_id
            ccnet_api.set_org_name(org_id, new_name)

        info = get_org_info(request, org_id)
        info['org_id'] = org_id
        info['org_name'] = new_name

        return Response(info)
