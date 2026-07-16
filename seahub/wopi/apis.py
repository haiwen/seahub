import logging

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error, get_user_common_info
from seahub.base.accounts import User
from seahub.utils import normalize_file_path, is_valid_username, is_org_context
from seahub.views import check_folder_permission
from seahub.wopi.mention_utils import add_wopi_mentioned_user
from seahub.utils.repo import get_related_users_by_repo

logger = logging.getLogger(__name__)


class WopiMentionsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, repo_id, format=None):
        path = request.GET.get('path')
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'path invalid.')
        path = normalize_file_path(path)

        if not seafile_api.get_file_id_by_path(repo_id, path):
            return api_error(status.HTTP_404_NOT_FOUND, 'File %s not found.' % path)

        if not check_folder_permission(request, repo_id, '/'): 
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        query = request.GET.get('q', '').strip().lower()
        org_id = request.user.org.org_id if is_org_context(request) else None

        try:
            related_user_list = get_related_users_by_repo(repo_id, org_id)
            user_list = []
            for username in related_user_list:
                user_info = get_user_common_info(username)
                if not query or query in user_info['email'].lower() or query in user_info['name'].lower():
                    user_list.append({
                        'username': user_info['email'],
                        'label': user_info['name'],
                        'profile': '',
                    })
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'list': user_list})

    def post(self, request, repo_id, format=None):
        path = request.data.get('path')
        if not path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'path invalid.')
        path = normalize_file_path(path)

        username = request.data.get('username')
        if not username or not is_valid_username(username):
            return api_error(status.HTTP_400_BAD_REQUEST, 'username invalid.')

        if not check_folder_permission(request, repo_id, '/'): 
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        if not seafile_api.get_file_id_by_path(repo_id, path):
            return api_error(status.HTTP_404_NOT_FOUND, 'File %s not found.' % path)

        try:
            User.objects.get(email=username)
        except User.DoesNotExist:
            return api_error(status.HTTP_404_NOT_FOUND, 'User not found.')

        add_wopi_mentioned_user(repo_id, path, request.user.username, username)
        return Response({'success': True})
