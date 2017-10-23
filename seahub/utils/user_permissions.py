# Copyright (c) 2012-2016 Seafile Ltd.
from seahub.constants import DEFAULT_USER, GUEST_USER, \
        DEFAULT_ADMIN, SYSTEM_ADMIN, DAILY_ADMIN, AUDIT_ADMIN

def get_basic_user_roles():
    """Get predefined user roles.
    """
    return [DEFAULT_USER, GUEST_USER]

def get_user_role(user):
    """Get a user's role.
    """
    if user.role is None or user.role == '' or user.role == DEFAULT_USER:
        return DEFAULT_USER

    if user.role == GUEST_USER:
        return GUEST_USER

    return user.role            # custom user role

def get_basic_admin_roles():
    """Get predefined admin roles.
    """
    return [DEFAULT_ADMIN, SYSTEM_ADMIN, DAILY_ADMIN, AUDIT_ADMIN]

