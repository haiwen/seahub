# Copyright (c) 2012-2016 Seafile Ltd.
import logging
from types import FunctionType

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication

from django.utils.translation import gettext as _

from seaserv import ccnet_api

from seahub.api2.permissions import IsProVersion, IsOrgAdminUser
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error
from seahub.base.accounts import User
from seahub.profile.models import Profile
from seahub.utils import IS_EMAIL_CONFIGURED, send_html_email
from seahub.base.templatetags.seahub_tags import email2nickname

from seahub.settings import INIT_PASSWD, SEND_EMAIL_ON_RESETTING_USER_PASSWD

from seahub.organizations.views import org_user_exists

logger = logging.getLogger(__name__)


class OrgAdminUserSetPassword(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsProVersion, IsOrgAdminUser)

    def put(self, request, org_id, email):
        """ Reset an organization user's password.
        """
        # resource check
        org_id = int(org_id)
        if not ccnet_api.get_org_by_id(org_id):
            error_msg = f'Organization {org_id} not found.' % org_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            error_msg = f'User {email} not found.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        user_nickname = email2nickname(email)
        if not org_user_exists(org_id, email):
            err_msg = f'User {user_nickname} does not exist in the organization.'
            return api_error(status.HTTP_404_NOT_FOUND, err_msg)

        profile = Profile.objects.get_profile_by_user(email)
        if IS_EMAIL_CONFIGURED and SEND_EMAIL_ON_RESETTING_USER_PASSWD and \
                profile and profile.contact_email:

            from seahub.utils import get_site_name
            from django.utils.http import int_to_base36
            from seahub.auth.tokens import default_token_generator

            site_name = get_site_name()
            contact_email = profile.contact_email
            email_template_name = 'sysadmin/short_time_linving_password_reset_link.html'
            c = {
                'email': contact_email,
                'uid': int_to_base36(user.id),
                'user': user,
                'token': default_token_generator.make_token(user),
            }

            send_html_email(_("Reset Password on %s") % site_name,
                            email_template_name, c, None,
                            [contact_email])

            reset_tip = _(f'A password reset link has been sent to {contact_email}.')
        else:
            if isinstance(INIT_PASSWD, FunctionType):
                new_password = INIT_PASSWD()
            else:
                new_password = INIT_PASSWD

            user.set_password(new_password)
            user.save()

            reset_tip = _('Successfully reset password to %(passwd)s for user %(user)s.') \
                % {'passwd': new_password, 'user': user_nickname}

        return Response({'reset_tip': reset_tip})
