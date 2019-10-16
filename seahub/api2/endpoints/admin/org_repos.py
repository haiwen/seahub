import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import ccnet_api, seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.api2.permissions import IsProVersion
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email

try:
    from seahub.settings import ORG_MEMBER_QUOTA_ENABLED
except ImportError:
    ORG_MEMBER_QUOTA_ENABLED= False

logger = logging.getLogger(__name__)


def get_org_repo_info(repo):
    repo_info = {}
    repo_info['repo_name'] = repo.repo_name
    owner_email = seafile_api.get_org_repo_owner(repo.id)
    repo_info['owner_email'] = owner_email
    repo_info['owner_name'] = email2nickname(owner_email)
    repo_info['owner_contact_email'] = email2contact_email(owner_email)
    repo_info['repo_id'] = repo.id

    return repo_info


class AdminOrgRepos(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser, IsProVersion)

    def get(self, request, org_id):
        """ Get all repos in an org.

        Permission checking:
        1. only admin can perform this action.
        """
        org_id = int(org_id)
        if org_id == 0:
            error_msg = 'org_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        org = ccnet_api.get_org_by_id(org_id)
        if not org:
            error_msg = 'Organization %d not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            repos = seafile_api.get_org_repo_list(org_id, -1, -1)
        except Exception as e:
            logger.error(e)
            error_msg = "Internal Server Error"
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        repos_info = []
        for repo in repos:
            repos_info.append(get_org_repo_info(repo))

        return Response({'repo_list': repos_info})
