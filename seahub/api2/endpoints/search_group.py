# Copyright (c) 2012-2016 Seafile Ltd.

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from django.conf import settings

import seaserv
from seaserv import ccnet_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

from seahub.utils import is_org_context
from seahub.utils.timeutils import timestamp_to_isoformat_timestr

try:
    from seahub.settings import CLOUD_MODE
except ImportError:
    CLOUD_MODE = False

def get_group_info(group_id):
    group = ccnet_api.get_group(group_id)
    isoformat_timestr = timestamp_to_isoformat_timestr(group.timestamp)
    group_info = {
        "id": group.id,
        "name": group.group_name,
        "owner": group.creator_name,
        "created_at": isoformat_timestr,
    }

    return group_info

class SearchGroup(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def _can_use_global_address_book(self, request):

        return request.user.permissions.can_use_global_address_book()

    def get(self, request, format=None):
        """  Search group.

        Permission checking:
        1. default(NOT guest) user;
        """

        # argument check
        q = request.GET.get('q', None)
        if not q:
            error_msg = 'q invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # permission check
        if not self._can_use_global_address_book(request):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if CLOUD_MODE:
            if is_org_context(request):
                org_id = request.user.org.org_id
                groups = ccnet_api.get_org_groups(org_id, -1, -1)
            elif settings.ENABLE_GLOBAL_ADDRESSBOOK:
                groups = ccnet_api.get_all_groups(-1, -1)
            else:
                username = request.user.username
                groups = ccnet_api.get_groups(username)
        else:
            groups = ccnet_api.get_all_groups(-1, -1)

        result = []
        for group in groups:
            group_name = group.group_name
            if not group_name:
                continue

            if q.lower() in group_name.lower():
                group_info = get_group_info(group.id)
                result.append(group_info)

        return Response(result)
