# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-

import json
import logging

from seaserv import ccnet_api

logger = logging.getLogger(__name__)

def _get_exist_user_objs(emails):
    """Get user objs of all existed users.

    Args:
        emails: email str list.

    Returns:
        user obj list of all existed users.
    """

    exist_user_objs = []

    start = 0
    length = len(emails)

    try:
        while start < length:

            # TODO, LDAPImport
            emails_json = json.dumps(emails[start:start+20])
            user_obj_list = ccnet_api.get_emailusers_in_list('DB', emails_json) + \
                    ccnet_api.get_emailusers_in_list('LDAP', emails_json)

            start += 20
            exist_user_objs.extend(user_obj_list)
    except Exception as e:
        logger.error(e)
        return []

    return exist_user_objs

def get_exist_user_emails(emails):
    """Get email list of all existed users.

    Args:
        emails: email str list.

    Returns:
        email str list of all existed users.
    """

    exist_user_objs = _get_exist_user_objs(emails)
    return [u.email for u in exist_user_objs]

def get_exist_active_user_emails(emails):
    """Get email list of all existed AND active users.

    Args:
        emails: email str list.

    Returns:
        email str list of all existed AND active users.
    """
    exist_user_objs = _get_exist_user_objs(emails)
    return [u.email for u in exist_user_objs if u.is_active]
