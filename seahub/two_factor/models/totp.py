# Copyright (c) 2012-2016 Seafile Ltd.
import logging
from binascii import unhexlify
import time

from django.conf import settings
from django.db import models

from seahub.two_factor.oath import TOTP
from seahub.two_factor.utils import random_hex, hex_validator

from .base import Device

def default_key():
    return random_hex(20)


def key_validator(value):
    return hex_validator()(value)


class TOTPDevice(Device):
    """
    A generic TOTP :class:`~seahub.django_otp.models.Device`. The model fields mostly
    correspond to the arguments to :func:`seahub.two_factor.oath.totp`. They all have
    sensible defaults, including the key, which is randomly generated.

    .. attribute:: key

        *CharField*: A hex-encoded secret key of up to 40 bytes. (Default: 20
        random bytes)

    .. attribute:: step

        *PositiveSmallIntegerField*: The time step in seconds. (Default: 30)

    .. attribute:: t0

        *BigIntegerField*: The Unix time at which to begin counting steps.
        (Default: 0)

    .. attribute:: digits

        *PositiveSmallIntegerField*: The number of digits to expect in a token
        (6 or 8).  (Default: 6)

    .. attribute:: tolerance

        *PositiveSmallIntegerField*: The number of time steps in the past or
        future to allow. For example, if this is 1, we'll accept any of three
        tokens: the current one, the previous one, and the next one. (Default:
        1)

    .. attribute:: drift

        *SmallIntegerField*: The number of time steps the prover is known to
        deviate from our clock.  If :setting:`OTP_TOTP_SYNC` is ``True``, we'll
        update this any time we match a token that is not the current one.
        (Default: 0)

    .. attribute:: last_t

        *BigIntegerField*: The time step of the last verified token. To avoid
        verifying the same token twice, this will be updated on each successful
        verification. Only tokens at a higher time step will be verified
        subsequently. (Default: -1)

    """
    key = models.CharField(max_length=80, validators=[key_validator], default=default_key, help_text="A hex-encoded secret key of up to 40 bytes.")
    step = models.PositiveSmallIntegerField(default=30, help_text="The time step in seconds.")
    t0 = models.BigIntegerField(default=0, help_text="The Unix time at which to begin counting steps.")
    digits = models.PositiveSmallIntegerField(choices=[(6, 6), (8, 8)], default=6, help_text="The number of digits to expect in a token.")
    tolerance = models.PositiveSmallIntegerField(default=1, help_text="The number of time steps in the past or future to allow.")
    drift = models.SmallIntegerField(default=0, help_text="The number of time steps the prover is known to deviate from our clock.")
    last_t = models.BigIntegerField(default=-1, help_text="The t value of the latest verified token. The next token must be at a higher time step.")

    class Meta(Device.Meta):
        verbose_name = "TOTP device"

    @property
    def bin_key(self):
        """
        The secret key as a binary string.
        """
        return unhexlify(self.key.encode())

    def verify_token(self, token):
        OTP_TOTP_SYNC = getattr(settings, 'OTP_TOTP_SYNC', True)

        try:
            token = int(token)
        except Exception:
            verified = False
        else:
            key = self.bin_key

            totp = TOTP(key, self.step, self.t0, self.digits)
            totp.time = time.time()

            for offset in range(-self.tolerance, self.tolerance + 1):
                totp.drift = self.drift + offset
                if token == totp.token():
                    if self.last_t < totp.t():
                        self.last_t = totp.t()
                        if (offset != 0) and OTP_TOTP_SYNC:
                            self.drift += offset
                        self.save()
                        verified = True
                        break
                    else:
                        logging.warning('Warning! Suspected token replay!')
                        logging.warning('user input token = %s, totp.token = %s, self.last_t = %s, totp.t = %s'
                                     % (token, totp.token(), self.last_t, totp.t()))
            else:
                logging.info('user input invalid token = %s, totp.token = %s, self.last_t = %s, totp.t = %s'
                             % (token, totp.token(), self.last_t, totp.t()))
                verified = False

        return verified
