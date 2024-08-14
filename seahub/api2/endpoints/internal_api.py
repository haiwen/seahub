# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, is_valid_internal_jwt, get_user_common_info
from seahub.share.models import UploadLinkShare, FileShare

logger = logging.getLogger(__name__)

class InternalUserListView(APIView):
   
    throttle_classes = (UserRateThrottle, )
    
    def post(self, request):
        # permission check
        auth = request.META.get('HTTP_AUTHORIZATION', '').split()
        is_valid = is_valid_internal_jwt(auth)
        if not is_valid:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
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


class InternalShareLinkInfo(APIView):
    throttle_classes = (UserRateThrottle, )
    
    def get(self, request):
        
        auth = request.META.get('HTTP_AUTHORIZATION', '').split()
        is_valid = is_valid_internal_jwt(auth)
        if not is_valid:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        link_token = request.GET.get('token')
        
        share_obj = UploadLinkShare.objects.filter(token=link_token).first()
        if share_obj:
            share_obj.s_type = 'u'
        else:
            share_obj = FileShare.objects.filter(token=link_token).first()
            
        if not share_obj:
            error_msg = 'Share link does not exist.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if share_obj.is_expired():
            error_msg = 'Link is expired.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        
        repo_id = share_obj.repo_id
        file_path, parent_dir = '', ''
        share_path = share_obj.path
        share_type = share_obj.s_type
        if share_type == 'f':
            file_path = share_path
        else:
            parent_dir = share_path
            
        resp_json = {
            'repo_id': repo_id,
            'file_path': file_path,
            'parent_dir': parent_dir,
            'share_type': share_type
        }
        return Response({'share_link_info': resp_json})
