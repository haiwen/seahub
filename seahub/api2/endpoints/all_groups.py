# Copyright (c) 2011-2016 Seafile Ltd.
from django.conf import settings
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from seaserv import ccnet_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.endpoints.groups import get_group_info
from seahub.avatar.settings import GROUP_AVATAR_DEFAULT_SIZE


class AllGroupsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        """List all groups
        """
        if settings.ENABLE_SHARE_TO_ALL_GROUPS:
            groups_list = ccnet_api.get_all_groups(-1, -1)
        else:
            return Response([])
        try:
            avatar_size = int(request.GET.get('avatar_size', 
                                              GROUP_AVATAR_DEFAULT_SIZE))
        except ValueError:
            avatar_size = GROUP_AVATAR_DEFAULT_SIZE

        groups = [get_group_info(request, g.id, avatar_size) 
                  for g in groups_list]
        return Response(groups)
