from django.core.cache import cache

from models import Profile
from settings import NICKNAME_CACHE_PREFIX, NICKNAME_CACHE_TIMEOUT
from seahub.shortcuts import get_first_object_or_none
from seahub.utils import normalize_cache_key

def refresh_cache(username):
    """
    Function to be called when change user nickname.
    """
    profile = get_first_object_or_none(Profile.objects.filter(user=username))
    nickname = profile.nickname if profile else username.split('@')[0]

    key = normalize_cache_key(username, NICKNAME_CACHE_PREFIX)
    cache.set(key, nickname, NICKNAME_CACHE_TIMEOUT)
    
