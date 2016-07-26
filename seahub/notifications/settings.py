# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf import settings

NOTIFICATION_CACHE_TIMEOUT = getattr(settings, 'NOTIFICATION_CACHE_TIMEOUT', 0)
