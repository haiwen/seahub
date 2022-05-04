"""Django CAS 1.0/2.0 authentication backend"""




from django.conf import settings

__all__ = []

_DEFAULTS = {
    'CAS_ADMIN_PREFIX': None,
    'CAS_CREATE_USER': True,
    'CAS_EXTRA_LOGIN_PARAMS': None,
    'CAS_RENEW': False,
    'CAS_IGNORE_REFERER': False,
    'CAS_LOGOUT_COMPLETELY': True,
    'CAS_FORCE_CHANGE_USERNAME_CASE': None,
    'CAS_REDIRECT_URL': '/',
    'CAS_RETRY_LOGIN': False,
    'CAS_SERVER_URL': None,
    'CAS_VERSION': '2',
    'CAS_USERNAME_ATTRIBUTE': 'uid',
    'CAS_PROXY_CALLBACK': None,
    'CAS_LOGIN_MSG': "Login succeeded. Welcome, %s.",
    'CAS_LOGGED_MSG': "You are logged in as %s.",
    'CAS_STORE_NEXT': False,
    'CAS_APPLY_ATTRIBUTES_TO_USER': False,
    'CAS_RENAME_ATTRIBUTES': {},
    'CAS_SERVER_CERT_VERIFY': True,
    'CAS_CREATE_USER_WITH_ID': False
}

for key, value in list(_DEFAULTS.items()):
    try:
        getattr(settings, key)
    except AttributeError:
        setattr(settings, key, value)
    # Suppress errors from DJANGO_SETTINGS_MODULE not being set
    except ImportError:
        pass
