# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.utils.translation import ugettext as _

from seaserv import seafile_api
from pysearpc import SearpcError

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.utils.repo import is_repo_owner, add_encrypted_repo_secret_key_to_database
from seahub.base.models import RepoSecretKey
from seahub.views import check_folder_permission

from seahub.settings import ENABLE_RESET_ENCRYPTED_REPO_PASSWORD

logger = logging.getLogger(__name__)

class RepoSetPassword(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication )
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, repo_id):
        """ Check if repo password is correct.

        Permission checking:
        1. User can access current repo.
        """

        # argument check
        password = request.data.get('password', None)
        if not password:
            error_msg = 'password invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not repo.encrypted:
            error_msg = 'Library %s is not encrypted.' % repo_id
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # permission check
        if not check_folder_permission(request, repo_id, '/'):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # check the password is correct
        try:
            seafile_api.set_passwd(repo_id, request.user.username, password)
        except SearpcError as e:
            if e.msg == 'Bad arguments':
                error_msg = 'Bad arguments'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            elif e.msg == 'Incorrect password':
                error_msg = _(u'Wrong password')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
            elif e.msg == 'Internal server error':
                error_msg = _(u'Internal server error')
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
            else:
                error_msg = _(u'Decrypt library error')
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if ENABLE_RESET_ENCRYPTED_REPO_PASSWORD:
            add_encrypted_repo_secret_key_to_database(repo_id, password)

        return Response({'success': True})

    def put(self, request, repo_id):
        """ Change/Init repo password.

        Permission checking:
        1. repo owner
        """

        # argument check
        operation = request.data.get('operation', 'change-password')
        operation = operation.lower()
        if operation not in ('change-password', 'reset-password', 'can-reset-password'):
            error_msg = 'operation invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        repo = seafile_api.get_repo(repo_id)
        if not repo:
            error_msg = 'Library %s not found.' % repo_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        if not repo.encrypted:
            error_msg = 'Library %s is not encrypted.' % repo_id
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # permission check
        username = request.user.username
        if not is_repo_owner(request, repo_id, username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if operation == 'change-password':

            old_password = request.data.get('old_password', None)
            if not old_password:
                error_msg = 'old_password invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            new_password = request.data.get('new_password', None)
            if not new_password:
                error_msg = 'new_password invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            try:
                seafile_api.change_repo_passwd(repo_id, old_password, new_password, username)
            except Exception as e:
                if e.msg == 'Incorrect password':
                    error_msg = _(u'Wrong old password')
                    return api_error(status.HTTP_403_FORBIDDEN, error_msg)
                else:
                    logger.error(e)
                    error_msg = 'Internal Server Error'
                    return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

            if ENABLE_RESET_ENCRYPTED_REPO_PASSWORD:
                add_encrypted_repo_secret_key_to_database(repo_id, new_password)

        if operation == 'can-reset-password':
            if not ENABLE_RESET_ENCRYPTED_REPO_PASSWORD:
                error_msg = 'Feature disabled.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            if not RepoSecretKey.objects.get_secret_key(repo_id):
                return Response({'allowed': False})
            else:
                return Response({'allowed': True})

        if operation == 'reset-password':

            if not ENABLE_RESET_ENCRYPTED_REPO_PASSWORD:
                error_msg = 'Feature disabled.'
                return api_error(status.HTTP_403_FORBIDDEN, error_msg)

            new_password = request.data.get('new_password', None)
            if not new_password:
                error_msg = 'new_password invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            secret_key =  RepoSecretKey.objects.get_secret_key(repo_id)
            if not secret_key:
                error_msg = _(u"Can not reset this library's password.")
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            try:
                seafile_api.reset_repo_passwd(repo_id, username, secret_key, new_password)
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
