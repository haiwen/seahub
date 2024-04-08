# Copyright (c) 2012-2016 Seafile Ltd.
from django.conf import settings
from django.core.cache import cache
from django.core.files.storage import default_storage, get_storage_class
from urllib.parse import quote

from seahub.base.accounts import User
from seahub.avatar.settings import AVATAR_DEFAULT_URL, AVATAR_CACHE_TIMEOUT,\
    AUTO_GENERATE_AVATAR_SIZES, AVATAR_DEFAULT_SIZE, \
    AVATAR_DEFAULT_NON_REGISTERED_URL, AUTO_GENERATE_GROUP_AVATAR_SIZES, \
    AVATAR_FILE_STORAGE

cached_funcs = set()

def get_cache_key(user_or_username, size, prefix):
    """
    Returns a cache key consisten of a username and image size.
    """
    if isinstance(user_or_username, User):
        user_or_username = user_or_username.username
    return '%s_%s_%s' % (prefix, quote(user_or_username), size)

def get_grp_cache_key(group_id, size):
    """
    Returns a cache key consisten of a group id and iamge size.
    """
    return 'Group__%s_%s' % (group_id, size)

def cache_result(func):
    """
    Decorator to cache the result of functions that take a ``user`` and a
    ``size`` value.
    """
    def cache_set(key, value):
        cache.set(key, value, AVATAR_CACHE_TIMEOUT)
        return value

    def cached_func(user, size):
        prefix = func.__name__
        cached_funcs.add(prefix)
        key = get_cache_key(user, size, prefix=prefix)
        return cache.get(key) or cache_set(key, func(user, size))
    return cached_func

def invalidate_cache(user, size=None):
    """
    Function to be called when saving or changing an user's avatars.
    """
    sizes = set(AUTO_GENERATE_AVATAR_SIZES)
    if size is not None:
        sizes.add(size)
    for prefix in cached_funcs:
        for size in sizes:
            cache.delete(get_cache_key(user, size, prefix))

def invalidate_group_cache(group_id, size=None):
    """
    Function to be called when saving or changing an user's avatars.
    """
    sizes = set(AUTO_GENERATE_GROUP_AVATAR_SIZES)
    if size is not None:
        sizes.add(size)
    for size in sizes:
        cache.delete(get_grp_cache_key(group_id, size))
            
def get_default_avatar_url():
    base_url = getattr(settings, 'MEDIA_URL', '')
    # Don't use base_url if the default avatar url starts with http:// of https://
    if AVATAR_DEFAULT_URL.startswith('http://') or AVATAR_DEFAULT_URL.startswith('https://'):
        return AVATAR_DEFAULT_URL
    # We'll be nice and make sure there are no duplicated forward slashes
    ends = base_url.endswith('/')
    begins = AVATAR_DEFAULT_URL.startswith('/')
    if ends and begins:
        base_url = base_url[:-1]
    elif not ends and not begins:
        return '%s/%s' % (base_url, AVATAR_DEFAULT_URL)
    return '%s%s' % (base_url, AVATAR_DEFAULT_URL)

def get_default_avatar_non_registered_url():
    base_url = getattr(settings, 'MEDIA_URL', '')
    # Don't use base_url if the default avatar url starts with http:// of https://
    if AVATAR_DEFAULT_NON_REGISTERED_URL.startswith('http://') or AVATAR_DEFAULT_NON_REGISTERED_URL.startswith('https://'):
        return AVATAR_DEFAULT_NON_REGISTERED_URL
    # We'll be nice and make sure there are no duplicated forward slashes
    ends = base_url.endswith('/')
    begins = AVATAR_DEFAULT_NON_REGISTERED_URL.startswith('/')
    if ends and begins:
        base_url = base_url[:-1]
    elif not ends and not begins:
        return '%s/%s' % (base_url, AVATAR_DEFAULT_NON_REGISTERED_URL)
    return '%s%s' % (base_url, AVATAR_DEFAULT_NON_REGISTERED_URL)
    
    
def get_primary_avatar(user, size=AVATAR_DEFAULT_SIZE):
    if not isinstance(user, User):
        try:
            user = User.objects.get(email=user)
        except User.DoesNotExist:
            return None

    try:
        # Order by -primary first; this means if a primary=True avatar exists
        # it will be first, and then ordered by date uploaded, otherwise a
        # primary=False avatar will be first.  Exactly the fallback behavior we
        # want.
        from seahub.avatar.models import Avatar
        avatar = Avatar.objects.filter(emailuser=user.email, primary=1)[0]
    except IndexError:
        avatar = None
    if avatar:
        if not avatar.thumbnail_exists(size):
            avatar.create_thumbnail(size)
    return avatar

def get_avatar_file_storage():
    """Get avatar file storage, defaults to file system storage.
    """
    if not AVATAR_FILE_STORAGE:
        return default_storage
    else:
        dbs_options = {
            'table': 'avatar_uploaded',
            'base_url': '/image-view/',
            'name_column': 'filename',
            'data_column': 'data',
            'size_column': 'size',
            }
        return get_storage_class(AVATAR_FILE_STORAGE)(options=dbs_options)
