import logging

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seaserv import get_org_id_by_repo_id
from seahub.utils.repo import parse_repo_perm
from seahub.views import check_folder_permission
from seahub.wopi.utils import get_file_info_by_token
from seahub.wopi.mentions import cache_wopi_mentions

logger = logging.getLogger(__name__)


def get_valid_wopi_info(access_token, request_user, repo_id=None, file_path=None):
    info_dict = get_file_info_by_token(access_token)
    if not info_dict:
        return None
    if info_dict.get('request_user') != request_user:
        return None
    if repo_id is not None and info_dict.get('repo_id') != repo_id:
        return None
    if file_path is not None and info_dict.get('file_path') != file_path:
        return None
    return info_dict


class WOPIMentionsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        repo_id = request.data.get('repo_id', '')
        file_path = request.data.get('file_path', '')
        access_token = request.data.get('access_token', '')
        mentioned_users = request.data.get('mentioned_users', [])
        org_id = get_org_id_by_repo_id(repo_id)

        if not repo_id:
            return api_error(status.HTTP_400_BAD_REQUEST, 'repo_id invalid.')
        if not file_path:
            return api_error(status.HTTP_400_BAD_REQUEST, 'file_path invalid.')
        if not mentioned_users:
            return api_error(status.HTTP_400_BAD_REQUEST, 'mentioned_users invalid.')

        permission = check_folder_permission(request, repo_id, file_path)
        if not permission or not parse_repo_perm(permission).can_edit_on_web:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        if not access_token:
            return api_error(status.HTTP_400_BAD_REQUEST, 'access_token invalid.')

        username = request.user.username
        if not get_valid_wopi_info(access_token, username, repo_id=repo_id, file_path=file_path):
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            cache_wopi_mentions(
                access_token,
                username,
                repo_id,
                file_path,
                mentioned_users,
                org_id=org_id,
            )
        except Exception as e:
            logger.error(e)
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, 'Internal Server Error')

        return Response({'success': True})
