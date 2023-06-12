# Copyright (c) 2012-2016 Seafile Ltd.
import logging
from django.conf import settings
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.utils.translation import gettext as _

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error
from seahub.options.models import UserOptions
from seahub.utils import get_password_strength_level, \
        is_valid_password, hash_password

# Get an instance of a logger
logger = logging.getLogger(__name__)


class WebdavSecretView(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    permission_classes = (IsAuthenticated, )
    throttle_classes = (UserRateThrottle, )

    def get(self, request, format=None):
        if not settings.ENABLE_WEBDAV_SECRET:
            return api_error(status.HTTP_403_FORBIDDEN,
                             'Feature is not enabled.')

        username = request.user.username
        decoded = UserOptions.objects.get_webdav_decoded_secret(username)

        return Response({
            'secret': decoded,
        })

    def put(self, request, format=None):

        if not settings.ENABLE_WEBDAV_SECRET:
            return api_error(status.HTTP_403_FORBIDDEN,
                             'Feature is not enabled.')

        username = request.user.username
        secret = request.data.get("secret", None)

        if secret:

            if not is_valid_password(secret):
                error_msg = _('Password can only contain number, upper letter, lower letter and other symbols.')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if len(secret) >= 30:
                error_msg = _('Length of WebDav password should be less than 30.')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if len(secret) < settings.WEBDAV_SECRET_MIN_LENGTH:
                error_msg = _('Password is too short.')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if get_password_strength_level(secret) < settings.WEBDAV_SECRET_STRENGTH_LEVEL:
                error_msg = _('Password is too weak.')
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            hashed_password = hash_password(secret)
            UserOptions.objects.set_webdav_secret(username, hashed_password)
        else:
            UserOptions.objects.unset_webdav_secret(username)

        return Response({'success': True})
