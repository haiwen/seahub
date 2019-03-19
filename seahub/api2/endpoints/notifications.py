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
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.avatar.templatetags.avatar_tags import api_avatar_url

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

        cache_key = get_cache_key_of_unseen_notifications(username)
        count_from_cache = cache.get(cache_key, None)

        try:
            list_num = int(request.GET.get('list_num', ''))
        except ValueError:
            list_num = 25

        result_notices = []
        unseen_notices = []
        seen_notices = []

        # for case of count value is `0`
        if count_from_cache is not None:
            result['unseen_count'] = count_from_cache
            unseen_num = count_from_cache
        else:
            count_from_db = UserNotification.objects.count_unseen_user_notifications(username)
            result['unseen_count'] = count_from_db
            # set cache
            cache.set(cache_key, count_from_db)
            unseen_num = count_from_db

        if unseen_num == 0:
            seen_notices = UserNotification.objects.get_user_notifications(
                username)[:list_num]
        elif unseen_num > list_num:
            unseen_notices = UserNotification.objects.get_user_notifications(
                username, seen=False)
        else:
            unseen_notices = UserNotification.objects.get_user_notifications(
                username, seen=False)
            seen_notices = UserNotification.objects.get_user_notifications(
                username, seen=True)[:list_num - unseen_num]

        result_notices += unseen_notices
        result_notices += seen_notices

        # Add 'msg_from' or 'default_avatar_url' to notice.
        result_notices = add_notice_from_info(result_notices)

        result_notices = update_notice_detail(request, result_notices)

        notification_list = []
        for i in result_notices:
            notice = {}
            notice['id'] = i.id
            notice['notification_type'] = i.msg_type
            notice['detail'] = json.loads(i.detail)
            notice['time'] = datetime_to_isoformat_timestr(i.timestamp)
            notice['seen'] = i.seen
            notice['avatar_url'] = request.build_absolute_uri(i.default_avatar_url)
            notice['notification_from'] = ''

            if i.msg_from:
                notice['notification_from'] = email2nickname(i.msg_from)
                url, is_default, date_uploaded = api_avatar_url(i.msg_from, 32)
                notice['avatar_url'] = request.build_absolute_uri(url)

            notification_list.append(notice)
        result['notification_list'] = notification_list

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
