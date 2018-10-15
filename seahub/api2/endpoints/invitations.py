# Copyright (c) 2012-2016 Seafile Ltd.

from django.utils.translation import ugettext as _
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from post_office.models import STATUS

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.permissions import CanInviteGuest
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.base.accounts import User
from seahub.utils import is_valid_email
from seahub.invitations.models import Invitation
from seahub.invitations.utils import block_accepter

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
        if not itype or itype != 'guest':
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

        try:
            User.objects.get(accepter)
            user_exists = True
        except User.DoesNotExist:
            user_exists = False

        if user_exists:
            return api_error(status.HTTP_400_BAD_REQUEST,
                             _('User %s already exists.') % accepter)

        i = Invitation.objects.add(inviter=request.user.username,
                                   accepter=accepter)
        m = i.send_to(email=accepter)
        if m.status == STATUS.sent:
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

            try:
                User.objects.get(accepter)
                result['failed'].append({
                    'email': accepter,
                    'error_msg': _('User %s already exists.') % accepter
                    })
                continue
            except User.DoesNotExist:
                i = Invitation.objects.add(inviter=request.user.username,
                        accepter=accepter)
                m = i.send_to(email=accepter)
                if m.status == STATUS.sent:
                    result['success'].append(i.to_dict())
                else:
                    result['failed'].append({
                        'email': accepter,
                        'error_msg': _('Internal Server Error'),
                    })

        return Response(result)
