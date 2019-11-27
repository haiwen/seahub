# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils.translation import ugettext as _

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.permissions import CanInviteGuest
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.invitations.models import Invitation
from seahub.base.accounts import User
from post_office.models import STATUS
from seahub.utils.mail import send_html_email_with_dj_template, MAIL_PRIORITY
from seahub.utils import get_site_name

logger = logging.getLogger(__name__)
json_content_type = 'application/json; charset=utf-8'

def invitation_owner_check(func):
    """Check whether user is the invitation inviter.
    """
    def _decorated(view, request, token, *args, **kwargs):
        i = get_object_or_404(Invitation, token=token)
        if i.inviter != request.user.username:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        return func(view, request, i, *args, **kwargs)

    return _decorated

class InvitationView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, CanInviteGuest)
    throttle_classes = (UserRateThrottle, )

    @invitation_owner_check
    def get(self, request, invitation, format=None):
        # Get a certain invitation.
        return Response(invitation.to_dict())

    # @invitation_owner_check
    # def put(self, request, invitation, format=None):
    #     # Update an invitation.
    #     # TODO
    #     return Response({
    #     }, status=200)

    @invitation_owner_check
    def delete(self, request, invitation, format=None):
        # Delete an invitation.
        invitation.delete()

        return Response({
        }, status=204)


class InvitationRevokeView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, CanInviteGuest)
    throttle_classes = (UserRateThrottle, )

    def post(self, request, token, format=None):
        """Revoke invitation when the accepter successfully creates an account.
        And set the account to inactive.
        """
        # recourse check
        invitation = Invitation.objects.get_by_token(token)
        if not invitation:
            error_msg = "Invitation not found."
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        if request.user.username != invitation.inviter:
            error_msg = "Permission denied."
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if invitation.accept_time is None:
            error_msg = "The email address didn't accept the invitation."
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        email = invitation.accepter
        inviter = invitation.inviter

        try:
            user = User.objects.get(email)
        except User.DoesNotExist:
            error_msg = 'User %s not found.' % email
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # set the account to inactive.
        user.freeze_user()

        # delete the invitation.
        invitation.delete()

        # send email
        site_name = get_site_name()
        subject = _('%(user)s revoked your access to %(site_name)s.') % {
            'user': inviter, 'site_name': site_name}
        context = {
            'inviter': inviter,
            'site_name': site_name,
        }

        m = send_html_email_with_dj_template(
            email, dj_template='invitations/invitation_revoke_email.html',
            subject=subject,
            context=context,
            priority=MAIL_PRIORITY.now
        )
        if m.status != STATUS.sent:
            logger.warning('send revoke access email to %s failed')

        return Response({'success': True})
