from mock import patch
from django.core import mail
from django.urls import reverse
import pytest
pytestmark = pytest.mark.django_db

from seahub.base.accounts import User
from seahub.options.models import (UserOptions, KEY_FORCE_PASSWD_CHANGE,
                                   VAL_FORCE_PASSWD_CHANGE)
from seahub.profile.models import Profile
from seahub.test_utils import BaseTestCase


class UserResetTest(BaseTestCase):
    def setUp(self):
        self.clear_cache()
        from constance import config
        self.config = config

        self.login_as(self.admin)

    @patch('seahub.views.sysadmin.IS_EMAIL_CONFIGURED', True)
    @patch('seahub.views.sysadmin.SEND_EMAIL_ON_RESETTING_USER_PASSWD', True)
    def test_can_send_reset_email_to_contact_email(self):
        p = Profile.objects.add_or_update(self.user.username, '')
        p.contact_email = 'contact@mail.com'
        p.save()

        self.assertEqual(len(mail.outbox), 0)

        resp = self.client.post(
            reverse('user_reset', args=[self.user.email])
        )
        self.assertEqual(302, resp.status_code)

        self.assertEqual(len(mail.outbox), 1)
        assert mail.outbox[0].to[0] != self.user.username
        assert mail.outbox[0].to[0] == 'contact@mail.com'
        self.assertEqual(len(mail.outbox), 1)

    def test_can_reset_when_pwd_change_required(self):
        self.config.FORCE_PASSWORD_CHANGE = 1

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
        self.config.FORCE_PASSWORD_CHANGE = 0

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
