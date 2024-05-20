from django.conf import settings


ENABLE_SUBSCRIPTION = getattr(settings, 'ENABLE_SUBSCRIPTION', False)
SUBSCRIPTION_SERVER_AUTH_KEY = getattr(
    settings, 'SUBSCRIPTION_SERVER_AUTH_KEY', '')
SUBSCRIPTION_SERVER_URL = getattr(
    settings, 'SUBSCRIPTION_SERVER_URL', '')

SUBSCRIPTION_ORG_PREFIX = getattr(settings, 'SUBSCRIPTION_ORG_PREFIX', 'org_')
