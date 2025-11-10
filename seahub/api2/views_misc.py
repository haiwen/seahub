# Copyright (c) 2012-2016 Seafile Ltd.
from seahub.api2.base import APIView
from seahub.api2.utils import json_response
from seahub import settings
from seahub.utils import HAS_FILE_SEARCH, is_pro_version, HAS_FILE_SEASEARCH

from constance import config


class ServerInfoView(APIView):
    """
    Returns the server info (version, supported features).
    """
    @json_response
    def get(self, request, format=None):

        info = {
            'version': settings.SEAFILE_VERSION,
        }

        if settings.ENCRYPTED_LIBRARY_VERSION >= 3:
            info['encrypted_library_version'] = settings.ENCRYPTED_LIBRARY_VERSION
        else:
            info['encrypted_library_version'] = 2

        if settings.ENCRYPTED_LIBRARY_PWD_HASH_ALGO:
            info['encrypted_library_pwd_hash_algo'] = settings.ENCRYPTED_LIBRARY_PWD_HASH_ALGO
            info['encrypted_library_pwd_hash_params'] = settings.ENCRYPTED_LIBRARY_PWD_HASH_PARAMS

        features = ['seafile-basic']

        if is_pro_version():
            features.append('seafile-pro')

        if HAS_FILE_SEARCH or HAS_FILE_SEASEARCH:
            features.append('file-search')

        if config.DISABLE_SYNC_WITH_ANY_FOLDER:
            features.append('disable-sync-with-any-folder')

        if config.CLIENT_SSO_VIA_LOCAL_BROWSER:
            features.append('client-sso-via-local-browser')

        if hasattr(settings, 'DESKTOP_CUSTOM_LOGO'):
            info['desktop-custom-logo'] = settings.MEDIA_URL + getattr(settings, 'DESKTOP_CUSTOM_LOGO')

        if hasattr(settings, 'DESKTOP_CUSTOM_BRAND'):
            info['desktop-custom-brand'] = getattr(settings, 'DESKTOP_CUSTOM_BRAND')
            
        enable_onlyoffice = getattr(settings, 'ENABLE_ONLYOFFICE', False)
        if enable_onlyoffice:
            features.append('onlyoffice')

        info['features'] = features
        return info
