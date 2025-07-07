import logging
import json

from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.endpoints.utils import event_export_status, event_import_status
from seahub.api2.permissions import IsProVersion
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

logger = logging.getLogger(__name__)


class SeahubIOStatus(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsProVersion,)
    throttle_classes = (UserRateThrottle,)

    def get(self, request):
        """
        Get task status by task id
        """
        task_id = request.GET.get('task_id', '')
        task_type = request.GET.get('task_type')
        if not task_id:
            error_msg = 'task_id invalid.'
            return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
        if task_type and task_type == 'import':
            resp = event_import_status(task_id)
        else:
            resp = event_export_status(task_id)
        if resp.status_code == 500:
            logger.error('query export or import status error: %s, %s' % (task_id, resp.content))
            return api_error(500, 'Internal Server Error')
        if not resp.status_code == 200:
            return api_error(resp.status_code, resp.content)

        is_finished = json.loads(resp.content)['is_finished']

        return Response({'is_finished': is_finished})