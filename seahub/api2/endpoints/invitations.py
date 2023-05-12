# Copyright (c) 2012-2016 Seafile Ltd.

from django.utils.translation import gettext as _
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.permissions import CanInviteGuest
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.base.accounts import User
from seahub.auth.utils import get_virtual_id_by_email
from seahub.utils import is_valid_email
from seahub.invitations.models import Invitation
from seahub.invitations.utils import block_accepter
from seahub.constants import GUEST_USER

json_content_type = 'application/json; charset=utf-8'


class InvitationsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, CanInviteGuest)
    throttle_classes = (UserRateThrottle,)

    def get(self, request, format=None):
        # List invitations sent by user.
        username = request.user.username

        invitations = []
        for e in Invitation.objects.get_by_inviter(username):
            invitations.append(e.to_dict())

        return Response(invitations)

    def post(self, request, format=None):
        # Send invitation.
        itype = request.data.get('type', '').lower()
        if not itype or itype != GUEST_USER:
            return api_error(status.HTTP_400_BAD_REQUEST, 'type invalid.')

        accepter = request.data.get('accepter', '').lower()
        if not accepter:
            return api_error(status.HTTP_400_BAD_REQUEST, 'accepter invalid.')

        if not is_valid_email(accepter):
            return api_error(status.HTTP_400_BAD_REQUEST,
                             _('Email %s invalid.') % accepter)

        if block_accepter(accepter):
            return api_error(status.HTTP_400_BAD_REQUEST,
                             _('The email address is not allowed to be invited as a guest.'))

        if Invitation.objects.filter(inviter=request.user.username,
                                     accepter=accepter).count() > 0:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             _('%s is already invited.') % accepter)

        vid = get_virtual_id_by_email(accepter)
        try:
            user = User.objects.get(vid)
            # user is active return exist
            if user.is_active is True:
                return api_error(status.HTTP_400_BAD_REQUEST,
                                 _('User %s already exists.') % accepter)
        except User.DoesNotExist:
            pass

        i = Invitation.objects.add(inviter=request.user.username,
                                   accepter=accepter)
        send_success = i.send_to(email=accepter)

        if send_success:
            return Response(i.to_dict(), status=201)
        else:
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR,
                             _('Internal Server Error'))


class InvitationsBatchView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, CanInviteGuest)
    throttle_classes = (UserRateThrottle,)

    def post(self, request):

        itype = request.data.get('type', '').lower()
        if not itype or itype != 'guest':
            return api_error(status.HTTP_400_BAD_REQUEST, 'type invalid.')

        accepters = request.data.getlist('accepter', None)
        if not accepters:
            return api_error(status.HTTP_400_BAD_REQUEST, 'accepters invalid.')

        result = {}
        result['failed'] = []
        result['success'] = []

        for accepter in accepters:

            if not accepter.strip():
                continue

            accepter = accepter.lower()

            if not is_valid_email(accepter):
                result['failed'].append({
                    'email': accepter,
                    'error_msg': _('Email %s invalid.') % accepter
                    })
                continue

            if block_accepter(accepter):
                result['failed'].append({
                    'email': accepter,
                    'error_msg': _('The email address is not allowed to be invited as a guest.')
                    })
                continue

            if Invitation.objects.filter(inviter=request.user.username,
                                         accepter=accepter).count() > 0:

                result['failed'].append({
                    'email': accepter,
                    'error_msg': _('%s is already invited.') % accepter
                    })

                continue

            vid = get_virtual_id_by_email(accepter)
            try:
                user = User.objects.get(vid)
                # user is active return exist
                if user.is_active is True:
                    result['failed'].append({
                        'email': accepter,
                        'error_msg': _('User %s already exists.') % accepter
                        })
                    continue
            except User.DoesNotExist:
                pass

            i = Invitation.objects.add(inviter=request.user.username,
                                       accepter=accepter)

            send_success = i.send_to(email=accepter)

            if not send_success:
                result['failed'].append({
                    'email': accepter,
                    'error_msg': _('Failed to send email, email service is not properly configured, please contact administrator.'),
                })
            else:
                result['success'].append(i.to_dict())

        return Response(result)
