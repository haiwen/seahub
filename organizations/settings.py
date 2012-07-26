from django.conf import settings

ORG_CACHE_PREFIX = getattr(settings, 'ORG_CACHE_PREFIX', 'ORGANIZATION_')
