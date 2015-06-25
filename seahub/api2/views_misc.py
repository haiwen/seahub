from rest_framework.views import APIView

from seahub.api2.utils import json_response
from seahub import settings
from seahub.utils import HAS_OFFICE_CONVERTER, HAS_FILE_SEARCH
try:
    from seahub.settings import DISABLE_SYNC_WITH_ANY_FOLDER
except ImportError:
    DISABLE_SYNC_WITH_ANY_FOLDER = False


class ServerInfoView(APIView):
    """
    Returns the server info (version, supported features).
    """
    @json_response
    def get(self, request, format=None):
        info = {
            'version': settings.SEAFILE_VERSION,
        }

        features = ['seafile-basic']

        if any(['seahub_extra' in app for app in settings.INSTALLED_APPS]):
            features.append('seafile-pro')

        if HAS_OFFICE_CONVERTER:
            features.append('office-preview')

        if HAS_FILE_SEARCH:
            features.append('file-search')

        if DISABLE_SYNC_WITH_ANY_FOLDER:
            features.append('disable-sync-with-any-folder')

        info['features'] = features
        return info
