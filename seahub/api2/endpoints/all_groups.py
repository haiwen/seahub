# Copyright (c) 2011-2016 Seafile Ltd.
import logging
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import ccnet_api

from seahub.api2.utils import api_error
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.endpoints.groups import get_group_info
from seahub.avatar.settings import GROUP_AVATAR_DEFAULT_SIZE

logger = logging.getLogger(__name__)


class AllGroups(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def get(self, request):
        """ List all groups in system.
        """

        try:
            groups = ccnet_api.get_all_groups(-1, -1)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        try:
            avatar_size = int(request.GET.get('avatar_size',
                GROUP_AVATAR_DEFAULT_SIZE))
        except ValueError:
            avatar_size = GROUP_AVATAR_DEFAULT_SIZE

        result = [get_group_info(request, g.id, avatar_size) for g in groups]

        return Response(result)
