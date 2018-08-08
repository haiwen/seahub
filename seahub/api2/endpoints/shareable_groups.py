# Copyright (c) 2011-2016 Seafile Ltd.
import os
import sys
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from seaserv import ccnet_api

from seahub.utils import is_org_context
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.endpoints.groups import get_group_info
from seahub.avatar.settings import GROUP_AVATAR_DEFAULT_SIZE

from constance import config

try:
    current_path = os.path.dirname(os.path.abspath(__file__))
    seafile_conf_dir = os.path.join(current_path, \
            '../../../../../conf')
    sys.path.append(seafile_conf_dir)
    from seahub_custom_functions import custom_get_groups
    CUSTOM_GET_GROUPS = True
except ImportError as e:
    CUSTOM_GET_GROUPS = False

class ShareableGroups(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        """ List groups that user can share a library to.
        """
        if config.ENABLE_SHARE_TO_ALL_GROUPS:
            if CUSTOM_GET_GROUPS:
                groups = custom_get_groups(request)
            else:
                groups = ccnet_api.get_all_groups(-1, -1)
        else:
            username = request.user.username
            if is_org_context(request):
                org_id = request.user.org.org_id
                groups = ccnet_api.get_org_groups_by_user(org_id, username)
            else:
                groups = ccnet_api.get_groups(username)

        try:
            avatar_size = int(request.GET.get('avatar_size',
                GROUP_AVATAR_DEFAULT_SIZE))
        except ValueError:
            avatar_size = GROUP_AVATAR_DEFAULT_SIZE

        result = [get_group_info(request, g.id, avatar_size) for g in groups]

        return Response(result)
