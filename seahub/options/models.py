# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-

from django.db import models

from seahub.base.fields import LowerCaseCharField
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

KEY_FORCE_PASSWD_CHANGE = "force_passwd_change"
VAL_FORCE_PASSWD_CHANGE = "1"

KEY_USER_LOGGED_IN = "user_logged_in"
VAL_USER_LOGGED_IN = "1"

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

    def unset_user_option(self, username, k):
        """Remove user's option.
        """
        super(UserOptionsManager, self).filter(email=username, option_key=k).delete()

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
        """Client crypto is deprecated, always return ``True``.
        """
        return True

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
        rst = super(UserOptionsManager, self).filter(
            email=username, option_key=KEY_USER_GUIDE)
        rst_len = len(rst)
        if rst_len <= 0:
            # Assume ``user_guide`` is enabled if this optoin is not set.
            return True
        elif rst_len == 1:
            return bool(int(rst[0].option_val))
        else:
            for i in range(rst_len - 1):
                rst[i].delete()
            return bool(int(rst[rst_len - 1].option_val))

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
        user_options = super(UserOptionsManager, self).filter(
            email=username, option_key=KEY_DEFAULT_REPO)

        if len(user_options) == 0:
            return None
        elif len(user_options) == 1:
            return user_options[0].option_val
        else:
            for o in user_options[1: len(user_options)]:
                o.delete()

            return user_options[0].option_val

    def passwd_change_required(self, username):
        """Check whether user need to change password.
        """
        try:
            r = super(UserOptionsManager, self).get(
                email=username, option_key=KEY_FORCE_PASSWD_CHANGE)
            return r.option_val == VAL_FORCE_PASSWD_CHANGE
        except UserOptions.DoesNotExist:
            return False

    def set_force_passwd_change(self, username):
        return self.set_user_option(username, KEY_FORCE_PASSWD_CHANGE,
                                    VAL_FORCE_PASSWD_CHANGE)

    def unset_force_passwd_change(self, username):
        return self.unset_user_option(username, KEY_FORCE_PASSWD_CHANGE)

    def set_user_logged_in(self, username):
        return self.set_user_option(username, KEY_USER_LOGGED_IN,
                                    VAL_USER_LOGGED_IN)

    def is_user_logged_in(self, username):
        """Check whether user has logged in successfully at least once.
        """
        try:
            r = super(UserOptionsManager, self).get(
                email=username, option_key=KEY_USER_LOGGED_IN)
            return r.option_val == VAL_USER_LOGGED_IN
        except UserOptions.DoesNotExist:
            return False


class UserOptions(models.Model):
    email = LowerCaseCharField(max_length=255, db_index=True)
    option_key = models.CharField(max_length=50)
    option_val = models.CharField(max_length=50)

    objects = UserOptionsManager()
