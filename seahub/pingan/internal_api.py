import jwt
import os
from django.utils.http import urlquote
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from seahub.api2.utils import api_error

from seahub.api2.throttling import UserRateThrottle
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.settings import SECRET_KEY, JWT_PRIVATE_KEY

from seahub.share.models import FileShare, UploadLinkShare, ExternalRepoUploadLinkLog
from seahub.utils import get_service_url, send_html_email
from seahub.utils.repo import parse_repo_perm
from seaserv import seafile_api


def is_valid_internal_jwt(auth):
    if not auth or auth[0].lower() != 'token' or len(auth) != 2:
        return False
    
    token = auth[1]
    if not token:
        return False
    
    try:
        payload = jwt.decode(token, JWT_PRIVATE_KEY, algorithms=['HS256'])
    except:
        return False
    else:
        is_internal = payload.get('is_internal')
        if is_internal:
            return True
    
    return False




class InternalUploadLinkLogs(APIView):
    # authentication_classes = (SessionCRSFCheckFreeAuthentication, )
    throttle_classes = (UserRateThrottle, )

    def post(self, request):

        auth = request.META.get('HTTP_AUTHORIZATION', '').split()
        is_valid = is_valid_internal_jwt(auth)
        if not is_valid:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        link_token = request.data.get('token')

        share_obj = UploadLinkShare.objects.filter(token=link_token).first()
        if not share_obj:
            error_msg = 'Share link does not exist.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if share_obj.is_expired():
            error_msg = 'Link is expired.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        ip_addr = request.data.get('ip_addr')
        commit_id = request.data.get('commit_id')
        file_path = request.data.get('file_relative_path')
        is_virus = request.data.get('is_virus', False)
        size = request.data.get('file_size', 0)

        ExternalRepoUploadLinkLog.objects.create(
            link_token = link_token,
            ip_addr = ip_addr,
            commit_id = commit_id,
            file_path = file_path,
            is_virus = is_virus,
            file_size = size,
            created_by = ip_addr,
            updated_by = ip_addr
        )

        repo = seafile_api.get_repo(share_obj.repo_id)
        repo_name = repo.repo_name
        
        server_url = get_service_url()
        if is_virus:
            title = "【平安网盘文件外传内】外部文件上传拦截通知"
            template = "shared_ex_upload_link_virus_email.html"
            
        else:
            title = "【平安网盘文件外传内】外部文件上传成功通知"
            template = 'shared_ex_upload_link_done_email.html'
        
            parent_dir = share_obj.path
            file_path = file_path
            to_email = share_obj.username
            c = {
                'name': email2nickname(to_email),
                'filename': os.path.basename(file_path),
                'file_link': "%s/library/%s/%s%s" % (
                    server_url.rstrip('/'),
                    share_obj.repo_id,
                    urlquote(repo_name),
                    urlquote(parent_dir)
                )
            }
            send_html_email(title, template, c, None, [to_email], )
        return Response({'success': True})