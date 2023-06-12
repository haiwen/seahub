# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.utils.translation import gettext as _

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.utils import IS_EMAIL_CONFIGURED, \
    is_valid_email, string2list, gen_shared_upload_link, send_html_email, \
    get_site_name
from seahub.share.models import UploadLinkShare
from seahub.settings import REPLACE_FROM_EMAIL, ADD_REPLY_TO_HEADER
from seahub.profile.models import Profile

logger = logging.getLogger(__name__)


class SendUploadLinkView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    def post(self, request):

        if not IS_EMAIL_CONFIGURED:
            error_msg = _('Failed to send email, email service is not properly configured, please contact administrator.')
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        # check args
        email = request.POST.get('email', None)
        if not email:
            error_msg = 'email invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        token = request.POST.get('token', None)
        if not token:
            error_msg = 'token invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        extra_msg = request.POST.get('extra_msg', '')

        # check if token exists
        try:
            link = UploadLinkShare.objects.get(token=token)
        except UploadLinkShare.DoesNotExist:
            error_msg = 'token %s not found.' % token
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # check if is upload link owner
        username = request.user.username
        if not link.is_owner(username):
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        result = {}
        result['failed'] = []
        result['success'] = []
        to_email_list = string2list(email)
        # use contact_email, if present
        useremail = Profile.objects.get_contact_email_by_user(request.user.username)
        for to_email in to_email_list:

            failed_info = {}

            if not is_valid_email(to_email):
                failed_info['email'] = to_email
                failed_info['error_msg'] = _('email invalid.')
                result['failed'].append(failed_info)
                continue

            # prepare basic info
            c = {
                'email': username,
                'to_email': to_email,
                'extra_msg': extra_msg,
                'password': link.get_password(),
            }

            if REPLACE_FROM_EMAIL:
                from_email = useremail
            else:
                from_email = None  # use default from email

            if ADD_REPLY_TO_HEADER:
                reply_to = useremail
            else:
                reply_to = None

            c['shared_upload_link'] = gen_shared_upload_link(token)
            title = _('An upload link is shared to you on %s') % get_site_name()
            template = 'shared_upload_link_email.html'

            # send email
            try:
                send_html_email(title, template, c, from_email, [to_email], reply_to=reply_to)
                result['success'].append(to_email)
            except Exception as e:
                logger.error(e)
                failed_info['email'] = to_email
                failed_info['error_msg'] = _('Internal Server Error')
                result['failed'].append(failed_info)

        return Response(result)
