# Copyright (c) 2011-2016 Seafile Ltd.
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.endpoints.groups import get_group_info
from seahub.avatar.settings import GROUP_AVATAR_DEFAULT_SIZE
from seahub.utils import is_org_context
from seahub.settings import ENABLE_SHARE_ANY_GROUPS


class GroupsSharableView(APIView):
    """Only for share group selection"""
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        """Get personal groups or get all groups
        """
        org_id = None
        username = request.user.username
        if ENABLE_SHARE_ANY_GROUPS:
            groups_list = seafile_api.get_all_groups(-1, -1)
        else:
            if is_org_context(request):
                org_id = request.user.org.org_id
                groups_list = seafile_api.get_org_groups_by_user(org_id, username)
            else:
                groups_list = seafile_api.get_personal_groups_by_user(username)

        try:
            avatar_size = int(request.GET.get('avatar_size', 
                                              GROUP_AVATAR_DEFAULT_SIZE))
        except ValueError:
            avatar_size = GROUP_AVATAR_DEFAULT_SIZE

        groups = [get_group_info(request, g.id, avatar_size) 
                  for g in groups_list]
        return Response(groups)
