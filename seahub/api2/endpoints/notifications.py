# Copyright (c) 2012-2016 Seafile Ltd.
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.notifications.models import UserNotification

json_content_type = 'application/json; charset=utf-8'

class NotificationsView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):

        username = request.user.username
        unseen_count = UserNotification.objects.count_unseen_user_notifications(username)
        result = {}
        result['unseen_count'] = unseen_count

        return Response(result)
