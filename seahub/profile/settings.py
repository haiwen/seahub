from django.conf import settings

NICKNAME_CACHE_TIMEOUT = getattr(settings, 'NICKNAME_CACHE_TIMEOUT', 14 * 24 * 60 * 60)
NICKNAME_CACHE_PREFIX = getattr(settings, 'NICKNAME_CACHE_PREFIX', 'NICKNAME_')

EMAIL_ID_CACHE_TIMEOUT = getattr(settings, 'EMAIL_ID_CACHE_TIMEOUT', 14 * 24 * 60 * 60)
EMAIL_ID_CACHE_PREFIX = getattr(settings, 'EMAIL_ID_CACHE_PREFIX', 'EMAIL_ID_')
