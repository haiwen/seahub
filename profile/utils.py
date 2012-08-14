from django.core.cache import cache

from models import Profile
from settings import NICKNAME_CACHE_PREFIX, NICKNAME_CACHE_TIMEOUT
from seahub.shortcuts import get_first_object_or_none

def refresh_cache(user):
    """
    Function to be called when change user nickname.
    """
    profile = get_first_object_or_none(Profile.objects.filter(user=user))
    nickname = profile.nickname if profile else value.split('@')[0]
    cache.set(NICKNAME_CACHE_PREFIX+user, nickname, NICKNAME_CACHE_TIMEOUT)
    
