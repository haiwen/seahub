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
# admin roles for test
ENABLED_ADMIN_ROLE_PERMISSIONS = {
    'cannot_view_system_info': {
        'can_view_system_info': False,
        'can_view_statistic': True,
        'can_config_system': True,
        'can_manage_library': True,
        'can_manage_user': True,
        'can_manage_group': True,
        'can_view_user_log': True,
        'can_view_admin_log': True,
        'other_permission': True,
    },
    'cannot_view_statistic': {
        'can_view_system_info': True,
        'can_view_statistic': False,
        'can_config_system': True,
        'can_manage_library': True,
        'can_manage_user': True,
        'can_manage_group': True,
        'can_view_user_log': True,
        'can_view_admin_log': True,
        'other_permission': True,
    },
    'cannot_config_system': {
        'can_view_system_info': True,
        'can_view_statistic': True,
        'can_config_system': False,
        'can_manage_library': True,
        'can_manage_user': True,
        'can_manage_group': True,
        'can_view_user_log': True,
        'can_view_admin_log': True,
        'other_permission': True,
    },
    'cannot_manage_library': {
        'can_view_system_info': True,
        'can_view_statistic': True,
        'can_config_system': True,
        'can_manage_library': False,
        'can_manage_user': True,
        'can_manage_group': True,
        'can_view_user_log': True,
        'can_view_admin_log': True,
        'other_permission': True,
    },
    'cannot_manage_user': {
        'can_view_system_info': True,
        'can_view_statistic': True,
        'can_config_system': True,
        'can_manage_library': True,
        'can_manage_user': False,
        'can_manage_group': True,
        'can_view_user_log': True,
        'can_view_admin_log': True,
        'other_permission': True,
    },
    'cannot_manage_group': {
        'can_view_system_info': True,
        'can_view_statistic': True,
        'can_config_system': True,
        'can_manage_library': True,
        'can_manage_user': True,
        'can_manage_group': False,
        'can_view_user_log': True,
        'can_view_admin_log': True,
        'other_permission': True,
    },
    'cannot_view_user_log': {
        'can_view_system_info': True,
        'can_view_statistic': True,
        'can_config_system': True,
        'can_manage_library': True,
        'can_manage_user': True,
        'can_manage_group': True,
        'can_view_user_log': False,
        'can_view_admin_log': True,
        'other_permission': True,
    },
    'cannot_view_admin_log': {
        'can_view_system_info': True,
        'can_view_statistic': True,
        'can_config_system': True,
        'can_manage_library': True,
        'can_manage_user': True,
        'can_manage_group': True,
        'can_view_user_log': True,
        'can_view_admin_log': False,
        'other_permission': True,
    },
    'no_other_permission': {
        'can_view_system_info': True,
        'can_view_statistic': True,
        'can_config_system': True,
        'can_manage_library': True,
        'can_manage_user': True,
        'can_manage_group': True,
        'can_view_user_log': True,
        'can_view_admin_log': True,
        'other_permission': False,
    },
}
DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
