# Copyright (c) 2012-2016 Seafile Ltd.


from binascii import unhexlify
import logging

from django.db import models
from django.utils.translation import gettext_lazy as _

from .base import Device, key_validator
from seahub.two_factor.gateways import make_call, send_sms
from seahub.two_factor.utils import random_hex
# from phonenumber_field.modelfields import PhoneNumberField

logger = logging.getLogger(__name__)

PHONE_METHODS = (
    ('call', _('Phone Call')),
    ('sms', _('Text Message')),
)


class PhoneDevice(Device):
    """
    Model with phone number and token seed linked to a user.
    """
    number = models.CharField(max_length=40) # todo
    key = models.CharField(max_length=40,
                           validators=[key_validator],
                           default=random_hex,
                           help_text="Hex-encoded secret key")
    method = models.CharField(max_length=4, choices=PHONE_METHODS,
                              verbose_name=_('Method'))

    def __repr__(self):
        return '<PhoneDevice(number={!r}, method={!r}>'.format(
            self.number,
            self.method,
        )

    def __eq__(self, other):
        if not isinstance(other, PhoneDevice):
            return False
        return self.number == other.number \
            and self.method == other.method \
            and self.key == other.key

    @property
    def bin_key(self):
        return unhexlify(self.key.encode())

    def verify_token(self, token):
        # local import to avoid circular import
        from seahub.two_factor.oath import totp
        from seahub.two_factor.utils import totp_digits

        try:
            token = int(token)
        except ValueError:
            return False

        for drift in range(-5, 1):
            if totp(self.bin_key, drift=drift, digits=totp_digits()) == token:
                return True
        return False

    def generate_challenge(self):
        # local import to avoid circular import
        from seahub.two_factor.oath import totp
        from seahub.two_factor.utils import totp_digits

        """
        Sends the current TOTP token to `self.number` using `self.method`.
        """
        no_digits = totp_digits()
        token = str(totp(self.bin_key, digits=no_digits)).zfill(no_digits)
        if self.method == 'call':
            make_call(device=self, token=token)
        else:
            send_sms(device=self, token=token)
