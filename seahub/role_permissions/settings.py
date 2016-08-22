# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from django.conf import settings

from seahub.constants import DEFAULT_USER

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
        # followings are not implemented yet
        'can_drag_drop_folder_to_sync': True,
        'can_connect_with_android_clients': True,
        'can_connect_with_ios_clients': True,
        'can_connect_with_desktop_clients': True,
        'can_export_files_via_mobile_client': True,
    },
}

_default_role_perms = DEFAULT_ENABLED_ROLE_PERMISSIONS.copy()
_default_role_perms.update(settings.ENABLED_ROLE_PERMISSIONS)  # merge outter dict

def get_enabled_role_permissions():
    ret = {}
    for role, perms in _default_role_perms.iteritems():
        default_perms = _default_role_perms['default'].copy()
        default_perms.update(perms)      # merge inner dict
        ret[role] = default_perms

        # check role permission syntax
        for k in default_perms.keys():
            if k not in DEFAULT_ENABLED_ROLE_PERMISSIONS[DEFAULT_USER].keys():
                print '"%s" is not valid permission, please review the ENABLED_ROLE_PERMISSIONS setting.' % k
                logger.warn('"%s" is not valid permission, please review the ENABLED_ROLE_PERMISSIONS setting.' % k)

    return ret

ENABLED_ROLE_PERMISSIONS = get_enabled_role_permissions()
