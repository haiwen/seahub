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
            per_page = 100
            page = 1

        start = (page - 1) * per_page
        end = page * per_page
        total_count = 0

        # resource check
        if user_name != '':
            # return all notifications of a user given by name
            total_count = UserNotification.objects.get_user_notifications(user_name).count()
            notification_list = UserNotification.objects.get_user_notifications(user_name)[start:end]
        else:
            # return all notifications of all users
            total_count = UserNotification.objects.get_all_notifications().count()
            notification_list = UserNotification.objects.get_all_notifications()[start:end]
        
        # notification does not exist, return an empty list
        if not notification_list:
            result['count'] = 0
            result['notification_list'] = []
            return Response(result)

        result_notification = update_notice_detail(request, notification_list)
        notification_list = []
        for i in result_notification:
            notification_info = {}
            notification_info['id'] = i.id
            notification_info['type'] = i.msg_type
            notification_info['time'] = datetime_to_isoformat_timestr(i.timestamp)
            if i.detail is not None:
                notification_info['detail'] = i.detail
            else:
                notification_info['detail'] = {}
            notification_list.append(notification_info)

        result['count'] = total_count
        result['notification_list'] = notification_list

        return Response(result)
