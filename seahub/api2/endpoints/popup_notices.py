# Copyright (c) 2012-2016 Seafile Ltd.
import logging
import json

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.core.cache import cache
from django.utils.html import escape

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.notifications.models import UserNotification

from seahub.notifications.models import get_cache_key_of_unseen_notifications
from seahub.notifications.views import add_notice_from_info
from seahub.notifications.utils import update_notice_detail
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.avatar.templatetags.avatar_tags import api_avatar_url

logger = logging.getLogger(__name__)


class PopupNoticesView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """Get user's notifications.

        If unseen notices > 5, return all unseen notices.
        If unseen notices = 0, return last 5 notices.
        Otherwise return all unseen notices, plus some seen notices to make the
        sum equal to 5.

        Arguments:
        - `request`:

        Permission checking:
        1. login user.

        """

        username = request.user.username

        result_notices = []
        unseen_notices = []
        seen_notices = []

        list_num = 5
        unseen_num = UserNotification.objects.count_unseen_user_notifications(username)
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

        notices_list = []
        for i in result_notices:
            notice = {}
            notice['id'] = i.id
            notice['msg_type'] = i.msg_type
            notice['detail'] = json.loads(i.detail)
            notice['timestamp'] = datetime_to_isoformat_timestr(i.timestamp)
            notice['seen'] = i.seen
            notice['avatar_url'] = request.build_absolute_uri(i.default_avatar_url)
            notice['msg_from'] = ''

            if i.msg_from:
                notice['msg_from'] = email2nickname(i.msg_from)
                url, is_default, date_uploaded = api_avatar_url(i.msg_from, 32)
                notice['avatar_url'] = request.build_absolute_uri(url)

            notices_list.append(notice)

        return Response({'notices_list': notices_list})
