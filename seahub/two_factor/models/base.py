# Copyright (c) 2012-2016 Seafile Ltd.

import logging

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from seahub.base.fields import LowerCaseCharField
from seahub.two_factor.utils import hex_validator

logger = logging.getLogger(__name__)


def get_available_phone_methods():
    methods = []
    if getattr(settings, 'TWO_FACTOR_CALL_GATEWAY', None):
        methods.append(('call', _('Phone Call')))
    if getattr(settings, 'TWO_FACTOR_SMS_GATEWAY', None):
        methods.append(('sms', _('Text Message')))
    return methods

def get_available_methods():
    methods = [('generator', _('Token generator'))]
    methods.extend(get_available_phone_methods())
    return methods

def key_validator(*args, **kwargs):
    """Wraps hex_validator generator, to keep makemigrations happy."""
    return hex_validator()(*args, **kwargs)


class DeviceManager(models.Manager):

    def device_for_user(self, username):
        try:
            return self.model.objects.get(user=username)
        except self.model.DoesNotExist:
            return None


class Device(models.Model):
    user = LowerCaseCharField(max_length=255, help_text="The user that this device belongs to.", unique=True)
    name = models.CharField(max_length=64, help_text="The human-readable name of this device.")
    confirmed = models.BooleanField(default=True, help_text="Is this device ready for use?")

    objects = DeviceManager()

    class Meta(object):
        abstract = True

    def __str__(self):
        return self.__unicode__().encode('utf-8')

    def __unicode__(self):
        return "{0} ({1})".format(self.__class__.__name__, self.user)

    @property
    def persistent_id(self):
        return '{0}/{1}'.format(self.import_path, self.id)

    @property
    def import_path(self):
        return '{0}.{1}'.format(self.__module__, self.__class__.__name__)

    @classmethod
    def from_persistent_id(cls, path):
        """
        Loads a device from its persistent id::

            device == Device.from_persistent_id(device.persistent_id)
        """
        from seahub.two_factor.utils import import_class

        try:
            device_type, device_id = path.rsplit('/', 1)

            device_cls = import_class(device_type)
            device = device_cls.objects.get(id=device_id)
        except Exception:
            device = None

        return device

    def is_interactive(self):
        """
        Returns ``True`` if this is an interactive device. The default
        implementation returns ``True`` if
        :meth:`~django_otp.models.Device.generate_challenge` has been
        overridden, but subclasses are welcome to provide smarter
        implementations.

        :rtype: bool
        """
        return not hasattr(self.generate_challenge, 'stub')

    def generate_challenge(self):
        """
        Generates a challenge value that the user will need to produce a token.
        This method is permitted to have side effects, such as transmitting
        information to the user through some other channel (email or SMS,
        perhaps). And, of course, some devices may need to commit the
        challenge to the databse.

        :returns: A message to the user. This should be a string that fits
            comfortably in the template ``'OTP Challenge: {0}'``. This may
            return ``None`` if this device is not interactive.
        :rtype: string or ``None``

        :raises: Any :exc:`~exceptions.Exception` is permitted. Callers should
            trap ``Exception`` and report it to the user.
        """
        return None
    generate_challenge.stub = True

    def verify_token(self, token): # pylint: disable=unused-argument
        """
        Verifies a token. As a rule, the token should no longer be valid if
        this returns ``True``.

        :param string token: The OTP token provided by the user.
        :rtype: bool
        """
        return False
