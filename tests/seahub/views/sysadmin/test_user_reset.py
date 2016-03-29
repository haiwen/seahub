from django.core.urlresolvers import reverse
from constance import config

from seahub.base.accounts import User
from seahub.options.models import (UserOptions, KEY_FORCE_PASSWD_CHANGE,
                                   VAL_FORCE_PASSWD_CHANGE)
from seahub.test_utils import BaseTestCase


class UserResetTest(BaseTestCase):
    def setUp(self):
        self.clear_cache()

        self.login_as(self.admin)

    def test_can_reset_when_pwd_change_required(self):
        config.FORCE_PASSWORD_CHANGE = 1

        assert len(UserOptions.objects.filter(
            email=self.user.username, option_key=KEY_FORCE_PASSWD_CHANGE)) == 0

        old_passwd = self.user.enc_password
        resp = self.client.post(
            reverse('user_reset', args=[self.user.email])
        )
        self.assertEqual(302, resp.status_code)

        u = User.objects.get(email=self.user.username)
        assert u.enc_password != old_passwd
        assert UserOptions.objects.get(
            email=self.user.username,
            option_key=KEY_FORCE_PASSWD_CHANGE).option_val == VAL_FORCE_PASSWD_CHANGE

    def test_can_reset_when_pwd_change_not_required(self):
        config.FORCE_PASSWORD_CHANGE = 0

        assert len(UserOptions.objects.filter(
            email=self.user.username, option_key=KEY_FORCE_PASSWD_CHANGE)) == 0

        old_passwd = self.user.enc_password
        resp = self.client.post(
            reverse('user_reset', args=[self.user.email])
        )
        self.assertEqual(302, resp.status_code)

        u = User.objects.get(email=self.user.username)
        assert u.enc_password != old_passwd

        assert len(UserOptions.objects.filter(
            email=self.user.username, option_key=KEY_FORCE_PASSWD_CHANGE)) == 0
