# Copyright (c) 2012-2016 Seafile Ltd.
from seahub.constants import DEFAULT_USER, GUEST_USER
from seahub.utils import is_pro_version

def populate_user_permissions(user):
    if is_pro_version():
        from seahub_extra.auth_extra.utils import populate_user_permissions
        populate_user_permissions(user)
    else:
        # use default user permissions
        pass

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
