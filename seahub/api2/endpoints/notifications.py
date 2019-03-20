# Copyright (c) 2012-2016 Seafile Ltd.
import logging
import json

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.core.cache import cache

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.notifications.models import UserNotification

from seahub.notifications.models import get_cache_key_of_unseen_notifications
from seahub.notifications.views import add_notice_from_info
from seahub.notifications.utils import update_notice_detail
from seahub.api2.utils import api_error, to_python_boolean
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
        unseen_count = 0
        for i in result_notices:
            if i.detail is not None:
                notice = {}
                notice['id'] = i.id
                notice['type'] = i.msg_type
                notice['detail'] = json.loads(i.detail)
                notice['time'] = datetime_to_isoformat_timestr(i.timestamp)
                notice['seen'] = i.seen

                if not i.seen:
                    unseen_count += 1

                notification_list.append(notice)

        cache_key = get_cache_key_of_unseen_notifications(username)
        count_from_cache = cache.get(cache_key, None)

        # for case of count value is `0`
        if count_from_cache is not None:
            result['unseen_count'] = count_from_cache
            unseen_num = count_from_cache
        else:
            result['unseen_count'] = unseen_count
            # set cache
            cache.set(cache_key, unseen_count)
            unseen_num = unseen_count

        notice_more = True if len(notice_list) == per_page else False
        result['notification_list'] = notification_list
        result['notification_more'] = notice_more
        result['unseen_count'] = unseen_num

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
