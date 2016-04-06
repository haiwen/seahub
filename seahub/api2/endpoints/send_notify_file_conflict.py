import os
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.utils.translation import ugettext as _

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.utils import IS_EMAIL_CONFIGURED, is_valid_username, \
    string2list, gen_shared_link, send_html_email
from seahub.share.models import FileShare
from seahub.settings import REPLACE_FROM_EMAIL, ADD_REPLY_TO_HEADER, SITE_NAME, IS_SEND_EMAIL_FILE_CONFLICT
from django.core.mail import EmailMessage



logger = logging.getLogger(__name__)

class SendNotifyFileConflict(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def post(self, request):

        if not IS_EMAIL_CONFIGURED:
            error_msg = _(u'Sending email notification failed. Email service is not properly configured, please contact administrator.')
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)


        if not IS_SEND_EMAIL_FILE_CONFLICT:
            error_msg = _(u'Sending email notification failed. Flag IS_SEND_EMAIL_FILE_CONFLICT not True, in setting.py Seahub.')
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)


        email = request.user.username

        # check args
        if not email:
            error_msg = 'email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)


        repo_id = request.data.get('repo_id', '')
        repo_name = request.data.get('repo_name', '')
        path = request.data.get('path', '')

        from_email = None  # use default from email

        title = _(u'File conflict notification %s') % SITE_NAME
        template = 'send_email_notify_file_conflict.html'

        to_email = email

        logger.warning('repo_id: %s repo_name: %s, path: %s', repo_id, repo_name, path)

        c = {
            'email': to_email,
            'file_name_conflict': path,
            'repo_name': repo_name,
            'repo_id': repo_id,
            'to_email': to_email
        }

        reply_to = email

        # send email
        try:
            send_html_email(title, template, c, from_email, [to_email], reply_to=reply_to)
        except Exception as e:
            logger.error(e)

        return Response('ok')