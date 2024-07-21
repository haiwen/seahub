# -*- coding: utf-8 -*-
import logging

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication

from seahub.api2.utils import api_error, get_user_common_info
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication

logger = logging.getLogger(__name__)


class UserListView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def post(self, request):
        """return user_list by user_id_list
        """
        # argument check
        user_id_list = request.data.get('user_id_list')
        if not isinstance(user_id_list, list):
            error_msg = 'user_id_list invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # main
        user_list = list()
        for user_id in user_id_list:
            if not isinstance(user_id, str):
                continue
            user_info = get_user_common_info(user_id)
            user_list.append(user_info)

        return Response({'user_list': user_list})
