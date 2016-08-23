# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.utils.translation import ugettext as _

from seahub.api2.throttling import UserRateThrottle
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.utils import api_error

from seaserv import seafile_api

logger = logging.getLogger(__name__)

class CopyMoveTaskView(APIView):

    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)

    def delete(self, request):
        """ Cancel file/dir mv/cp.

        Permission checking:
        1. user login;
        """

        # argument check
        task_id = request.data.get('task_id')
        if not task_id:
            error_msg = 'task_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

        try:
            res = seafile_api.cancel_copy_task(task_id) # returns 0 or -1
        except Exception as e:
            logger.error(e)
            error_msg = 'Internal Server Error'
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        if res == 0:
            return Response({'success': True})
        else:
            error_msg = _('Cancel failed')
            return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)
