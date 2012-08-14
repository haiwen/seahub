from django.conf import settings

NICKNAME_CACHE_TIMEOUT = getattr(settings, 'NICKNAME_CACHE_TIMEOUT', 24 * 60 * 60)
NICKNAME_CACHE_PREFIX = getattr(settings, 'NICKNAME_CACHE_PREFIX', 'NICKNAME_')
