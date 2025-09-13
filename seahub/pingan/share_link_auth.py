import logging
import json
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from seahub.api2.utils import api_error
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.permissions import CanGenerateShareLink
from seahub.avatar.templatetags.avatar_tags import api_avatar_url
from seahub.base.accounts import User
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email
from seahub.share.models import FileShare
from seahub.utils.repo import parse_repo_perm
from seaserv import seafile_api


logger = logging.getLogger(__name__)


def get_user_auth_info(username, token):
    avatar_url, _, _ = api_avatar_url(username, 72)
    name = email2nickname(username)
    contact_email = email2contact_email(username)
    return {
        'username': username,
        'name': name,
        'avatar_url': avatar_url,
        'link_token': token,
        'contact_email': contact_email
    }


def check_link_share_perms(request, repo_id, path):
    username = request.user.username
    repo_folder_permission = seafile_api.check_permission_by_path(repo_id, path, username)
    if parse_repo_perm(repo_folder_permission).can_generate_share_link is False:
        return False
    
    return True
        
    

class ShareLinkUserAuthView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, CanGenerateShareLink)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, token):
    
        try:
            file_share = FileShare.objects.get(token=token)
        except FileShare.DoesNotExist:
            error_msg = 'token invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        
        try:
            authed_details = json.loads(file_share.authed_details)
        except:
            authed_details = {}
            
        try:
            user_auth_infos = authed_details.get('authed_users', [])
            resp = []
            for auth_username in user_auth_infos:
                resp.append(get_user_auth_info(auth_username, token))
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
    
        return Response({'auth_list': resp})


    def post(self, request, token):

        try:
            path = request.data.get('path', None)
            if not path:
                error_msg = 'path invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            try:
                file_share = FileShare.objects.get(token=token)
            except FileShare.DoesNotExist:
                error_msg = 'token invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            
            repo_id = file_share.repo_id
            if not check_link_share_perms(request, repo_id, path):
                error_msg = 'Permission denied.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)
            
            
            email_list = request.data.get('emails', [])
            try:
                authed_details = json.loads(file_share.authed_details)
            except:
                authed_details = {}
            user_auth_infos = authed_details.get('authed_users', [])
            exist_emails = user_auth_infos
            auth_infos = []
            for username in email_list:
                if username in exist_emails:
                    continue
                try:
                    User.objects.get(email=username)
                except User.DoesNotExist:
                    continue

                user_auth_infos.append(username)
                auth_infos.append(get_user_auth_info(username, token))
            authed_details['authed_users'] = user_auth_infos
            file_share.authed_details = json.dumps(authed_details)
            file_share.save()

        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'auth_list': auth_infos})


    def delete(self, request, token):
        try:
            file_share = FileShare.objects.get(token=token)
        except FileShare.DoesNotExist:
            return Response({'success': True})
        
        if not file_share.is_owner(request.user.username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            authed_details = json.loads(file_share.authed_details)
        except:
            authed_details = {}
            
        try:
            user_auth_infos = authed_details.get('authed_users', [])
            email_list = request.data.get('emails')
            new_user_auth_infos = []
            for u in user_auth_infos:
                if u not in email_list:
                    new_user_auth_infos.append(u)
            authed_details['authed_users'] = new_user_auth_infos
            file_share.authed_details = json.dumps(authed_details)
            file_share.save()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
