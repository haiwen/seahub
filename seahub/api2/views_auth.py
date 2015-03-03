from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from seaserv import seafile_api
from seahub import settings
from seahub.api2.utils import json_response, api_error
from seahub.api2.authentication import TokenAuthentication
from seahub.api2.models import Token, TokenV2

class LogoutDeviceView(APIView):
    """Removes the api token of a device that has already logged in. If the device
    is a desktop client, also remove all sync tokens of repos synced on that
    client .
    """
    authentication_classes = (TokenAuthentication,)
    permission_classes = (IsAuthenticated,)
    throttle_classes = (UserRateThrottle,)
    @json_response
    def post(self, request, format=None):
        auth_token = request.auth
        if isinstance(auth_token, TokenV2) and auth_token.is_desktop_client():
            seafile_api.delete_repo_tokens_by_peer_id(request.user.username, auth_token.device_id)
        auth_token.delete()
        return {}
