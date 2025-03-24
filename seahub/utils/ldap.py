# Copyright (c) 2012-2016 Seafile Ltd.
import logging
import seahub.settings as settings

from seahub.settings import ENABLE_LDAP, LDAP_USER_FIRST_NAME_ATTR, LDAP_USER_LAST_NAME_ATTR, \
    LDAP_USER_NAME_REVERSE, LDAP_FILTER, LDAP_CONTACT_EMAIL_ATTR, LDAP_USER_ROLE_ATTR, \
    ENABLE_SASL, SASL_MECHANISM, SASL_AUTHC_ID_ATTR, ENABLE_SSO_USER_CHANGE_PASSWORD

LDAP_SERVER_URL = getattr(settings, 'LDAP_SERVER_URL', '')
LDAP_BASE_DN = getattr(settings, 'LDAP_BASE_DN', '')
LDAP_ADMIN_DN = getattr(settings, 'LDAP_ADMIN_DN', '')
LDAP_ADMIN_PASSWORD = getattr(settings, 'LDAP_ADMIN_PASSWORD', '')
LDAP_LOGIN_ATTR = getattr(settings, 'LDAP_LOGIN_ATTR', '')

LDAP_PROVIDER = getattr(settings, 'LDAP_PROVIDER', 'ldap')
LDAP_USER_OBJECT_CLASS = getattr(settings, 'LDAP_USER_OBJECT_CLASS', 'person')
LDAP_FOLLOW_REFERRALS = getattr(settings, 'LDAP_FOLLOW_REFERRALS', True)

# multi ldap
ENABLE_MULTI_LDAP = getattr(settings, 'ENABLE_MULTI_LDAP', False)
MULTI_LDAP_1_SERVER_URL = getattr(settings, 'MULTI_LDAP_1_SERVER_URL', '')
MULTI_LDAP_1_BASE_DN = getattr(settings, 'MULTI_LDAP_1_BASE_DN', '')
MULTI_LDAP_1_ADMIN_DN = getattr(settings, 'MULTI_LDAP_1_ADMIN_DN', '')
MULTI_LDAP_1_ADMIN_PASSWORD = getattr(settings, 'MULTI_LDAP_1_ADMIN_PASSWORD', '')
MULTI_LDAP_1_LOGIN_ATTR = getattr(settings, 'MULTI_LDAP_1_LOGIN_ATTR', '')

MULTI_LDAP_1_USER_OBJECT_CLASS = getattr(settings, 'MULTI_LDAP_1_USER_OBJECT_CLASS', 'person')
MULTI_LDAP_1_PROVIDER = getattr(settings, 'MULTI_LDAP_1_PROVIDER', 'ldap1')
MULTI_LDAP_1_FILTER = getattr(settings, 'MULTI_LDAP_1_FILTER', '')
MULTI_LDAP_1_ENABLE_SASL = getattr(settings, 'MULTI_LDAP_1_ENABLE_SASL', False)
MULTI_LDAP_1_SASL_MECHANISM = getattr(settings, 'MULTI_LDAP_1_SASL_MECHANISM', '')
MULTI_LDAP_1_FOLLOW_REFERRALS = getattr(settings, 'MULTI_LDAP_1_FOLLOW_REFERRALS', True)

MULTI_LDAP_1_CONTACT_EMAIL_ATTR = getattr(settings, 'MULTI_LDAP_1_CONTACT_EMAIL_ATTR', '')
MULTI_LDAP_1_USER_ROLE_ATTR = getattr(settings, 'MULTI_LDAP_1_USER_ROLE_ATTR', '')
MULTI_LDAP_1_SASL_AUTHC_ID_ATTR = getattr(settings, 'MULTI_LDAP_1_SASL_AUTHC_ID_ATTR', '')
LDAP_UPDATE_USER_WHEN_LOGIN = getattr(settings, 'LDAP_UPDATE_USER_WHEN_LOGIN', True)

logger = logging.getLogger(__name__)

# check ldap config
if ENABLE_LDAP:
    for key, value in {
            'LDAP_SERVER_URL': LDAP_SERVER_URL,
            'LDAP_BASE_DN': LDAP_BASE_DN,
            'LDAP_ADMIN_DN': LDAP_ADMIN_DN,
            'LDAP_ADMIN_PASSWORD': LDAP_ADMIN_PASSWORD,
            'LDAP_LOGIN_ATTR': LDAP_LOGIN_ATTR,
        }.items():
        if not value:
            logger.error(key + ' import failed, please check LDAP settings.')

if ENABLE_MULTI_LDAP:
    for key, value in {
            'MULTI_LDAP_1_SERVER_URL': MULTI_LDAP_1_SERVER_URL,
            'MULTI_LDAP_1_BASE_DN': MULTI_LDAP_1_BASE_DN,
            'MULTI_LDAP_1_ADMIN_DN': MULTI_LDAP_1_ADMIN_DN,
            'MULTI_LDAP_1_ADMIN_PASSWORD': MULTI_LDAP_1_ADMIN_PASSWORD,
            'MULTI_LDAP_1_LOGIN_ATTR': MULTI_LDAP_1_LOGIN_ATTR,
        }.items():
        if not value:
            logger.error(key + ' import failed, please check MULTI_LDAP settings.')

def get_ldap_info():
    """Get LDAP config from seahub_settings.py.
    """
    return ENABLE_LDAP
