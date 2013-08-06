from django.db import models
from django.core.cache import cache
from django.dispatch import receiver

from settings import EMAIL_ID_CACHE_PREFIX, EMAIL_ID_CACHE_TIMEOUT
from registration.signals import user_registered

class Profile(models.Model):
    user = models.EmailField(unique=True)
    nickname = models.CharField(max_length=64, blank=True)
    intro = models.TextField(max_length=256, blank=True)


@receiver(user_registered)
def clean_email_id_cache(sender, **kwargs):
    from seahub.utils import normalize_cache_key
    
    user = kwargs['user']
    key = normalize_cache_key(user.email, EMAIL_ID_CACHE_PREFIX)
    cache.set(key, user.id, EMAIL_ID_CACHE_TIMEOUT)
