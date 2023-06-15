# Copyright (c) 2012-2016 Seafile Ltd.
import datetime
import hashlib
import urllib.request, urllib.parse, urllib.error
import logging

# import auth
from django.core.exceptions import ImproperlyConfigured
from django.db import models
from django.db.models.manager import EmptyManager
from django.contrib.contenttypes.models import ContentType
from django.utils.encoding import smart_str
from django.utils.translation import gettext_lazy as _
from django.conf import settings

logger = logging.getLogger(__name__)
UNUSABLE_PASSWORD = '!'  # This will never be a valid hash


def get_hexdigest(algorithm, salt, raw_password):
    """
    Returns a string of the hexdigest of the given plaintext password and salt
    using the given algorithm ('md5', 'sha1' or 'crypt').
    """
    raw_password, salt = smart_str(raw_password).encode('utf-8'), smart_str(salt).encode('utf-8')
    if algorithm == 'crypt':
        try:
            import crypt
        except ImportError:
            raise ValueError('"crypt" password algorithm not supported in this environment')
        return crypt.crypt(raw_password, salt)

    if algorithm == 'md5':
        return hashlib.md5(salt + raw_password).hexdigest()
    elif algorithm == 'sha1':
        return hashlib.sha1(salt + raw_password).hexdigest()
    raise ValueError("Got unknown password algorithm type in password.")


def check_password(raw_password, enc_password):
    """
    Returns a boolean of whether the raw_password was correct. Handles
    encryption formats behind the scenes.
    """
    algo, salt, hsh = enc_password.split('$')
    return hsh == get_hexdigest(algo, salt, raw_password)


class SiteProfileNotAvailable(Exception):
    pass


class AnonymousUser(object):
    id = None
    username = ''
    is_staff = False
    is_active = False
    is_superuser = False
    _groups = EmptyManager(object)
    _user_permissions = EmptyManager(object)

    def __init__(self):
        pass

    def __unicode__(self):
        return 'AnonymousUser'

    def __str__(self):
        return str(self).encode('utf-8')

    def __eq__(self, other):
        return isinstance(other, self.__class__)

    def __ne__(self, other):
        return not self.__eq__(other)

    def __hash__(self):
        return 1  # instances always return the same hash value

    def save(self):
        raise NotImplementedError

    def delete(self):
        raise NotImplementedError

    def set_password(self, raw_password):
        raise NotImplementedError

    def check_password(self, raw_password):
        raise NotImplementedError

    def _get_groups(self):
        return self._groups

    groups = property(_get_groups)

    def _get_user_permissions(self):
        return self._user_permissions

    user_permissions = property(_get_user_permissions)

    def get_group_permissions(self, obj=None):
        return set()

    def get_all_permissions(self, obj=None):
        return _user_get_all_permissions(self, obj=obj)

    def has_perm(self, perm, obj=None):
        return _user_has_perm(self, perm, obj=obj)

    def has_perms(self, perm_list, obj=None):
        for perm in perm_list:
            if not self.has_perm(perm, obj):
                return False
        return True

    def has_module_perms(self, module):
        return _user_has_module_perms(self, module)

    def get_and_delete_messages(self):
        return []

    @property
    def is_anonymous(self):
        return True

    @property
    def is_authenticated(self):
        return False


class SocialAuthUserManager(models.Manager):
    def add(self, username, provider, uid, extra_data=''):
        try:
            social_auth_user = self.model(username=username, provider=provider, uid=uid, extra_data=extra_data)
            social_auth_user.save()
            return social_auth_user
        except Exception as e:
            logger.error(e)
            return None

    def get_by_provider_and_uid(self, provider, uid):
        try:
            social_auth_user = self.get(provider=provider, uid=uid)
            return social_auth_user
        except self.model.DoesNotExist:
            return None

    def delete_by_username_and_provider(self, username, provider):
        self.filter(username=username, provider=provider).delete()


class SocialAuthUser(models.Model):
    username = models.CharField(max_length=255, db_index=True)
    provider = models.CharField(max_length=32)
    uid = models.CharField(max_length=255)
    extra_data = models.TextField()
    objects = SocialAuthUserManager()

    class Meta:
        """Meta data"""
        app_label = "base"
        unique_together = ('provider', 'uid')
        db_table = 'social_auth_usersocialauth'


class ExternalDepartmentManager(models.Manager):
    def get_by_provider_and_outer_id(self, provider, outer_id):
        return self.filter(provider=provider, outer_id=outer_id).first()

    def delete_by_group_id(self, group_id):
        self.filter(group_id=group_id).delete()


class ExternalDepartment(models.Model):
    group_id = models.IntegerField(unique=True)
    provider = models.CharField(max_length=32)
    outer_id = models.BigIntegerField()

    objects = ExternalDepartmentManager()

    class Meta:
        """Meta data"""
        app_label = "base"
        unique_together = ('provider', 'outer_id')
        db_table = 'external_department'


# # handle signals
from django.dispatch import receiver
from registration.signals import user_deleted


@receiver(user_deleted)
def user_deleted_cb(sender, **kwargs):
    username = kwargs['username']
    SocialAuthUser.objects.filter(username=username).delete()
    # if user is institution admin, delete recored in InstitutionAdmin
    if getattr(settings, 'MULTI_INSTITUTION', False):
        from seahub.institutions.models import InstitutionAdmin
        InstitutionAdmin.objects.filter(user=username).delete()
