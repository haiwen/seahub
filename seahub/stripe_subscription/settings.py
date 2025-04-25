from django.conf import settings


ENABLE_STRIPE_SUBSCRIPTION = getattr(settings, 'ENABLE_STRIPE_SUBSCRIPTION', False)
STRIPE_SUBSCRIPTION_SERVER_URL = getattr(settings, 'STRIPE_SUBSCRIPTION_SERVER_URL', '')
STRIPE_SUBSCRIPTION_SERVER_AUTH_KEY = getattr(settings,
                                              'STRIPE_SUBSCRIPTION_SERVER_AUTH_KEY',
                                              '')
STRIPE_SUBSCRIPTION_ORG_PREFIX = getattr(settings, 'STRIPE_SUBSCRIPTION_ORG_PREFIX', 'org_')
