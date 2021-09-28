from django.conf import settings

ENABLE_OCM_VIA_WEBDAV = getattr(settings, 'ENABLE_OCM_VIA_WEBDAV', False)
OCM_VIA_WEBDAV_ENDPOINT = getattr(settings, 'OCM_VIA_WEBDAV_ENDPOINT', 'ocm-via-webdav')
