""" Django CAS 2.0 authentication backend """

from django.conf import settings

__all__ = []

_DEFAULTS = {
    'CAS_EXTRA_LOGIN_PARAMS': None,
    'CAS_RENEW': False,
    'CAS_GATEWAY': False,
    'CAS_GATEWAY_PARAM': 'casgw',
    'CAS_IGNORE_REFERER': False,
    'CAS_LOGOUT_COMPLETELY': True,
    'CAS_SINGLE_SIGN_OUT': True,
    'CAS_REDIRECT_URL': '/',
    'CAS_RETRY_LOGIN': False,
    'CAS_PROXY_CALLBACK': None,
    'CAS_SERVER_URL': None,
    'CAS_AUTO_CREATE_USERS' : False,
    'CAS_ALLOWED_PROXIES' : []
}

for key, value in _DEFAULTS.items():
    try:
        getattr(settings, key)
    except AttributeError:
        setattr(settings, key, value)
    # Suppress errors from DJANGO_SETTINGS_MODULE not being set
    except ImportError:
        pass
