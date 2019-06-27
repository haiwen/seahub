from .settings import *

# no cache for testing
# CACHES = {
#     'default': {
#         'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
#     }
# }

# enlarge api throttle
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_RATES': {
        'ping': '90000/minute',
        'anon': '90000/minute',
        'user': '90000/minute',
    },
}

# Use static file storage instead of cached, since the cached need to run collect
# command first.
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'
