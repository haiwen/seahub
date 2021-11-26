# Copyright (c) 2012-2019 Seafile Ltd.

import logging
from constance import config

from django.conf import settings as dj_settings

from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from seahub.api2.authentication import TokenAuthentication
from seahub.api2.throttling import UserRateThrottle
from seahub.api2.utils import api_error

logger = logging.getLogger(__name__)

DIGIT_WEB_SETTINGS = [
    'DISABLE_SYNC_WITH_ANY_FOLDER', 'ENABLE_SIGNUP',
    'ACTIVATE_AFTER_REGISTRATION', 'REGISTRATION_SEND_MAIL',
    'LOGIN_REMEMBER_DAYS', 'REPO_PASSWORD_MIN_LENGTH',
    'ENABLE_REPO_HISTORY_SETTING', 'USER_STRONG_PASSWORD_REQUIRED',
    'ENABLE_ENCRYPTED_LIBRARY', 'USER_PASSWORD_MIN_LENGTH',
    'USER_PASSWORD_STRENGTH_LEVEL', 'SHARE_LINK_PASSWORD_MIN_LENGTH',
    'SHARE_LINK_FORCE_USE_PASSWORD', 'SHARE_LINK_PASSWORD_STRENGTH_LEVEL',
    'FORCE_PASSWORD_CHANGE',
    'LOGIN_ATTEMPT_LIMIT', 'FREEZE_USER_ON_LOGIN_FAILED',
    'ENABLE_SHARE_TO_ALL_GROUPS', 'ENABLE_TWO_FACTOR_AUTH',
    'ENABLE_BRANDING_CSS', 'ENABLE_TERMS_AND_CONDITIONS',
    'ENABLE_USER_CLEAN_TRASH', 'SHARE_LINK_TOKEN_LENGTH'
]

STRING_WEB_SETTINGS = ('SERVICE_URL', 'FILE_SERVER_ROOT', 'TEXT_PREVIEW_EXT',
                       'SITE_NAME', 'SITE_TITLE', 'CUSTOM_CSS')


class AdminWebSettings(APIView):
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    throttle_classes = (UserRateThrottle,)
    permission_classes = (IsAdminUser,)

    def get(self, request):

        if not request.user.admin_permissions.can_config_system():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        if not dj_settings.ENABLE_SETTINGS_VIA_WEB:
            error_msg = 'Web settings not supported.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        config_dict = {}
        for key in DIGIT_WEB_SETTINGS:
            value = getattr(config, key)
            config_dict[key] = value

        for key in STRING_WEB_SETTINGS:
            value = getattr(config, key)
            config_dict[key] = value

        return Response(config_dict)

    def put(self, request):

        if not request.user.admin_permissions.can_config_system():
            return api_error(status.HTTP_403_FORBIDDEN, 'Permission denied.')

        if not dj_settings.ENABLE_SETTINGS_VIA_WEB:
            error_msg = 'Web settings not supported.'
            return api_error(status.HTTP_404_NOT_FOUND, error_msg)

        for key, value in request.data.items():

            if key not in DIGIT_WEB_SETTINGS and key not in STRING_WEB_SETTINGS:
                error_msg = 'setting invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if key in DIGIT_WEB_SETTINGS:
                if not value.isdigit():
                    error_msg = 'value invalid.'
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)
                else:
                    value = int(value)

                if key == 'USER_PASSWORD_STRENGTH_LEVEL' and value not in (1, 2, 3, 4):
                    error_msg = 'value invalid.'
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

                if key == 'SHARE_LINK_PASSWORD_STRENGTH_LEVEL' and value not in (1, 2, 3, 4):
                    error_msg = 'value invalid.'
                    return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            if (key in STRING_WEB_SETTINGS and key != 'CUSTOM_CSS') and not value:
                error_msg = 'value invalid.'
                return api_error(status.HTTP_400_BAD_REQUEST, error_msg)

            try:
                setattr(config, key, value)
            except AttributeError as e:
                logger.error(e)
                error_msg = 'Internal Server Error'
                return api_error(status.HTTP_500_INTERNAL_SERVER_ERROR, error_msg)

        config_dict = {}
        for key in DIGIT_WEB_SETTINGS:
            value = getattr(config, key)
            config_dict[key] = value

        for key in STRING_WEB_SETTINGS:
            value = getattr(config, key)
            config_dict[key] = value

        return Response(config_dict)
