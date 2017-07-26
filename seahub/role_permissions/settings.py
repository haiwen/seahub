# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from django.conf import settings

from seahub.constants import DEFAULT_USER, GUEST_USER

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
        'can_send_share_link_mail': True,
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
        'can_send_share_link_mail': False,
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
