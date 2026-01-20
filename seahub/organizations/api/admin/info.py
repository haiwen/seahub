# Copyright (c) 2012-2016 Seafile Ltd.
import logging
from datetime import datetime

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication
from django.conf import settings

from django.utils.translation import gettext as _

from seaserv import ccnet_api, seafile_api

from seahub.api2.utils import api_error
from seahub.api2.permissions import IsProVersion
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication

from seahub.utils import get_org_traffic_by_month
from seahub.utils.file_size import get_file_size_unit

from seahub.organizations.utils import get_org_traffic_limit
from seahub.organizations.api.permissions import IsOrgAdmin
from seahub.organizations.models import OrgAdminSettings, \
        OrgMemberQuota, FORCE_ADFS_LOGIN, DISABLE_ORG_ENCRYPTED_LIBRARY, \
        DISABLE_ORG_USER_CLEAN_TRASH
from seahub.organizations.settings import ORG_MEMBER_QUOTA_ENABLED, \
        ORG_ENABLE_ADMIN_CUSTOM_NAME

from django.conf import settings as dj_settings
from seahub.ai.utils import get_ai_cost_by_user, get_ai_credit_by_user

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

    # user default quota
    try:
        user_default_quota = seafile_api.get_org_user_default_quota(org_id)
    except Exception as e:
        logger.error(e)
        user_default_quota = 0

    # member quota
    if ORG_MEMBER_QUOTA_ENABLED:
        member_quota = OrgMemberQuota.objects.get_quota(org_id)
    else:
        member_quota = 0

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
    info = {
        DISABLE_ORG_ENCRYPTED_LIBRARY: False,
        DISABLE_ORG_USER_CLEAN_TRASH: False,
        FORCE_ADFS_LOGIN: False
    }
    org_settings = OrgAdminSettings.objects.filter(org_id=org_id)
    setting_items = {item.key: item.value for item in org_settings}
    for key, value in info.items():
        if key in setting_items:
            info[key] = int(setting_items[key])

    if settings.ENABLE_MULTI_ADFS is False:
        info[FORCE_ADFS_LOGIN] = False

    current_date = datetime.now()
    info['traffic_this_month'] = get_org_traffic_by_month(org_id, current_date)
    info['traffic_limit'] = get_org_traffic_limit(request.user.org)

    if dj_settings.ENABLE_SEAFILE_AI and dj_settings.SEAFILE_AI_SERVER_URL:
        info['ai_cost'] = round(get_ai_cost_by_user(request.user, org_id), 2)
        info['ai_credit'] = get_ai_credit_by_user(request.user, org_id)

    info['storage_quota'] = storage_quota
    info['storage_usage'] = storage_usage
    info['user_default_quota'] = user_default_quota
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

        org_id = request.user.org.org_id

        new_name = request.data.get('org_name', None)
        if new_name:

            if not ORG_ENABLE_ADMIN_CUSTOM_NAME:
                error_msg = _('Feature is not enabled.')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            ccnet_api.set_org_name(org_id, new_name)

        user_default_quota = request.data.get('user_default_quota', None)
        if user_default_quota:

            try:
                user_default_quota = int(user_default_quota)
            except ValueError:
                error_msg = 'user_default_quota invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            user_default_quota = int(user_default_quota) * get_file_size_unit('MB')
            seafile_api.set_org_user_default_quota(org_id, user_default_quota)

        info = get_org_info(request, org_id)
        info['org_id'] = org_id
        info['org_name'] = new_name

        return Response(info)
