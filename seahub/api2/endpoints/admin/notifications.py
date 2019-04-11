import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from django.core.cache import cache

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.notifications.models import UserNotification

from seahub.notifications.models import get_cache_key_of_unseen_notifications
from seahub.notifications.utils import update_notice_detail
from seahub.utils.timeutils import datetime_to_isoformat_timestr
from seahub.api2.utils import api_error

logger = logging.getLogger(__name__)

class AdminNotificationsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAuthenticated, IsAdminUser)

    def get(self, request):
        """
        list all notifications / filt by user name 

        Permission checking:
        1.login and is admin user.
        """

        user_name = request.GET.get('username', '')

        # argument check

        # permission check
        # permission_classes will return 403, if not admin user

        # prepare default values
        result = {}
        try:
            per_page = int(request.GET.get('per_page', ''))
            page = int(request.GET.get('page', ''))
        except ValueError:
            per_page = 25
            page = 1

        start = (page - 1) * per_page
        end = page * per_page

        # resource check
        if user_name != '':
            # return all notifications of a user given by name
            notice_list = UserNotification.objects.get_user_notifications(user_name)[start:end]
        else:
            # return all notifications of all users
            notice_list = UserNotification.objects.get_all_notifications()[start:end]
        if not notice_list:
            error_msg = 'Notification not found'
            print(error_msg)
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        result_notices = update_notice_detail(request, notice_list)
        total_count = 0
        notification_list = []
        unseen_count = 0
        for i in result_notices:
            if i.detail is not None:
                total_count += 1
                notice = {}
                notice['id'] = i.id
                notice['type'] = i.msg_type
                notice['detail'] = i.detail
                notice['time'] = datetime_to_isoformat_timestr(i.timestamp)
                notice['seen'] = i.seen

                if not i.seen:
                    unseen_count += 1

                notification_list.append(notice)

        cache_key = get_cache_key_of_unseen_notifications(user_name)
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

        result['count'] = total_count
        result['unseen_count'] = unseen_num
        result['notification_list'] = notification_list

        return Response(result)
