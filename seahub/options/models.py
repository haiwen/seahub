# -*- coding: utf-8 -*-

from django.db import models

from seahub.base.fields import LowerCaseCharField

KEY_SERVER_CRYPTO = "server_crypto"
VAL_SERVER_CRYPTO_ENABLED = "1"
VAL_SERVER_CRYPTO_DISABLED = "0"

class CryptoOptionNotSetError(Exception):
    pass

class UserOptionsManager(models.Manager):
    def enable_server_crypto(self, username):
        """
        
        Arguments:
        - `username`:
        """
        try:
            user_option = super(UserOptionsManager, self).get(
                email=username, option_key=KEY_SERVER_CRYPTO)
        except UserOptions.DoesNotExist:
            user_option = self.model(email=username,
                                     option_key=KEY_SERVER_CRYPTO,
                                     option_val=VAL_SERVER_CRYPTO_ENABLED)
        user_option.option_val = VAL_SERVER_CRYPTO_ENABLED
        user_option.save(using=self._db)

        return user_option
        
    def disable_server_crypto(self, username):
        """
        
        Arguments:
        - `username`:
        """
        try:
            user_option = super(UserOptionsManager, self).get(
                email=username, option_key=KEY_SERVER_CRYPTO)
        except UserOptions.DoesNotExist:
            user_option = self.model(email=username,
                                     option_key=KEY_SERVER_CRYPTO,
                                     option_val=VAL_SERVER_CRYPTO_DISABLED)
        user_option.option_val = VAL_SERVER_CRYPTO_DISABLED
        user_option.save(using=self._db)

        return user_option

    def is_server_crypto(self, username):
        """Check whether user is set server crypto. Returns ``True`` if
        server crypto is enabled, otherwise ``False``.

        Raise ``CryptoOptionNotSetError`` if this option is not set.
        
        Arguments:
        - `username`:
        """
        try:
            user_option = super(UserOptionsManager, self).get(
                email=username, option_key=KEY_SERVER_CRYPTO)
            return bool(int(user_option.option_val))
        except UserOptions.DoesNotExist:
            raise CryptoOptionNotSetError

class UserOptions(models.Model):
    email = LowerCaseCharField(max_length=255, db_index=True)
    option_key = models.CharField(max_length=50)
    option_val = models.CharField(max_length=50)

    objects = UserOptionsManager()

