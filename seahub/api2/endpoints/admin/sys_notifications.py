import logging

from django.core.cache import cache

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

from seahub.notifications.models import Notification
from seahub.notifications.settings import NOTIFICATION_CACHE_TIMEOUT

logger = logging.getLogger(__name__)


def get_notification_info(notification):
    info = {}
    info['id'] = notification.id
    info['msg'] = notification.message
    info['is_current'] = notification.primary
    return info


class AdminSysNotificationsView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser, )

    def get(self, request):
        """
        list all system notifications

        Permission checking:
        1.login and is admin user.
        """

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            notifications = Notification.objects.all().order_by('-id')
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        results = []
        for notification in notifications:
            results.append(get_notification_info(notification))

        return Response({'notifications': results})

    def post(self, request):
        """
        create a system notification

        Permission checking:
        1.login and is admin user.
        """

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        msg = request.data.get('msg', '')
        if not msg:
            error_msg = 'msg invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            notification = Notification.objects.create_sys_notification(msg)
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        notification_info = get_notification_info(notification)

        return Response({'notification': notification_info})


class AdminSysNotificationView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser, )

    def put(self, request, nid):
        """
        update a system notification primary status

        Permission checking:
        1.login and is admin user.
        """

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            nid = int(nid)
        except ValueError:
            error_msg = 'nid invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if nid <= 0:
            error_msg = 'nid invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        notification_list = Notification.objects.filter(id=nid)
        if not notification_list:
            error_msg = 'notification %s not found.' % nid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        try:
            Notification.objects.filter(primary=1).update(primary=0)
            for notification in notification_list:
                notification.update_notification_to_current()
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        cache.set('CUR_TOPINFO', notification_list,
                  NOTIFICATION_CACHE_TIMEOUT)

        notification_info = get_notification_info(notification_list[0])

        return Response({'notification': notification_info})

    def delete(self, request, nid):
        """
        delete a system notification

        Permission checking:
        1.login and is admin user.
        """

        if not request.user.admin_permissions.other_permission():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        try:
            nid = int(nid)
        except ValueError:
            error_msg = 'nid invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        if nid <= 0:
            error_msg = 'nid invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        notification_list = Notification.objects.filter(id=nid)
        if not notification_list:
            error_msg = 'notification %s not found.' % nid
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        cache.delete('CUR_TOPINFO')

        for notification in notification_list:
            try:
                notification.delete()
            except Exception as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        return Response({'success': True})

