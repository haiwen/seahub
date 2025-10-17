# Copyright (c) 2012-2016 Seafile Ltd.
import logging
import os
import re
from io import BytesIO
import requests
import json
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from seahub.api2.authentication import SessionCRSFCheckFreeAuthentication, TokenAuthentication
from seahub.api2.models import Token
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, is_valid_internal_jwt, get_user_common_info
from seahub.base.accounts import User
from seahub.repo_api_tokens.models import RepoAPITokens
from seahub.seadoc.utils import gen_seadoc_image_parent_path, get_seadoc_asset_upload_link
from seahub.settings import SERVICE_URL
from seahub.share.models import UploadLinkShare, FileShare, check_share_link_access, check_share_link_access_by_scope
from seaserv import seafile_api

from seahub.tags.models import FileUUIDMap
from seahub.utils.repo import parse_repo_perm
from seahub.views.file import send_file_access_msg, FILE_TYPE_FOR_NEW_FILE_LINK
from seahub.utils import normalize_file_path, get_file_type_and_ext
from seahub.views import check_folder_permission


logger = logging.getLogger(__name__)

OP_DOWNLOAD = 'download'
OP_UPLOAD = 'upload'
AVAILABLE_OPS = [
    OP_UPLOAD,
    OP_DOWNLOAD
]

SEADOC_IMAGE_CONVERT_LIMIT = 50

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
        
        filename = os.path.basename(file_path)
        filetype, ext = get_file_type_and_ext(filename)
        
        # The download permission can be ignored when the permission check
        # called from seaf-server for some file types such as video, markdown and pdf
        # which is viewed / downloaded directly by requesting seaf-server.
        
        ignore_download_perms = filetype in FILE_TYPE_FOR_NEW_FILE_LINK
        
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

            if op == OP_DOWNLOAD:
                if not (ignore_download_perms or op_perms.can_download):
                    error_msg = 'Permission denied.'
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)
            if op == OP_UPLOAD and not op_perms.can_upload:
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)
            
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

class CheckThumbnailAccess(APIView):
    authentication_classes = (SessionCRSFCheckFreeAuthentication, )

    def post(self, request, repo_id):
        auth = request.META.get('HTTP_AUTHORIZATION', '').split()
        path = request.data.get('path')
        is_valid = is_valid_internal_jwt(auth)
        if not is_valid:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        if not path:
            error_msg = 'path invalid'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        if check_folder_permission(request, repo_id, path) is None:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        return Response({'success': True})
    
class CheckThumbnailAccessByUserToken(APIView):
    authentication_classes = (TokenAuthentication, )
    
    def post(self, request, repo_id):
        path = request.data.get('path')
        if not path:
            error_msg = 'path invalid'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        if check_folder_permission(request, repo_id, path) is None:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        return Response({'success': True})
    
class CheckShareLinkThumbnailAccess(APIView):
    authentication_classes = (SessionCRSFCheckFreeAuthentication,)
    
    def post(self, request):
        auth = request.META.get('HTTP_AUTHORIZATION', '').split()
        link_token = request.data.get('token')
        is_valid = is_valid_internal_jwt(auth)
        if not is_valid:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        
        share_obj = FileShare.objects.filter(token=link_token).first()

        if not share_obj:
            error_msg = 'Link does not exist.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if share_obj.is_expired():
            error_msg = 'Link is expired.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if share_obj.is_encrypted() and not check_share_link_access(request,
                                                                    link_token):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not check_share_link_access_by_scope(request, share_obj):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        resp_json = {
            'success': True,
            'repo_id': share_obj.repo_id,
            'share_path': share_obj.path,
            'share_type': share_obj.s_type
        }
        return Response(resp_json)


class InternalConvertSeadocImage(APIView):
    authentication_classes = ()
    throttle_classes = (UserRateThrottle,)
    
    def _handle_outer_image(self, repo_id, doc_uuid, image_url, image_name):
        resp = requests.get(image_url)
        image_content = resp.content
        parent_path = gen_seadoc_image_parent_path(doc_uuid, repo_id, '')

        upload_link = get_seadoc_asset_upload_link(repo_id, parent_path, '')
        files = {'file': (f'{image_name}', BytesIO(image_content))}
        data = {'parent_dir': parent_path}
        requests.post(upload_link, files=files, data=data)
        
    def _handle_inner_image(self, repo_id, doc_uuid, image_url, image_name):
        md_img_url_re = re.compile(r"^(.+?)/lib/([-a-f0-9]{36})/file/(.+?)(\?|$)", re.IGNORECASE)
        seadoc_img_url_re =  re.compile("^(.+?)/api/v2.1/seadoc/download-image/([-a-f0-9]{36})/(.+?)(\?|$)", re.IGNORECASE)
        is_md_image, is_seadoc_image, match_result = False, False, None
        md_match_result = md_img_url_re.match(image_url)
        seadoc_match_result = seadoc_img_url_re.match(image_url)
        
        if md_match_result:
            is_md_image = True
            match_result = md_match_result
        elif seadoc_match_result:
            is_seadoc_image = True
            match_result = seadoc_match_result
        else:
            logger.warning(f"Failed to covert seadoc image: {image_url}")
            return
        
        if is_md_image:
            src_repo_id = match_result.group(2)
            src_file_path = match_result.group(3)
            src_dir = os.path.dirname(src_file_path)
            src_file_name = os.path.basename(src_file_path)
        elif is_seadoc_image:
            src_doc_uuid = match_result.group(2)
            src_file_name = match_result.group(3)
            src_uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(src_doc_uuid)
            if not src_uuid_map:
                error_msg = 'src seadoc uuid %s not found.' % doc_uuid
                raise error_msg
            
            src_repo_id = src_uuid_map.repo_id
            src_dir = gen_seadoc_image_parent_path(src_doc_uuid, src_repo_id, '')
        else:
            return

        dst_dir = gen_seadoc_image_parent_path(doc_uuid, repo_id, '')
        seafile_api.copy_file(
            src_repo_id, src_dir,
            json.dumps([src_file_name]),
            repo_id, dst_dir,
            json.dumps([image_name]),
            '', 0, synchronous=1
        )
        
    def post(self, request, doc_uuid):
        # jwt permission check
        auth = request.headers.get('authorization', '').split()
        if not is_valid_internal_jwt(auth, provided_key='seadoc'):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)
        
        image_name_url_map = request.data.get('image_name_url_map')
        if not image_name_url_map:
            return Response({'success': True})

        uuid_map = FileUUIDMap.objects.get_fileuuidmap_by_uuid(doc_uuid)
        if not uuid_map:
            error_msg = 'seadoc uuid %s not found.' % doc_uuid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        repo_id = uuid_map.repo_id
        count = 0
        for image_name, image_url in image_name_url_map.items():
            try:
                if SERVICE_URL in image_url:
                    self._handle_inner_image(repo_id, doc_uuid, image_url, image_name)
                else:
                    self._handle_outer_image(repo_id, doc_uuid, image_url, image_name)
                count += 1
            except Exception as e:
                logger.error(e)
                continue
            if count >= SEADOC_IMAGE_CONVERT_LIMIT:
                break
            
        return Response({'success': True})
