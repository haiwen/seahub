# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.utils.translation import ugettext as _
from django.utils.crypto import get_random_string

from seaserv import seafile_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.api2.views import HTTP_520_OPERATION_FAILED

from seahub.utils import IS_EMAIL_CONFIGURED, send_html_email
from seahub.utils.repo import is_repo_owner
from seahub.base.models import RepoSecretKey
from seahub.base.templatetags.seahub_tags import email2contact_email

from seahub.settings import ENABLE_RESET_ENCRYPTED_REPO_PASSWORD

logger = logging.getLogger(__name__)

class RepoSendNewPassword(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def post(self, request, repo_id):
        """ Only used for reset encrypted repo's password, and then send new
        password to user's mainbox.

        Permission checking:
        1. repo owner.
        """

        if not ENABLE_RESET_ENCRYPTED_REPO_PASSWORD or \
                not IS_EMAIL_CONFIGURED:
            error_msg = _(u'Feature disabled.')
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

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

        secret_key =  RepoSecretKey.objects.get_secret_key(repo_id)
        if not secret_key:
            error_msg = _(u"Can not reset this library's password.")
            return api_error(HTTP_520_OPERATION_FAILED, error_msg)

        new_password = get_random_string(10)
        try:
            seafile_api.reset_repo_passwd(repo_id, username, secret_key, new_password)
            content = {'repo_name': repo.name, 'password': new_password,}
            send_html_email(_(u'New password of library %s') % repo.name,
                    'snippets/reset_repo_password.html', content,
                    None, [email2contact_email(username)])
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
