# Copyright (c) 2012-2016 Seafile Ltd.

import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.utils.translation import gettext as _

from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.utils.repo import is_repo_owner

from seahub.settings import ENCRYPTED_LIBRARY_PWD_HASH_ALGO, \
        ENCRYPTED_LIBRARY_PWD_HASH_PARAMS

logger = logging.getLogger(__name__)


class RepoUpgradePwdHashAlgorithm(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, repo_id):

        if not ENCRYPTED_LIBRARY_PWD_HASH_ALGO or not ENCRYPTED_LIBRARY_PWD_HASH_PARAMS:
            error_msg = 'feature is not enabled.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        password = request.data.get('password', None)
        if not password:
            error_msg = 'password invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not repo.encrypted:
            error_msg = 'Library %s is not encrypted.' % repo_id
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        username = request.user.username
        if not is_repo_owner(request, repo_id, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        try:
            seafile_api.upgrade_repo_pwd_hash_algorithm(repo_id, username, password,
                                                        ENCRYPTED_LIBRARY_PWD_HASH_ALGO,
                                                        ENCRYPTED_LIBRARY_PWD_HASH_PARAMS)
        except Exception as e:
            logger.error(e)
            error_msg = _('Internal Server Error')
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
