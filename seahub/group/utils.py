# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
import re
import logging

import seaserv
from seaserv import ccnet_api

from seahub.utils import is_org_context
from seahub.profile.models import Profile
from seahub.base.templatetags.seahub_tags import email2nickname
from seahub.avatar.settings import AVATAR_DEFAULT_SIZE
from seahub.avatar.templatetags.avatar_tags import api_avatar_url, \
    get_default_avatar_url

logger = logging.getLogger(__name__)

class BadGroupNameError(Exception):
    pass

class ConflictGroupNameError(Exception):
    pass

def validate_group_name(group_name):
    """
    Check whether group name is valid.
    A valid group name only contains alphanumeric character, and the length
    should less than 255.
    """
    if len(group_name) > 255:
        return False
    return re.match('^[\w\s-]+$', group_name, re.U)

def check_group_name_conflict(request, new_group_name):
    """Check if new group name conflict with existed group.

    return "True" if conflicted else "False"
    """
    org_id = -1
    username = request.user.username
    if is_org_context(request):
        org_id = request.user.org.org_id
        checked_groups = seaserv.get_org_groups_by_user(org_id, username)
    else:
        if request.cloud_mode:
            checked_groups = seaserv.get_personal_groups_by_user(username)
        else:
            checked_groups = ccnet_api.get_all_groups(-1, -1)

    for g in checked_groups:
        if g.group_name == new_group_name:
            return True

    return False

def is_group_member(group_id, email):
    return ccnet_api.is_group_user(int(group_id), email)

def is_group_admin(group_id, email):
    return ccnet_api.check_group_staff(int(group_id), email)

def is_group_owner(group_id, email):
    group = ccnet_api.get_group(int(group_id))
    if email == group.creator_name:
        return True
    else:
        return False

def is_group_admin_or_owner(group_id, email):
    if is_group_admin(group_id, email) or \
        is_group_owner(group_id, email):
        return True
    else:
        return False

def get_group_member_info(request, group_id, email, avatar_size=AVATAR_DEFAULT_SIZE):
    p = Profile.objects.get_profile_by_user(email)
    if p:
        login_id = p.login_id if p.login_id else ''
    else:
        login_id = ''

    try:
        avatar_url, is_default, date_uploaded = api_avatar_url(email, avatar_size)
    except Exception as e:
        logger.error(e)
        avatar_url = get_default_avatar_url()

    role = 'Member'
    group = ccnet_api.get_group(int(group_id))
    is_admin = bool(ccnet_api.check_group_staff(int(group_id), email))
    if email == group.creator_name:
        role = 'Owner'
    elif is_admin:
        role = 'Admin'

    member_info = {
        'group_id': group_id,
        "name": email2nickname(email),
        'email': email,
        "contact_email": Profile.objects.get_contact_email_by_user(email),
        "login_id": login_id,
        "avatar_url": request.build_absolute_uri(avatar_url),
        "is_admin": is_admin,
        "role": role,
    }

    return member_info
