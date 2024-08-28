# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, is_valid_internal_jwt, get_user_common_info

logger = logging.getLogger(__name__)

class InternalUserListView(APIView):
   
    throttle_classes = (UserRateThrottle, )
    
    def post(self, request):
        # permission check
        auth = request.META.get('HTTP_AUTHORIZATION', '').split()
        remote_addr = request.META.get('REMOTE_ADDR')
        if '127.0.0.1' not in remote_addr:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        # is_valid = is_valid_internal_jwt(auth)
        # if not is_valid:
        #     error_msg = 'Permission denied.'
        #     return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
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
