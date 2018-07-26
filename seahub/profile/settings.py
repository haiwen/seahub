# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf import settings

NICKNAME_CACHE_TIMEOUT = getattr(settings, 'NICKNAME_CACHE_TIMEOUT', 24 * 60 * 60)
NICKNAME_CACHE_PREFIX = getattr(settings, 'NICKNAME_CACHE_PREFIX', 'NICKNAME_')

EMAIL_ID_CACHE_TIMEOUT = getattr(settings, 'EMAIL_ID_CACHE_TIMEOUT', 24 * 60 * 60)
EMAIL_ID_CACHE_PREFIX = getattr(settings, 'EMAIL_ID_CACHE_PREFIX', 'EMAIL_ID_')

CONTACT_CACHE_TIMEOUT = getattr(settings, 'CONTACT_CACHE_TIMEOUT', 24 * 60 * 60)
CONTACT_CACHE_PREFIX = getattr(settings, 'CONTACT_CACHE_PREFIX', 'CONTACT_')
