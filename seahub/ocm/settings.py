from django.conf import settings

ENABLE_OCM = getattr(settings, 'ENABLE_OCM', False)
OCM_PROVIDER_ID = getattr(settings, 'OCM_PROVIDER_ID', '')
OCM_SEAFILE_PROTOCOL = getattr(settings, 'OCM_SEAFILE_PROTOCOL', 'Seafile API')
OCM_API_VERSION = getattr(settings, 'OCM_API_VERSION', '1.0-proposal1')
OCM_ENDPOINT = getattr(settings, 'OCM_ENDPOINT', 'api/v2.1/ocm/')
# consumer delete a share
OCM_NOTIFICATION_SHARE_DECLINED = getattr(settings, 'OCM_NOTIFICATION_SHARE_DECLINED', 'SHARE_DECLINED')
# provider delete a share
OCM_NOTIFICATION_SHARE_UNSHARED = getattr(settings, 'OCM_NOTIFICATION_SHARE_UNSHARED', 'SHARE_UNSHARED')

# protocol urls
OCM_PROTOCOL_URL = getattr(settings, 'OCM_PROTOCOL_URL', 'ocm-provider/')
OCM_CREATE_SHARE_URL = getattr(settings, 'OCM_CREATE_SHARE_URL', 'shares/')
OCM_NOTIFICATION_URL = getattr(settings, 'OCM_PROTOCOL_URL', 'notifications/')

# constants
OCM_RESOURCE_TYPE_FILE = 'file'
OCM_RESOURCE_TYPE_LIBRARY = 'library'
OCM_SHARE_TYPES = ['user']
SUPPORTED_OCM_PROTOCOLS = (
    OCM_SEAFILE_PROTOCOL,
)
OCM_NOTIFICATION_TYPE_LIST = [
    OCM_NOTIFICATION_SHARE_UNSHARED,
    OCM_NOTIFICATION_SHARE_DECLINED,
]

VIA_REPO_TOKEN_URL = {
    'DIR': 'api/v2.1/via-repo-token/dir/',
    'UPLOAD_LINK': 'api/v2.1/via-repo-token/upload-link/',
    'DOWNLOAD_LINK': 'api/v2.1/via-repo-token/download-link/',
}

OCM_REMOTE_SERVERS = getattr(settings, 'OCM_REMOTE_SERVERS', {})
