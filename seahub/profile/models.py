from django.db import models
from django.core.cache import cache
from django.dispatch import receiver

from seahub.base.fields import LowerCaseCharField
from seahub.profile.settings import EMAIL_ID_CACHE_PREFIX, EMAIL_ID_CACHE_TIMEOUT
from registration.signals import user_registered

class ProfileManager(models.Manager):
    def add_profile(self, username, nickname, intro):
        """
        """
        profile = self.model(user=username, nickname=nickname, intro=intro)
        profile.save(using=self._db)
        return profile

    def add_or_update(self, username, nickname, intro):
        try:
            profile = self.get(user=username)
            profile.nickname = nickname
            profile.intro = intro
        except Profile.DoesNotExist:
            profile = self.model(user=username, nickname=nickname, intro=intro)
        profile.save(using=self._db)
        return profile
        
    def get_profile_by_user(self, username):
        """Get a user's profile.
        """
        try:
            return super(ProfileManager, self).get(user=username)
        except Profile.DoesNotExist:
            return None
      
    def delete_profile_by_user(self, username):
        self.filter(user=username).delete()
        
class Profile(models.Model):
    user = models.EmailField(unique=True)
    nickname = models.CharField(max_length=64, blank=True)
    intro = models.TextField(max_length=256, blank=True)
    objects = ProfileManager()

class DetailedProfileManager(models.Manager):
    def add_detailed_profile(self, username, department, telephone):
        d_profile = self.model(user=username, department=department,
                               telephone=telephone)
        d_profile.save(using=self._db)
        return d_profile

    def add_or_update(self, username, department, telephone):
        try:
            d_profile = self.get(user=username)
            d_profile.department = department
            d_profile.telephone = telephone
        except DetailedProfile.DoesNotExist:
            d_profile = self.model(user=username, department=department,
                                   telephone=telephone)
        d_profile.save(using=self._db)
        return d_profile
            
    def get_detailed_profile_by_user(self, username):
        """Get a user's profile.
        """
        try:
            return super(DetailedProfileManager, self).get(user=username)
        except DetailedProfile.DoesNotExist:
            return None
    
class DetailedProfile(models.Model):
    user = LowerCaseCharField(max_length=255, db_index=True)
    department = models.CharField(max_length=512)
    telephone = models.CharField(max_length=100)
    objects = DetailedProfileManager()

########## signal handler    
@receiver(user_registered)
def clean_email_id_cache(sender, **kwargs):
    from seahub.utils import normalize_cache_key
    
    user = kwargs['user']
    key = normalize_cache_key(user.email, EMAIL_ID_CACHE_PREFIX)
    cache.set(key, user.id, EMAIL_ID_CACHE_TIMEOUT)
