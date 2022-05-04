from django.conf import settings

ENABLE_OCM_VIA_WEBDAV = getattr(settings, 'ENABLE_OCM_VIA_WEBDAV', False)

OCM_VIA_WEBDAV_OCM_ENDPOINT = getattr(settings, 'OCM_VIA_WEBDAV_OCM_ENDPOINT', '/ocm-via-webdav/')

OCM_VIA_WEBDAV_OCM_PROVIDER_URI = getattr(settings, 'OCM_VIA_WEBDAV_OCM_PROVIDER_URI', '/ocm-provider/')
OCM_VIA_WEBDAV_NOTIFICATIONS_URI = getattr(settings, 'OCM_VIA_WEBDAV_NOTIFICATIONS_URI', '/notifications')
