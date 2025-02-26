# Copyright (c) 2012-2018 Seafile Ltd.
import logging

from django.core.cache import cache

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seaserv import seafile_api

from seahub.api2.utils import api_error
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.utils import is_pro_version

from seahub.base.models import UserMonitoredRepos
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email
from seahub.api2.endpoints.utils import delete_user_monitored_cache

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

        if not is_pro_version():
            error_msg = 'Feature disabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

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
        permission = seafile_api.check_permission_by_path(repo_id, '/', email)
        if permission not in ('r', 'rw'):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # monitor a repo
        monitored_repos = UserMonitoredRepos.objects.filter(email=email, repo_id=repo_id)
        if not monitored_repos:
            try:
                UserMonitoredRepos.objects.create(email=email, repo_id=repo_id)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        # get info of new monitored repo
        item_info = {}
        item_info['user_email'] = email
        item_info['user_name'] = email2nickname(email)
        item_info['user_contact_email'] = email2contact_email(email)
        item_info['repo_id'] = repo_id

        params = {'repo_id': repo_id}
        delete_user_monitored_cache(params)

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

        if not is_pro_version():
            error_msg = 'Feature disabled.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        email = request.user.username
        permission = seafile_api.check_permission_by_path(repo_id, '/', email)
        if permission not in ('r', 'rw'):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # unmonitor repo
        try:
            UserMonitoredRepos.objects.filter(email=email, repo_id=repo_id).delete()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        params = {'repo_id': repo_id}
        delete_user_monitored_cache(params)

        return Response({'success': True})
