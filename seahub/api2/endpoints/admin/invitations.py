# Copyright (c) 2012-2016 Seafile Ltd.
from django.contrib import messages
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.invitations.models import Invitation


class InvitationsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle, )
    permission_classes = (IsAdminUser, )

    def delete(self, request):
        _type = request.GET.get('type', '')
        if _type == "" or _type not in ["expired"]:
            error_msg = "type %s invalid" % _type
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        if _type == "expired":
            Invitation.objects.delete_all_expire_invitation()
            return Response(status.HTTP_200_OK)
