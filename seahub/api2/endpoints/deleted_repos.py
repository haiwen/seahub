import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from seaserv import seafile_api

from pysearpc import SearpcError

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.base import APIView
from seahub.api2.utils import api_error
from seahub.base.templatetags.seahub_tags import email2nickname, \
        email2contact_email
from seahub.utils.timeutils import timestamp_to_isoformat_timestr

logger = logging.getLogger(__name__)


class DeletedRepos(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """
        get the deleted-repos of owner
        """
        trashs_json = []
        email = request.user.username

        trash_repos = seafile_api.get_trash_repos_by_owner(email)
        for r in trash_repos:
            trash = {
                    "repo_id": r.repo_id,
                    "owner_email": email,
                    "owner_name": email2nickname(email),
                    "owner_contact_email": email2contact_email(email),
                    "repo_name": r.repo_name,
                    "org_id": r.org_id,
                    "head_commit_id": r.head_id,
                    "encrypted": r.encrypted,
                    "del_time": timestamp_to_isoformat_timestr(r.del_time),
                    "size": r.size,
            }
            trashs_json.append(trash)
        return Response(trashs_json)

    def post(self, request):
        """
        restore deleted-repo
            return:
                return True if success, otherwise api_error
        """
        post_data = request.POST
        repo_id = post_data.get('repo_id', '')
        username = request.user.username
        if not repo_id:
            error_msg = "repo_id can not be empty."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        owner = seafile_api.get_trash_repo_owner(repo_id)
        if owner is None:
            error_msg = "Library does not exist in trash."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        if owner != username:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            seafile_api.restore_repo_from_trash(repo_id)
        except SearpcError as e:
            logger.error(e)
            error_msg = "Internal Server Error"
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({"success": True})
