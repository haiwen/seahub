from django.utils import timezone

from seahub.test_utils import BaseTestCase
from seahub.options.models import (
    UserOptions, KEY_USER_GUIDE,
    VAL_USER_GUIDE_ON, VAL_USER_GUIDE_OFF,
    KEY_DEFAULT_REPO, KEY_FORCE_2FA, VAL_FORCE_2FA,
    KEY_FILE_UPDATES_EMAIL_INTERVAL, KEY_FILE_UPDATES_LAST_EMAILED_TIME,
    KEY_WEBDAV_SECRET)


class UserOptionsManagerTest(BaseTestCase):
    def test_is_user_guide_enabled(self):
        assert UserOptions.objects.is_user_guide_enabled(self.user.email) is True

        UserOptions.objects.create(email=self.user.email,
                                   option_key=KEY_USER_GUIDE,
                                   option_val=VAL_USER_GUIDE_OFF)

        assert UserOptions.objects.is_user_guide_enabled(self.user.email) is False

    def test_is_user_guide_enabled_with_multiple_records(self):
        UserOptions.objects.create(email=self.user.email,
                                   option_key=KEY_USER_GUIDE,
                                   option_val=VAL_USER_GUIDE_OFF)
        UserOptions.objects.create(email=self.user.email,
                                   option_key=KEY_USER_GUIDE,
                                   option_val=VAL_USER_GUIDE_ON)

        assert len(UserOptions.objects.filter(email=self.user.email,
                                              option_key=KEY_USER_GUIDE)) == 2
        assert UserOptions.objects.is_user_guide_enabled(self.user.email) is True
        assert len(UserOptions.objects.filter(email=self.user.email,
                                              option_key=KEY_USER_GUIDE)) == 1

    def test_get_default_repo(self):
        assert len(UserOptions.objects.filter(email=self.user.email, option_key=KEY_DEFAULT_REPO)) == 0

        UserOptions.objects.create(email=self.user.email,
                                   option_key=KEY_DEFAULT_REPO,
                                   option_val=self.repo.id)

        assert len(UserOptions.objects.filter(email=self.user.email, option_key=KEY_DEFAULT_REPO)) == 1
        assert UserOptions.objects.get_default_repo(self.user.email) is not None

    def test_get_default_repo_with_multiple_records(self):
        assert len(UserOptions.objects.filter(email=self.user.email, option_key=KEY_DEFAULT_REPO)) == 0

        UserOptions.objects.create(email=self.user.email,
                                   option_key=KEY_DEFAULT_REPO,
                                   option_val=self.repo.id)

        UserOptions.objects.create(email=self.user.email,
                                   option_key=KEY_DEFAULT_REPO,
                                   option_val=self.repo.id)

        assert len(UserOptions.objects.filter(email=self.user.email, option_key=KEY_DEFAULT_REPO)) == 2
        assert UserOptions.objects.get_default_repo(self.user.email) is not None
        assert len(UserOptions.objects.filter(email=self.user.email, option_key=KEY_DEFAULT_REPO)) == 1

    def test_force_2fa(self):
        assert len(UserOptions.objects.filter(email=self.user.email,
                                              option_key=KEY_FORCE_2FA)) == 0
        assert UserOptions.objects.is_force_2fa(self.user.email) is False

        UserOptions.objects.set_force_2fa(self.user.email)

        assert len(UserOptions.objects.filter(email=self.user.email,
                                              option_key=KEY_FORCE_2FA)) == 1
        assert UserOptions.objects.is_force_2fa(self.user.email) is True

        UserOptions.objects.unset_force_2fa(self.user.email)

        assert len(UserOptions.objects.filter(email=self.user.email,
                                              option_key=KEY_FORCE_2FA)) == 0
        assert UserOptions.objects.is_force_2fa(self.user.email) is False

    def test_webdav_secret(self, ):
        assert len(UserOptions.objects.filter(email=self.user.email,
                                              option_key=KEY_WEBDAV_SECRET)) == 0

        assert UserOptions.objects.get_webdav_secret(self.user.email) is None

        UserOptions.objects.set_webdav_secret(self.user.email, '123456')
        assert UserOptions.objects.get_webdav_secret(self.user.email) == '123456'

        UserOptions.objects.unset_webdav_secret(self.user.email)
        assert UserOptions.objects.get_webdav_secret(self.user.email) is None

        assert len(UserOptions.objects.filter(email=self.user.email,
                                              option_key=KEY_WEBDAV_SECRET)) == 0

    def test_file_udpates_email_interval(self, ):
        assert len(UserOptions.objects.filter(
            email=self.user.email, option_key=KEY_FILE_UPDATES_EMAIL_INTERVAL)) == 0

        UserOptions.objects.set_file_updates_email_interval(
            self.user.email, 300)
        assert len(UserOptions.objects.filter(
            email=self.user.email, option_key=KEY_FILE_UPDATES_EMAIL_INTERVAL)) == 1

        interv = UserOptions.objects.get_file_updates_email_interval(self.user.email)
        assert interv == 300

        UserOptions.objects.unset_file_updates_email_interval(self.user.email)
        assert len(UserOptions.objects.filter(
            email=self.user.email, option_key=KEY_FILE_UPDATES_EMAIL_INTERVAL)) == 0

    def test_file_updates_last_emailed_time(self, ):
        assert len(UserOptions.objects.filter(
            email=self.user.email, option_key=KEY_FILE_UPDATES_LAST_EMAILED_TIME)) == 0

        t = timezone.now().replace(microsecond=0)

        UserOptions.objects.set_file_updates_last_emailed_time(self.user.email, t)
        assert len(UserOptions.objects.filter(
            email=self.user.email, option_key=KEY_FILE_UPDATES_LAST_EMAILED_TIME)) == 1

        val = UserOptions.objects.get_file_updates_last_emailed_time(self.user.email)
        assert t == val

        UserOptions.objects.unset_file_updates_last_emailed_time(self.user.email)
        assert len(UserOptions.objects.filter(
            email=self.user.email, option_key=KEY_FILE_UPDATES_LAST_EMAILED_TIME)) == 0
