# Copyright (c) 2012-2016 Seafile Ltd.
from django.core.cache import cache

from .models import Profile
from .settings import NICKNAME_CACHE_PREFIX, CONTACT_CACHE_PREFIX
from seahub.utils import normalize_cache_key

def get_profile_cache_key(username, prefix):
    return normalize_cache_key(username.lower(), prefix)


def refresh_cache(username):
    """
    Invalidate cached nickname and contact email after a profile change.
    """
    cache.delete(get_profile_cache_key(username, NICKNAME_CACHE_PREFIX))
    cache.delete(get_profile_cache_key(username, CONTACT_CACHE_PREFIX))

def convert_contact_emails(in_list):
    """
    Convert contact email to ccnet email in the `in_list`.
    """
    assert isinstance(in_list, list)
    ret = []

    contact_email_user_map = {}
    for e in Profile.objects.filter(contact_email__in=in_list):
        contact_email_user_map[e.contact_email] = e.user

    for e in in_list:
        try:
            ccnet_email = contact_email_user_map[e]
            ret.append(ccnet_email)
        except KeyError:
            ret.append(e)

    return ret
