# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.invitations.models import Invitation
from seahub.settings import ENABLE_GUEST_INVITATION
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.base.templatetags.seahub_tags import email2nickname, email2contact_email

logger = logging.getLogger(__name__)


class AdminInvitations(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle, )
    permission_classes = (IsAdminUser, )

    def get(self, request):
        """ List invitations

        Permission checking:
        1. only admin can perform this action.
        """
        if not ENABLE_GUEST_INVITATION:
            error_msg = 'invitation not enabled.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            current_page = int(request.GET.get('page', '1'))
            per_page = int(request.GET.get('per_page', '100'))
        except ValueError:
            current_page = 1
            per_page = 100

        start = per_page * (current_page - 1)

        invitations = Invitation.objects.all().order_by('-invite_time')[start:start + per_page]
        count = Invitation.objects.count()

        # Use dict to reduce memcache fetch cost in large for-loop.
        inviter_email_set = set()
        accepter_email_set = set()
        for invitation in invitations:
            inviter_email_set.add(invitation.inviter)
            accepter_email_set.add(invitation.accepter)

        inviter_nickname_dict = {}
        inviter_contact_email_dict = {}
        accepter_nickname_dict = {}
        accepter_contact_email_dict = {}

        for e in inviter_email_set:
            if e not in inviter_nickname_dict:
                inviter_nickname_dict[e] = email2nickname(e)
            if e not in inviter_contact_email_dict:
                inviter_contact_email_dict[e] = email2contact_email(e)
        for e in accepter_email_set:
            if e not in accepter_nickname_dict:
                accepter_nickname_dict[e] = email2nickname(e)
            if e not in accepter_contact_email_dict:
                accepter_contact_email_dict[e] = email2contact_email(e)

        invitations_info = []
        for invitation in invitations:
            data = {}
            data['id'] = invitation.id
            data['token'] = invitation.token

            inviter_email = invitation.inviter
            data['inviter_email'] = inviter_email
            data['inviter_name'] = inviter_nickname_dict.get(inviter_email, '')
            data['inviter_contact_email'] = inviter_contact_email_dict.get(inviter_email, '')

            accepter_email = invitation.accepter
            data['accepter_email'] = accepter_email
            data['accepter_name'] = accepter_nickname_dict.get(accepter_email, '')
            data['accepter_contact_email'] = accepter_contact_email_dict.get(accepter_email, '')

            data['invite_type'] = invitation.invite_type
            data['invite_time'] = datetime_to_isoformat_timestr(invitation.invite_time)
            data['accept_time'] = datetime_to_isoformat_timestr(invitation.accept_time)
            data['expire_time'] = datetime_to_isoformat_timestr(invitation.expire_time)
            data['is_expired'] = invitation.is_expired()

            invitations_info.append(data)

        resp = {
            'invitation_list': invitations_info,
            'total_count': count
        }
        return Response(resp)

    def delete(self, request):
        _type = request.GET.get('type', '')
        if _type == "" or _type not in ["expired"]:
            error_msg = "type %s invalid" % _type
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        if _type == "expired":
            Invitation.objects.delete_all_expire_invitation()
            return Response(status.HTTP_200_OK)


class AdminInvitation(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle, )
    permission_classes = (IsAdminUser, )

    def delete(self, request, token):
        """ delete a invitation

        Permission checking:
        1. only admin can perform this action.
        """

        if not ENABLE_GUEST_INVITATION:
            error_msg = 'invitation not enabled.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            invitation = Invitation.objects.get(token=token)
        except Invitation.DoesNotExist:
            return Response({'success': True})

        try:
            invitation.delete()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})
