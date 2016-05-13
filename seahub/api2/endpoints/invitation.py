from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.permissions import CanInviteGuest
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.invitations.models import Invitation

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
