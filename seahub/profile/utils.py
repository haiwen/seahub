# Copyright (c) 2012-2016 Seafile Ltd.
from django.core.cache import cache

from .models import Profile
from .settings import NICKNAME_CACHE_PREFIX, NICKNAME_CACHE_TIMEOUT, \
        CONTACT_CACHE_TIMEOUT, CONTACT_CACHE_PREFIX
from seahub.shortcuts import get_first_object_or_none
from seahub.utils import normalize_cache_key

def refresh_cache(username):
    """
    Function to be called when change user nickname.
    """
    profile = get_first_object_or_none(Profile.objects.filter(user=username))
    nickname = profile.nickname if profile else username.split('@')[0]
    contactemail = profile.contact_email if profile else ''

    key = normalize_cache_key(username, NICKNAME_CACHE_PREFIX)
    cache.set(key, nickname, NICKNAME_CACHE_TIMEOUT)
    
    contact_key = normalize_cache_key(username, CONTACT_CACHE_PREFIX)
    cache.set(contact_key, contactemail, CONTACT_CACHE_TIMEOUT)

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
