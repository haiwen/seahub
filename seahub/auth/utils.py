# Copyright (c) 2012-2016 Seafile Ltd.
from django.core.cache import cache
from django.conf import settings

from seahub.profile.models import Profile
from seahub.utils import normalize_cache_key
from seahub.utils.ip import get_remote_ip

LOGIN_ATTEMPT_PREFIX = 'UserLoginAttempt_'


def get_login_failed_attempts(username=None, ip=None):
    """Get login failed attempts base on username and ip.
    If both username and ip are provided, return the max value.

    Arguments:
    - `username`:
    - `ip`:
    """
    if username is None and ip is None:
        return 0

    username_attempts = ip_attempts = 0

    if username:
        cache_key = normalize_cache_key(username, prefix=LOGIN_ATTEMPT_PREFIX)
        username_attempts = cache.get(cache_key, 0)

    if ip:
        cache_key = normalize_cache_key(ip, prefix=LOGIN_ATTEMPT_PREFIX)
        ip_attempts = cache.get(cache_key, 0)

    return max(username_attempts, ip_attempts)


def incr_login_failed_attempts(username=None, ip=None):
    """Increase login failed attempts by 1 for both username and ip.

    Arguments:
    - `username`:
    - `ip`:

    Returns new value of failed attempts.
    """
    timeout = settings.LOGIN_ATTEMPT_TIMEOUT
    username_attempts = 1
    ip_attempts = 1

    if username:
        cache_key = normalize_cache_key(username, prefix=LOGIN_ATTEMPT_PREFIX)
        try:
            username_attempts = cache.incr(cache_key)
        except ValueError:
            cache.set(cache_key, 1, timeout)

    if ip:
        cache_key = normalize_cache_key(ip, prefix=LOGIN_ATTEMPT_PREFIX)
        try:
            ip_attempts = cache.incr(cache_key)
        except ValueError:
            cache.set(cache_key, 1, timeout)

    return max(username_attempts, ip_attempts)


def clear_login_failed_attempts(request, username):
    """Clear login failed attempts records.

    Arguments:
    - `request`:
    """
    ip = get_remote_ip(request)

    cache.delete(normalize_cache_key(username, prefix=LOGIN_ATTEMPT_PREFIX))
    cache.delete(normalize_cache_key(ip, prefix=LOGIN_ATTEMPT_PREFIX))
    p = Profile.objects.get_profile_by_user(username)
    if p and p.login_id:
        cache.delete(normalize_cache_key(p.login_id, prefix=LOGIN_ATTEMPT_PREFIX))


def get_virtual_id_by_email(email):
    p = Profile.objects.get_profile_by_contact_email(email)
    if p is None:
        return email
    else:
        return p.user
