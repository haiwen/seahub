# Copyright (c) 2012-2016 Seafile Ltd.


from base64 import b32encode
from os import urandom

from django.db import models

from seahub.two_factor.models import Device


class StaticDevice(Device):
    """
    A static :class:`~seahub.django_otp.models.Device` simply consists of random
    tokens shared by the database and the user. These are frequently used as
    emergency tokens in case a user's normal device is lost or unavailable.
    They can be consumed in any order; each token will be removed from the
    database as soon as it is used.

    This model has no fields of its own, but serves as a container for
    :class:`StaticToken` objects.

    .. attribute:: token_set

        The RelatedManager for our tokens.
    """

    @staticmethod
    def get_or_create(username):
        try:
            device = StaticDevice.objects.get(user=username)
        except StaticDevice.DoesNotExist:
            device = StaticDevice(user=username)
            device.save()
        return device

    def verify_token(self, token):
        try:
            match = next(self.token_set.filter(token=token).iterator())
            match.delete()
        except StopIteration:
            match = None

        return match is not None

    def generate_tokens(self, number_of_tokens=10):
        for _ in range(number_of_tokens):
            self.token_set.create(token=StaticToken.random_token())


class StaticToken(models.Model):
    """
    A single token belonging to a :class:`StaticDevice`.

    .. attribute:: device

        *ForeignKey*: A foreign key to :class:`StaticDevice`.

    .. attribute:: token

        *CharField*: A random string up to 16 characters.
    """
    device = models.ForeignKey(StaticDevice, on_delete=models.CASCADE, related_name='token_set')
    token = models.CharField(max_length=16, db_index=True)

    @staticmethod
    def random_token():
        """
        Returns a new random string that can be used as a static token.

        :rtype: str
        """
        return b32encode(urandom(5)).lower().decode()
