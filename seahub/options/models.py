# Copyright (c) 2012-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
from datetime import datetime
import logging

from django.db import models

from seahub.base.fields import LowerCaseCharField
from seahub.utils import is_pro_version

# Get an instance of a logger
logger = logging.getLogger(__name__)

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

KEY_FORCE_2FA = "force_2fa"
VAL_FORCE_2FA = "1"

KEY_USER_LOGGED_IN = "user_logged_in"
VAL_USER_LOGGED_IN = "1"

KEY_DEFAULT_REPO = "default_repo"
KEY_WEBDAV_SECRET = "webdav_secret"
KEY_FILE_UPDATES_EMAIL_INTERVAL = "file_updates_email_interval"
KEY_FILE_UPDATES_LAST_EMAILED_TIME = "file_updates_last_emailed_time"
KEY_COLLABORATE_EMAIL_INTERVAL = 'collaborate_email_interval'
KEY_COLLABORATE_LAST_EMAILED_TIME = 'collaborate_last_emailed_time'

DEFAULT_COLLABORATE_EMAIL_INTERVAL = 3600


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

    def get_user_option(self, username, k):
        user_options = super(UserOptionsManager, self).filter(
            email=username, option_key=k)

        if len(user_options) == 0:
            return None
        elif len(user_options) == 1:
            return user_options[0].option_val
        else:
            for o in user_options[1: len(user_options)]:
                o.delete()

            return user_options[0].option_val

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
        return self.get_user_option(username, KEY_DEFAULT_REPO)

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

    def set_force_2fa(self, username):
        return self.set_user_option(username, KEY_FORCE_2FA, VAL_FORCE_2FA)

    def unset_force_2fa(self, username):
        return self.unset_user_option(username, KEY_FORCE_2FA)

    def is_force_2fa(self, username):
        r = super(UserOptionsManager, self).filter(email=username,
                                                   option_key=KEY_FORCE_2FA)
        return True if len(r) > 0 else False

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

    def set_webdav_secret(self, username, secret):
        return self.set_user_option(username, KEY_WEBDAV_SECRET,
                                    secret)

    def unset_webdav_secret(self, username):
        return self.unset_user_option(username, KEY_WEBDAV_SECRET)

    def get_webdav_secret(self, username):
        try:
            r = super(UserOptionsManager, self).get(
                email=username, option_key=KEY_WEBDAV_SECRET
            )
            return r.option_val
        except UserOptions.DoesNotExist:
            return None

    def get_webdav_decoded_secret(self, username):
        from seahub.utils.hasher import AESPasswordHasher

        secret = UserOptions.objects.get_webdav_secret(username)
        if secret and secret.startswith(AESPasswordHasher.algorithm):
            aes = AESPasswordHasher()
            decoded = aes.decode(secret)
        else:
            decoded = None
        return decoded

    def set_file_updates_email_interval(self, username, seconds):
        return self.set_user_option(username, KEY_FILE_UPDATES_EMAIL_INTERVAL,
                                    str(seconds))

    def get_file_updates_email_interval(self, username):
        val = self.get_user_option(username, KEY_FILE_UPDATES_EMAIL_INTERVAL)
        if not val:
            return None
        try:
            return int(val)
        except ValueError:
            logger.error('Failed to convert string %s to int' % val)
            return None

    def unset_file_updates_email_interval(self, username):
        return self.unset_user_option(username, KEY_FILE_UPDATES_EMAIL_INTERVAL)

    def set_file_updates_last_emailed_time(self, username, time_dt):
        return self.set_user_option(
            username, KEY_FILE_UPDATES_LAST_EMAILED_TIME,
            time_dt.strftime("%Y-%m-%d %H:%M:%S"))

    def get_file_updates_last_emailed_time(self, username):
        val = self.get_user_option(username, KEY_FILE_UPDATES_LAST_EMAILED_TIME)
        if not val:
            return None

        try:
            return datetime.strptime(val, "%Y-%m-%d %H:%M:%S")
        except Exception:
            logger.error('Failed to convert string %s to datetime obj' % val)
            return None

    def unset_file_updates_last_emailed_time(self, username):
        return self.unset_user_option(username, KEY_FILE_UPDATES_LAST_EMAILED_TIME)

    def set_collaborate_email_interval(self, username, seconds):
        return self.set_user_option(username, KEY_COLLABORATE_EMAIL_INTERVAL,
                                    str(seconds))

    def get_collaborate_email_interval(self, username):
        val = self.get_user_option(username, KEY_COLLABORATE_EMAIL_INTERVAL)
        if not val:
            return None
        try:
            return int(val)
        except ValueError:
            logger.error('Failed to convert string %s to int' % val)
            return None

    def unset_collaborate_email_interval(self, username):
        return self.unset_user_option(username, KEY_COLLABORATE_EMAIL_INTERVAL)

    def set_collaborate_last_emailed_time(self, username, time_dt):
        return self.set_user_option(
            username, KEY_COLLABORATE_LAST_EMAILED_TIME,
            time_dt.strftime("%Y-%m-%d %H:%M:%S"))

    def get_collaborate_last_emailed_time(self, username):
        val = self.get_user_option(username, KEY_COLLABORATE_LAST_EMAILED_TIME)
        if not val:
            return None

        try:
            return datetime.strptime(val, "%Y-%m-%d %H:%M:%S")
        except Exception:
            logger.error('Failed to convert string %s to datetime obj' % val)
            return None

    def unset_collaborate_last_emailed_time(self, username):
        return self.unset_user_option(username, KEY_COLLABORATE_LAST_EMAILED_TIME)


class UserOptions(models.Model):
    email = LowerCaseCharField(max_length=255, db_index=True)
    option_key = models.CharField(max_length=50, db_index=True)
    option_val = models.CharField(max_length=50)

    objects = UserOptionsManager()
