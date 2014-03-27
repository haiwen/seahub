import datetime
import logging
from rest_framework.authentication import BaseAuthentication

from seahub.base.accounts import User
from seahub.api2.models import Token, TokenV2
from seahub.api2.utils import get_client_ip

logger = logging.getLogger(__name__)

def within_ten_min(d1, d2):
    '''Return true if two datetime.datetime object differs less than ten minutes'''
    delta = d2 - d1 if d2 > d1 else d1 - d2
    interval = 60 * 10
    # delta.total_seconds() is only available in python 2.7+
    seconds = (delta.microseconds + (delta.seconds + delta.days*24*3600) * 1e6) / 1e6
    return seconds < interval

HEADER_CLIENT_VERSION = 'HTTP_SEAFILE_CLEINT_VERSION'
HEADER_PLATFORM_VERSION = 'HTTP_SEAFILE_PLATFORM_VERSION'

class TokenAuthentication(BaseAuthentication):
    """
    Simple token based authentication.

    Clients should authenticate by passing the token key in the "Authorization"
    HTTP header, prepended with the string "Token ".  For example:

        Authorization: Token 401f7ac837da42b97f613d789819ff93537bee6a

    A custom token model may be used, but must have the following properties.

    * key -- The string identifying the token
    * user -- The user to which the token belongs
    """

    def authenticate(self, request):
        auth = request.META.get('HTTP_AUTHORIZATION', '').split()
        key = None
        if len(auth) == 2 and auth[0].lower() == "token":
            key = auth[1]

        if not key:
            return None

        ret = self.authenticate_v2(request, key)
        if ret:
            return ret

        return self.authenticate_v1(request, key)

    def authenticate_v1(self, request, key):
        try:
            token = Token.objects.get(key=key)
        except Token.DoesNotExist:
            return None

        try:
            user = User.objects.get(email=token.user)
        except User.DoesNotExist:
            return None

        if user.is_active:
            return (user, token)

    def authenticate_v2(self, request, key):
        try:
            token = TokenV2.objects.get(key=key)
        except TokenV2.DoesNotExist:
            return None

        try:
            user = User.objects.get(email=token.user)
        except User.DoesNotExist:
            return None

        if user.is_active:
            need_save = False

            # We update the device's last_login_ip, client_version, platform_version if changed
            ip = get_client_ip(request)
            if ip and ip != token.last_login_ip:
                token.last_login_ip = ip
                need_save = True

            client_version = request.META.get(HEADER_CLIENT_VERSION, '')
            if client_version and client_version != token.client_version:
                token.client_version = client_version
                need_save = True

            platform_version = request.META.get(HEADER_PLATFORM_VERSION, '')
            if platform_version and platform_version != token.platform_version:
                token.platform_version = platform_version
                need_save = True

            if not within_ten_min(token.last_accessed, datetime.datetime.now()):
                # We only need 10min precision for the last_accessed field
                need_save = True

            if need_save:
                try:
                    token.save()
                except:
                    logger.exception('error when save token v2:')
            return (user, token)