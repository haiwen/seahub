from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from seaserv import ccnet_api

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.group.models import GroupMessage
from .utils import api_check_group

json_content_type = 'application/json; charset=utf-8'

class GroupDiscussion(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle, )

    @api_check_group
    def delete(self, request, group_id, discuss_id, format=None):
        """Remove a group discussion.
        Only discussion creator or group admin can perform this op.
        """
        username = request.user.username
        group_id = int(group_id)

        try:
            discussion = GroupMessage.objects.get(pk=discuss_id)
        except GroupMessage.DoesNotExist:
            return api_error(status.HTTP_400_BAD_REQUEST, 'Bad discussion id')

        # perm check
        if not ccnet_api.check_group_staff(group_id, username) and \
           discussion.from_email != username:
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission error.')

        discussion.delete()

        return Response(status=204)
