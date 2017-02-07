# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.notifications.models import UserNotification

logger = logging.getLogger(__name__)
json_content_type = 'application/json; charset=utf-8'

class NotificationsView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """ currently only used for get unseen notifications count

        Permission checking:
        1. login user.
        """

        username = request.user.username
        unseen_count = UserNotification.objects.count_unseen_user_notifications(username)
        result = {}
        result['unseen_count'] = unseen_count

        return Response(result)

    def put(self, request):
        """ currently only used for mark all notifications seen

        Permission checking:
        1. login user.
        """

        username = request.user.username
        unseen_notices = UserNotification.objects.get_user_notifications(username,
                                                                         seen=False)
        for notice in unseen_notices:
            notice.seen = True
            notice.save()

        return Response({'success': True})

class NotificationView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def put(self, request):
        """ currently only used for mark a notification seen

        Permission checking:
        1. login user.
        """

        notice_id = request.data.get('notice_id')

        try:
            notice = UserNotification.objects.get(id=notice_id)
        except UserNotification.DoesNotExist as e:
            logger.error(e)
            pass

        if not notice.seen:
            notice.seen = True
            notice.save()

        return Response({'success': True})
