# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf import settings

RESERVED_SUBDOMAINS = getattr(settings, 'RESERVED_SUBDOMAINS', ('www', 'api'))

ORG_REDIRECT = getattr(settings, 'ORG_REDIRECT', False)

ORG_MEMBER_QUOTA_ENABLED = getattr(settings, 'ORG_MEMBER_QUOTA_ENABLED', False)

ORG_MEMBER_QUOTA_DEFAULT = getattr(settings, 'ORG_MEMBER_QUOTA_DEFAULT', 10)

ORG_TRIAL_DAYS = getattr(settings, 'ORG_TRIAL_DAYS', -1)

ORG_AUTO_URL_PREFIX = getattr(settings, 'ORG_AUTO_URL_PREFIX', True)

ORG_ENABLE_ADMIN_INVITE_USER = getattr(settings, 'ORG_ENABLE_ADMIN_INVITE_USER', False)

ORG_ENABLE_ADMIN_CUSTOM_NAME = getattr(settings, 'ORG_ENABLE_ADMIN_CUSTOM_NAME', True)
ORG_ENABLE_ADMIN_CUSTOM_LOGO = getattr(settings, 'ORG_ENABLE_ADMIN_CUSTOM_LOGO', False)
