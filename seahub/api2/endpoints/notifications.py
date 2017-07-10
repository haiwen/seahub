# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.core.cache import cache

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.notifications.models import UserNotification

from seahub.notifications.models import get_cache_key_of_unseen_notifications

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

        result = {}

        username = request.user.username
        cache_key = get_cache_key_of_unseen_notifications(username)

        count_from_cache = cache.get(cache_key, None)

        # for case of count value is `0`
        if count_from_cache is not None:
            result['unseen_count'] = count_from_cache
        else:
            count_from_db = UserNotification.objects.count_unseen_user_notifications(username)
            result['unseen_count'] = count_from_db

            # set cache
            cache.set(cache_key, count_from_db)

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

        cache_key = get_cache_key_of_unseen_notifications(username)
        cache.delete(cache_key)

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

        username = request.user.username
        cache_key = get_cache_key_of_unseen_notifications(username)
        cache.delete(cache_key)

        return Response({'success': True})
