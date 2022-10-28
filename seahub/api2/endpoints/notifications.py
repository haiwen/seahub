# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from django.core.cache import cache

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.notifications.models import UserNotification

from seahub.notifications.models import get_cache_key_of_unseen_notifications
from seahub.notifications.utils import update_notice_detail
from seahub.api2.utils import api_error
from seahub.utils.timeutils import datetime_to_isoformat_timestr

logger = logging.getLogger(__name__)
json_content_type = 'application/json; charset=utf-8'


class NotificationsView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """ used for get notifications

        Permission checking:
        1. login user.
        """
        result = {}

        username = request.user.username

        try:
            per_page = int(request.GET.get('per_page', ''))
            page = int(request.GET.get('page', ''))
        except ValueError:
            per_page = 25
            page = 1

        start = (page - 1) * per_page
        end = page * per_page

        notice_list = UserNotification.objects.get_user_notifications(username)[start:end]

        result_notices = update_notice_detail(request, notice_list)
        notification_list = []
        for i in result_notices:
            if i.detail is not None:
                notice = {}
                notice['id'] = i.id
                notice['type'] = i.msg_type
                notice['detail'] = i.detail
                notice['time'] = datetime_to_isoformat_timestr(i.timestamp)
                notice['seen'] = i.seen

                notification_list.append(notice)

        cache_key = get_cache_key_of_unseen_notifications(username)
        unseen_count_from_cache = cache.get(cache_key, None)

        # for case of count value is `0`
        if unseen_count_from_cache is not None:
            result['unseen_count'] = unseen_count_from_cache
        else:
            unseen_count = UserNotification.objects.filter(to_user=username, seen=False).count()
            result['unseen_count'] = unseen_count
            cache.set(cache_key, unseen_count)

        total_count = UserNotification.objects.filter(to_user=username).count()

        result['notification_list'] = notification_list
        result['count'] = total_count

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

    def delete(self, request):
        """ delete a notification by username

        Permission checking:
        1. login user.
        """
        username = request.user.username

        UserNotification.objects.remove_user_notifications(username)

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

        # argument check
        try:
            int(notice_id)
        except Exception as e:
            error_msg = 'notice_id invalid.'
            logger.error(e)
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        # resource check
        try:
            notice = UserNotification.objects.get(id=notice_id)
        except UserNotification.DoesNotExist as e:
            logger.error(e)
            error_msg = 'Notification %s not found.' % notice_id
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        # permission check
        username = request.user.username
        if notice.to_user != username:
            error_msg = 'Permission denied.'
            return api_error(status.HTTP_403_FORBIDDEN, error_msg)

        if not notice.seen:
            notice.seen = True
            notice.save()

        cache_key = get_cache_key_of_unseen_notifications(username)
        cache.delete(cache_key)

        return Response({'success': True})
