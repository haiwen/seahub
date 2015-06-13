# -*- coding: utf-8 -*-

from django.db import models

from seahub.base.fields import LowerCaseCharField
from seahub.settings import FORCE_SERVER_CRYPTO
from seahub.utils import is_pro_version

KEY_SERVER_CRYPTO = "server_crypto"
VAL_SERVER_CRYPTO_ENABLED = "1"
VAL_SERVER_CRYPTO_DISABLED = "0"

KEY_USER_GUIDE = "user_guide"
VAL_USER_GUIDE_ON = "1"
VAL_USER_GUIDE_OFF = "0"

KEY_SUB_LIB = "sub_lib"
VAL_SUB_LIB_ENABLED = "1"
VAL_SUB_LIB_DISABLED = "0"

KEY_DEFAULT_REPO = "default_repo"

class CryptoOptionNotSetError(Exception):
    pass

class UserOptionsManager(models.Manager):
    def set_user_option(self, username, k, v):
        """
        
        Arguments:
        - `username`:
        - `k`:
        - `v`:
        """
        try:
            user_option = super(UserOptionsManager, self).get(email=username,
                                                              option_key=k)
            user_option.option_val = v            
        except UserOptions.DoesNotExist:
            user_option = self.model(email=username, option_key=k,
                                     option_val=v)
        user_option.save(using=self._db)

        return user_option

    def enable_server_crypto(self, username):
        """
        
        Arguments:
        - `username`:
        """
        return self.set_user_option(username, KEY_SERVER_CRYPTO,
                                    VAL_SERVER_CRYPTO_ENABLED)
        
    def disable_server_crypto(self, username):
        """
        
        Arguments:
        - `username`:
        """
        return self.set_user_option(username, KEY_SERVER_CRYPTO,
                                    VAL_SERVER_CRYPTO_DISABLED)

    def is_server_crypto(self, username):
        """Check whether user is set server crypto. Returns ``True`` if
        server crypto is enabled, otherwise ``False``.

        Raise ``CryptoOptionNotSetError`` if this option is not set.

        NOTE: Always return ``True`` if ``FORCE_SERVER_CRYPTO`` is set to
        ``True``.

        Arguments:
        - `username`:
        """
        if FORCE_SERVER_CRYPTO is True:
            return True

        try:
            user_option = super(UserOptionsManager, self).get(
                email=username, option_key=KEY_SERVER_CRYPTO)
            return bool(int(user_option.option_val))
        except UserOptions.DoesNotExist:
            raise CryptoOptionNotSetError

    def enable_user_guide(self, username):
        """
        
        Arguments:
        - `self`:
        - `username`:
        """
        return self.set_user_option(username, KEY_USER_GUIDE,
                                    VAL_USER_GUIDE_ON)

    def disable_user_guide(self, username):
        """
        
        Arguments:
        - `self`:
        - `username`:
        """
        return self.set_user_option(username, KEY_USER_GUIDE,
                                    VAL_USER_GUIDE_OFF)

    def is_user_guide_enabled(self, username):
        """Return ``True`` if user need guide, otherwise ``False``.
        
        Arguments:
        - `self`:
        - `username`:
        """
        try:
            user_option = super(UserOptionsManager, self).get(
                email=username, option_key=KEY_USER_GUIDE)
            return bool(int(user_option.option_val))
        except UserOptions.DoesNotExist:
            # Assume ``user_guide`` is enabled if this optoin is not set.
            return True        

    def enable_sub_lib(self, username):
        """
        
        Arguments:
        - `self`:
        - `username`:
        """
        return self.set_user_option(username, KEY_SUB_LIB,
                                    VAL_SUB_LIB_ENABLED)

    def disable_sub_lib(self, username):
        """
        
        Arguments:
        - `self`:
        - `username`:
        """
        return self.set_user_option(username, KEY_SUB_LIB,
                                    VAL_SUB_LIB_DISABLED)

    def is_sub_lib_enabled(self, username):
        """Return ``True`` if is not pro version AND sub lib enabled, otherwise ``False``.
        
        Arguments:
        - `self`:
        - `username`:
        """
        if is_pro_version():
            return False

        try:
            user_option = super(UserOptionsManager, self).get(
                email=username, option_key=KEY_SUB_LIB)
            return bool(int(user_option.option_val))
        except UserOptions.DoesNotExist:
            return False

    def set_default_repo(self, username, repo_id):
        """Set a user's default library.
        
        Arguments:
        - `self`:
        - `username`:
        - `repo_id`:
        """
        return self.set_user_option(username, KEY_DEFAULT_REPO, repo_id)

    def get_default_repo(self, username):
        """Get a user's default library.

        Returns repo_id if default library is found, otherwise ``None``.
        
        Arguments:
        - `self`:
        - `username`:
        """
        try:
            user_option = super(UserOptionsManager, self).get(
                email=username, option_key=KEY_DEFAULT_REPO)
            return user_option.option_val
        except UserOptions.DoesNotExist:
            return None
        
class UserOptions(models.Model):
    email = LowerCaseCharField(max_length=255, db_index=True)
    option_key = models.CharField(max_length=50)
    option_val = models.CharField(max_length=50)

    objects = UserOptionsManager()

