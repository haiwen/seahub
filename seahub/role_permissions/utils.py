# Copyright (c) 2012-2016 Seafile Ltd.
import logging

from .settings import ENABLED_ROLE_PERMISSIONS, ENABLED_ADMIN_ROLE_PERMISSIONS

from seahub.constants import DEFAULT_USER, DEFAULT_ADMIN, AUDIT_ADMIN

logger = logging.getLogger(__name__)


def get_available_roles():
    """Get available roles defined in `ENABLED_ROLE_PERMISSIONS`.
    """
    return list(ENABLED_ROLE_PERMISSIONS.keys())


def get_enabled_role_permissions_by_role(role):
    """Get permissions dict(perm_name: bool) of a role.
    """
    if not role:
        role = DEFAULT_USER

    if role not in list(ENABLED_ROLE_PERMISSIONS.keys()):
        logger.warn('%s is not a valid role, use default role.' % role)
        role = DEFAULT_USER

    return ENABLED_ROLE_PERMISSIONS[role]


def get_available_admin_roles():
    """Get available admin roles defined in `ENABLED_ADMIN_ROLE_PERMISSIONS`.
    """
    return list(ENABLED_ADMIN_ROLE_PERMISSIONS.keys())


def get_enabled_admin_role_permissions_by_role(role):
    """Get permissions dict(perm_name: bool) of a admin role.
    """

    if not role:
        role = DEFAULT_ADMIN

    if role not in list(ENABLED_ADMIN_ROLE_PERMISSIONS.keys()):
        logger.warn('%s is not a valid admin role, use audit admin role.' % role)
        role = AUDIT_ADMIN

    return ENABLED_ADMIN_ROLE_PERMISSIONS[role]
