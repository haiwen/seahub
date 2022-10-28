# Copyright (c) 2012-2018 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api

from seahub.api2.utils import api_error
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.utils.repo import is_repo_owner

from seahub.base.models import UserMonitoredRepos
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email

logger = logging.getLogger(__name__)


class MonitoredRepos(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):
        """ Monitor a repo.

        Permission checking:
        1. Only repo owner can perform this action.
        """

        # argument check
        repo_id = request.data.get('repo_id', None)
        if not repo_id:
            error_msg = 'repo_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        email = request.user.username
        if not is_repo_owner(request, repo_id, email):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # monitor a repo
        monitored_repos = UserMonitoredRepos.objects.filter(email=email, repo_id=repo_id)
        if monitored_repos:
            error_msg = 'Library {} has been monitored.'.format(repo_id)
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            monitored_repo = UserMonitoredRepos.objects.create(email=email,
                                                               repo_id=repo_id)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # get info of new monitored repo
        item_info = {}
        item_info['user_email'] = email
        item_info['user_name'] = email2nickname(email)
        item_info['user_contact_email'] = email2contact_email(email)
        item_info['repo_id'] = monitored_repo.repo_id

        return Response(item_info)


class MonitoredRepo(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def delete(self, request, repo_id):
        """ Unmonitored repo.

        Permission checking:
        1. Only repo owner can perform this action.
        """

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        email = request.user.username
        if not is_repo_owner(request, repo_id, email):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # unmonitor repo
        try:
            UserMonitoredRepos.objects.filter(email=email, repo_id=repo_id).delete()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
