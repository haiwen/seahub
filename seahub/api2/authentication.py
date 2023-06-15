# Copyright (c) 2012-2016 Seafile Ltd.
import datetime
import logging
from rest_framework import status
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import APIException

from seaserv import ccnet_api

from seahub.auth.models import AnonymousUser
from seahub.base.accounts import User
from seahub.api2.models import Token, TokenV2
from seahub.api2.utils import get_client_ip
from seahub.repo_api_tokens.models import RepoAPITokens
from seahub.ocm.models import OCMShare
from seahub.utils import within_time_range
try:
    from seahub.settings import MULTI_TENANCY
except ImportError:
    MULTI_TENANCY = False

logger = logging.getLogger(__name__)


HEADER_CLIENT_VERSION = 'HTTP_X_SEAFILE_CLIENT_VERSION'
HEADER_PLATFORM_VERSION = 'HTTP_X_SEAFILE_PLATFORM_VERSION'

class AuthenticationFailed(APIException):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = 'Incorrect authentication credentials.'

    def __init__(self, detail=None):
        self.detail = detail or self.default_detail

class DeviceRemoteWipedException(AuthenticationFailed):
    pass

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
        auth = request.headers.get('authorization', '').split()
        if not auth or auth[0].lower() != 'token':
            return None

        if len(auth) == 1:
            msg = 'Invalid token header. No credentials provided.'
            raise AuthenticationFailed(msg)
        elif len(auth) > 2:
            msg = 'Invalid token header. Token string should not contain spaces.'
            raise AuthenticationFailed(msg)

        key = auth[1]
        ret = self.authenticate_v2(request, key)
        if ret:
            return ret

        return self.authenticate_v1(request, key)

    def authenticate_v1(self, request, key):
        try:
            token = Token.objects.get(key=key)
        except Token.DoesNotExist:
            raise AuthenticationFailed('Invalid token')

        try:
            user = User.objects.get(email=token.user)
        except User.DoesNotExist:
            raise AuthenticationFailed('User inactive or deleted')

        if MULTI_TENANCY:
            orgs = ccnet_api.get_orgs_by_user(token.user)
            if orgs:
                user.org = orgs[0]

        if user.is_active:
            return (user, token)

    def authenticate_v2(self, request, key):
        try:
            token = TokenV2.objects.get(key=key)
        except TokenV2.DoesNotExist:
            # Continue authentication in token v1
            return None

        if token.wiped_at:
            raise DeviceRemoteWipedException('Device set to be remote wiped')

        try:
            user = User.objects.get(email=token.user)
        except User.DoesNotExist:
            raise AuthenticationFailed('User inactive or deleted')

        if MULTI_TENANCY:
            orgs = ccnet_api.get_orgs_by_user(token.user)
            if orgs:
                user.org = orgs[0]

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

            if not within_time_range(token.last_accessed, datetime.datetime.now(), 10 * 60):
                # We only need 10min precision for the last_accessed field
                need_save = True

            if need_save:
                try:
                    token.save()
                except:
                    logger.exception('error when save token v2:')

            return (user, token)


class RepoAPITokenAuthentication(BaseAuthentication):
    """
    Simple token based authentication.

    Clients should authenticate by passing the token key in the "Authorization"
    HTTP header, prepended with the string "token ".  For example:

        Authorization: token 401f7ac837da42b97f613d789819ff93537bee6a

    A custom token model may be used, but must have the following properties.

    * key -- The string identifying the token
    * user -- The user to which the token belongs
    """

    def authenticate(self, request):
        """
        auth request from repo_api_token,
        fill request.user with AnonymousUser temporarily,
        return key from headers' token,
        and set request.token_creator to person whom repo_api_token was generated by
        :param request: request
        :return: AnonymousUser, repo_api_token
        """
        auth = request.headers.get('authorization', '').split()
        if not auth or auth[0].lower() != 'token':
            return None

        if len(auth) == 1:
            msg = 'Invalid token header. No credentials provided.'
            raise AuthenticationFailed(msg)
        elif len(auth) > 2:
            msg = 'Invalid token header. Token string should not contain spaces.'
            raise AuthenticationFailed(msg)

        rat = RepoAPITokens.objects.filter(token=auth[1]).first()
        if not rat:
            rat = OCMShare.objects.filter(shared_secret=auth[1]).first()
            if not rat:
                raise AuthenticationFailed('Token inactive or deleted')
            # if is request by remote server through ocm, use from_user instead of app_name
            rat.app_name = rat.from_user
        request.repo_api_token_obj = rat

        return AnonymousUser(), auth[1]
