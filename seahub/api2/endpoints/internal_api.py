# Copyright (c) 2012-2016 Seafile Ltd.
import logging
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from seahub.api2.authentication import SessionCRSFCheckFreeAuthentication
from seahub.api2.models import Token
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, is_valid_internal_jwt, get_user_common_info
from seahub.base.accounts import User
from seahub.repo_api_tokens.models import RepoAPITokens
from seahub.share.models import UploadLinkShare, FileShare, check_share_link_access, check_share_link_access_by_scope
from seaserv import seafile_api
from seahub.utils.repo import parse_repo_perm
from seahub.views.file import send_file_access_msg
from seahub.utils import normalize_file_path

logger = logging.getLogger(__name__)

OP_DOWNLOAD = 'download'
OP_UPLOAD = 'upload'
AVAILABLE_OPS = [
    OP_UPLOAD,
    OP_DOWNLOAD
]


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


class InternalCheckShareLinkAccess(APIView):
    authentication_classes = (SessionCRSFCheckFreeAuthentication, )
    throttle_classes = (UserRateThrottle, )
    
    def post(self, request):
        
        auth = request.META.get('HTTP_AUTHORIZATION', '').split()
        is_valid = is_valid_internal_jwt(auth)
        if not is_valid:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        link_token = request.data.get('token')
        ip_addr = request.data.get('ip_addr')
        user_agent = request.data.get('user_agent')

        share_obj = UploadLinkShare.objects.filter(token=link_token).first()
        if share_obj:
            share_obj.s_type = 'u'
        else:
            share_obj = FileShare.objects.filter(token=link_token).first()
            
        if not share_obj:
            error_msg = 'Link does not exist.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if share_obj.is_expired():
            error_msg = 'Link is expired.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        if share_obj.s_type != 'u':

            if share_obj.is_encrypted() and not check_share_link_access(request,
                                                                        link_token):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            if not check_share_link_access_by_scope(request, share_obj):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        repo_id = share_obj.repo_id
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Repo not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)
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
        send_file_access_msg(request, repo, file_path, 'share-link', custom_ip=ip_addr, custom_agent=user_agent)
        return Response(resp_json)


class InternalCheckFileOperationAccess(APIView):
    authentication_classes = (SessionCRSFCheckFreeAuthentication, )
    
    def _get_user_by_accont_token(self, token):
    
        if not token:
            return None
    
        try:
            token = Token.objects.get(key=token)
        except Token.DoesNotExist:
            return None
    
        try:
            user = User.objects.get(email=token.user)
        except User.DoesNotExist:
            return None
    
        return user.username

    def post(self, request, repo_id):
        auth = request.META.get('HTTP_AUTHORIZATION', '').split()
        is_valid = is_valid_internal_jwt(auth)
        if not is_valid:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        file_path = request.data.get('path', '/')
        file_path = normalize_file_path(file_path)
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            return api_error(status.HTTP_404_NOT_FOUND, 'Library %s not found.' % repo_id)

        file_id = seafile_api.get_file_id_by_path(repo_id, file_path)
        if not file_id:
            error_msg = 'File not found'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        token = request.data.get('token') # account token or repo token
        ip_addr = request.data.get('ip_addr')
        user_agent = request.data.get('user_agent')
        op = request.data.get('op')
        if op not in AVAILABLE_OPS:
            error_msg = 'operation is invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        username = request.user.username  # user info from cookie
        if not username:
            # take token as account token
            username = self._get_user_by_accont_token(token)
        
        if username:
            op_perms = parse_repo_perm(seafile_api.check_permission_by_path(
                        repo_id, '/', username))
            
            if op == OP_DOWNLOAD and not op_perms.can_download:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            if op == OP_UPLOAD and not op_perms.can_upload:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            
            send_file_access_msg(request, repo, file_path, 'web', custom_ip=ip_addr, custom_agent=user_agent)
            return Response({'user': username})
        
        # if there is no username, take token as repo api token
        if not token:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        rat = RepoAPITokens.objects.filter(repo_id=repo_id, token=token).first()
        if not rat:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        return Response({'user': rat.app_name})
