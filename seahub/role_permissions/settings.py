# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from django.conf import settings

from seahub.constants import DEFAULT_USER, GUEST_USER, \
        DEFAULT_ADMIN, SYSTEM_ADMIN, DAILY_ADMIN, AUDIT_ADMIN

# Get an instance of a logger
logger = logging.getLogger(__name__)

DEFAULT_ENABLED_ROLE_PERMISSIONS = {
    DEFAULT_USER: {
        'can_add_repo': True,
        'can_add_group': True,
        'can_view_org': True,
        'can_use_global_address_book': True,
        'can_generate_share_link': True,
        'can_generate_upload_link': True,
        'can_invite_guest': False,
        'can_drag_drop_folder_to_sync': True,
        'can_connect_with_android_clients': True,
        'can_connect_with_ios_clients': True,
        'can_connect_with_desktop_clients': True,
        'can_export_files_via_mobile_client': True,
        'role_quota': '',
    },
    GUEST_USER: {
        'can_add_repo': False,
        'can_add_group': False,
        'can_view_org': False,
        'can_use_global_address_book': False,
        'can_generate_share_link': False,
        'can_generate_upload_link': False,
        'can_invite_guest': False,
        'can_drag_drop_folder_to_sync': False,
        'can_connect_with_android_clients': False,
        'can_connect_with_ios_clients': False,
        'can_connect_with_desktop_clients': False,
        'can_export_files_via_mobile_client': False,
        'role_quota': '',
    },
}

_default_role_perms = DEFAULT_ENABLED_ROLE_PERMISSIONS.copy()

try:
    _default_role_perms.update(settings.ENABLED_ROLE_PERMISSIONS)  # merge outter dict
except AttributeError:
    pass  # ignore error if ENABLED_ROLE_PERMISSONS is not set in settings.py

def get_enabled_role_permissions():
    for role, perms in _default_role_perms.iteritems():
        # check role permission syntax
        for k in perms.keys():
            if k not in DEFAULT_ENABLED_ROLE_PERMISSIONS[DEFAULT_USER].keys():
                logger.warn('"%s" is not valid permission, please review the ENABLED_ROLE_PERMISSIONS setting.' % k)
                assert False, '"%s" is not valid permission, please review the ENABLED_ROLE_PERMISSIONS setting.' % k

    return _default_role_perms

ENABLED_ROLE_PERMISSIONS = get_enabled_role_permissions()

# role permission for administraror

# 1, Admin without a role or with a role of `default_admin` can view ALL pages.
# 2, If an admin has a role:
#  2.1, He/she can NOT view any pages by default.
#  2.2, If he/she wants to view some page, set the related permission to `True`.
#  2.3, He/she can only view the following pages(defined by `ALL_ADMIN_PERMISSIONS`) at most.

DEFAULT_ENABLED_ADMIN_ROLE_PERMISSIONS = {
    DEFAULT_ADMIN: {
        'can_view_system_info': True,
        'can_config_system': True,
        'can_manage_library': True,
        'can_manage_user': True,
        'can_manage_group': True,
        'can_view_user_log': True,
        'can_view_admin_log': True,
    },
    # SYSTEM_ADMIN can ONLY view system-info(without upload licence), settings pages.
    SYSTEM_ADMIN: {
        'can_view_system_info': True,
        'can_config_system': True,
    },
    # DAILY_ADMIN can ONLY view system-info(without upload licence), libraries/users/groups, user-logs pages.
    DAILY_ADMIN: {
        'can_view_system_info': True,
        'can_manage_library': True,
        'can_manage_user': True,
        'can_manage_group': True,
        'can_view_user_log': True,
    },
    # AUDIT_ADMIN can ONLY view system-info(without upload licence), admin-logs pages.
    AUDIT_ADMIN: {
        'can_view_system_info': True,
        'can_view_admin_log': True,
    },
}

_default_admin_role_permissions = DEFAULT_ENABLED_ADMIN_ROLE_PERMISSIONS.copy()

try:
    _default_admin_role_permissions.update(settings.ENABLED_ADMIN_ROLE_PERMISSIONS)  # merge outter dict
except AttributeError:
    pass  # ignore error if ENABLED_ADMIN_ROLE_PERMISSIONS is not set in settings.py

def get_enabled_admin_role_permissions():
    permissions = {}
    for role, perms in _default_admin_role_permissions.iteritems():
        # check admin role permission syntax
        default_admin_permissions = DEFAULT_ENABLED_ADMIN_ROLE_PERMISSIONS[DEFAULT_ADMIN]
        for k in perms.keys():
            if k not in default_admin_permissions.keys():
                logger.warn('"%s" is not valid permission, please review the ENABLED_ADMIN_ROLE_PERMISSIONS setting.' % k)

        all_false_permission = {}
        for permission in default_admin_permissions.keys():
            all_false_permission[permission] = False

        all_false_permission.update(perms)
        permissions[role] = all_false_permission

    return permissions

ENABLED_ADMIN_ROLE_PERMISSIONS = get_enabled_admin_role_permissions()
