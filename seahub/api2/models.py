# Copyright (c) 2012-2016 Seafile Ltd.
import uuid
import hmac
import datetime
from hashlib import sha1

import operator
from functools import cmp_to_key

from django.db import models
from django.utils import timezone

from seahub.base.fields import LowerCaseCharField

DESKTOP_PLATFORMS = ('windows', 'linux', 'mac')
MOBILE_PLATFORMS = ('ios', 'android')


class TokenManager(models.Manager):

    def add_or_update(self, username, key=''):

        """Add or update user auth token.
        """
        try:
            token_obj = self.get(user=username)
        except Token.DoesNotExist:
            token_obj = self.model(user=username)

        if key is not None:
            token_obj.key = key
        else:
            token_obj.key = self.generate_key()

        token_obj.save(using=self._db)
        return token_obj


class Token(models.Model):
    """
    The default authorization token model.
    """
    key = models.CharField(max_length=40, primary_key=True)
    user = LowerCaseCharField(max_length=255, unique=True)
    created = models.DateTimeField(auto_now_add=True)

    objects = TokenManager()

    def save(self, *args, **kwargs):
        if not self.key:
            self.key = self.generate_key()
        return super(Token, self).save(*args, **kwargs)

    def generate_key(self):
        unique = str(uuid.uuid4())
        return hmac.new(unique.encode('utf-8'), digestmod=sha1).hexdigest()

    def __unicode__(self):
        return self.key

class TokenV2Manager(models.Manager):

    def get_devices(self, platform, start, end):
        devices = super(TokenV2Manager, self).filter(wiped_at=None)
        if platform == 'desktop':
            devices = devices.filter(platform__in=DESKTOP_PLATFORMS).order_by('-last_accessed')[start : end]
        elif platform == 'mobile':
            devices = devices.filter(platform__in=MOBILE_PLATFORMS).order_by('-last_accessed')[start : end]
        else:
            devices = devices.order_by('-last_accessed')[start : end]

        return devices

    def get_total_devices_count(self):
        return super(TokenV2Manager, self).filter(wiped_at=None).count()

    def get_current_connected_devices_count(self):
        # get number of devices last one hour accessed
        devices = super(TokenV2Manager, self).filter(wiped_at=None)
        date_from = datetime.datetime.now() - datetime.timedelta(hours=1)

        # greater than or equal to.
        return devices.filter(last_accessed__gte=date_from).count()

    def get_user_devices(self, username):
        '''List user devices, most recently used first'''
        devices = super(TokenV2Manager, self).filter(user=username).filter(wiped_at=None)
        platform_priorities = {
            'windows': 0,
            'linux': 0,
            'mac': 0,
            'android': 1,
            'ios': 1,
        }

        def sort_devices(d1, d2):
            '''Desktop clients are listed before mobile clients. Devices of
            the same category are listed by most recently used first

            '''
            if operator.eq(platform_priorities[d1.platform], platform_priorities[d2.platform]):
                return operator.lt(d2.last_accessed, d1.last_accessed)
            else:
                return operator.lt(platform_priorities[d1.platform], platform_priorities[d2.platform])

        return [ d.as_dict() for d in sorted(devices, key=cmp_to_key(sort_devices)) ]

    def _get_token_by_user_device(self, username, platform, device_id):
        try:
            return super(TokenV2Manager, self).get(user=username,
                                                   platform=platform,
                                                   device_id=device_id)
        except TokenV2.DoesNotExist:
            return None

    def get_or_create_token(self, username, platform, device_id, device_name,
                            client_version, platform_version, last_login_ip):

        token = self._get_token_by_user_device(username, platform, device_id)
        if token and token.wiped_at:
            token.delete()
            token = None

        if token:
            if token.client_version != client_version or token.platform_version != platform_version \
                or token.device_name != device_name:

                token.client_version = client_version
                token.platform_version = platform_version
                token.device_name = device_name
                token.save()

            return token

        token = TokenV2(user=username,
                        platform=platform,
                        device_id=device_id,
                        device_name=device_name,
                        client_version=client_version,
                        platform_version=platform_version,
                        last_login_ip=last_login_ip)
        token.save()
        return token


    def delete_device_token(self, username, platform, device_id):
        super(TokenV2Manager, self).filter(user=username, platform=platform, device_id=device_id).delete()

    def mark_device_to_be_remote_wiped(self, username, platform, device_id):
        token = self._get_token_by_user_device(username, platform, device_id)
        if not token:
            return
        token.wiped_at = datetime.datetime.now()
        token.save()

class TokenV2(models.Model):
    """
    Device specific token
    """

    key = models.CharField(max_length=40, primary_key=True)

    user = LowerCaseCharField(max_length=255)

    # windows/linux/mac/ios/android
    platform = LowerCaseCharField(max_length=32)

    # ccnet id, android secure id, etc.
    device_id = models.CharField(max_length=40)

    # lin-laptop
    device_name = models.CharField(max_length=40)

    # platform version
    platform_version = LowerCaseCharField(max_length=16)

    # seafile client/app version
    client_version = LowerCaseCharField(max_length=16)

    # most recent activity
    last_accessed = models.DateTimeField(auto_now=True)

    last_login_ip = models.GenericIPAddressField(null=True, default=None)

    created_at = models.DateTimeField(default=timezone.now)
    wiped_at = models.DateTimeField(null=True)

    objects = TokenV2Manager()

    class Meta:
        unique_together = (('user', 'platform', 'device_id'),)

    def save(self, *args, **kwargs):
        if not self.key:
            self.key = self.generate_key()
        return super(TokenV2, self).save(*args, **kwargs)

    def generate_key(self):
        unique = str(uuid.uuid4())
        return hmac.new(unique.encode('utf-8'), digestmod=sha1).hexdigest()

    def __unicode__(self):
        return "TokenV2{user=%(user)s,device=%(device_name)s}" % \
            dict(user=self.user, device_name=self.device_name)

    def is_desktop_client(self):
        return str(self.platform) in ('windows', 'linux', 'mac')

    def as_dict(self):
        return dict(key=self.key,
                    user=self.user,
                    platform=self.platform,
                    device_id=self.device_id,
                    device_name=self.device_name,
                    client_version=self.client_version,
                    platform_version=self.platform_version,
                    last_accessed=self.last_accessed,
                    last_login_ip=self.last_login_ip,
                    wiped_at=self.wiped_at)
