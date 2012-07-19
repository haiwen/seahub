from django.conf import settings

NOTIFICATION_CACHE_TIMEOUT = getattr(settings, 'NOTIFICATION_CACHE_TIMEOUT', 0)
