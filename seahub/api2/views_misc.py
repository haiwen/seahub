# Copyright (c) 2012-2016 Seafile Ltd.
from seahub.api2.base import APIView
from seahub.api2.utils import json_response
from seahub import settings
from seahub.utils import HAS_OFFICE_CONVERTER, HAS_FILE_SEARCH, is_pro_version

from constance import config

class ServerInfoView(APIView):
    """
    Returns the server info (version, supported features).
    """
    @json_response
    def get(self, request, format=None):
        info = {
            'version': settings.SEAFILE_VERSION,
            'encrypted_library_version': settings.ENCRYPTED_LIBRARY_VERSION if settings.ENCRYPTED_LIBRARY_VERSION >= 3 else 2,
        }

        features = ['seafile-basic']

        if is_pro_version():
            features.append('seafile-pro')

        if HAS_OFFICE_CONVERTER:
            features.append('office-preview')

        if HAS_FILE_SEARCH:
            features.append('file-search')

        if config.DISABLE_SYNC_WITH_ANY_FOLDER:
            features.append('disable-sync-with-any-folder')

        if hasattr(settings, 'DESKTOP_CUSTOM_LOGO'):
            info['desktop-custom-logo'] = settings.MEDIA_URL + getattr(settings, 'DESKTOP_CUSTOM_LOGO')

        if hasattr(settings, 'DESKTOP_CUSTOM_BRAND'):
            info['desktop-custom-brand'] = getattr(settings, 'DESKTOP_CUSTOM_BRAND')

        info['features'] = features
        return info
