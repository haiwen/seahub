from django.core import mail
from django.urls import reverse
from django.test import override_settings

import pytest
pytestmark = pytest.mark.django_db

from seahub.test_utils import BaseTestCase
from registration import signals


class RegisterSignalMixin(object):
    def _send_signal(self):
        signals.user_registered.send(sender=self.__class__,
                                     user=self.user,
                                     request=self.fake_request)


class EmailAdminOnRegistrationTest(BaseTestCase, RegisterSignalMixin):
    """Send admins emails with message that a new user joined.
    """
    def setUp(self):
        self.clear_cache()
        from constance import config
        self.config = config

        self.old_config = self.config.ACTIVATE_AFTER_REGISTRATION
        self.config.ACTIVATE_AFTER_REGISTRATION = True

    def tearDown(self):
        self.config.ACTIVATE_AFTER_REGISTRATION = self.old_config

    @override_settings(
        NOTIFY_ADMIN_AFTER_REGISTRATION=True,
    )
    def test_notify_admin_after_registration(self):
        self.assertEqual(len(mail.outbox), 0)
        self._send_signal()

        assert 'New account created' in mail.outbox[0].subject
        assert '%s is joined' % self.user.email in mail.outbox[0].body

        assert len(mail.outbox) > 0


class EmailAdminOnRegistrationTest2(BaseTestCase, RegisterSignalMixin):
    """Send admins emails with activate link.
    """
    def setUp(self):
        self.clear_cache()

        from constance import config
        self.config = config

        self.old_cfg1 = self.config.ENABLE_SIGNUP
        self.old_cfg2 = self.config.ACTIVATE_AFTER_REGISTRATION
        self.old_cfg3 = self.config.REGISTRATION_SEND_MAIL

        self.config.ENABLE_SIGNUP = True
        self.email = 'newuser@test.com'
        self.remove_user(self.email)

    def tearDown(self):
        self.config.ENABLE_SIGNUP = self.old_cfg1
        self.config.ACTIVATE_AFTER_REGISTRATION = self.old_cfg2
        self.config.REGISTRATION_SEND_MAIL = self.old_cfg3

    def test_notify_admin_to_activate(self):
        assert bool(self.config.ENABLE_SIGNUP) is True
        self.assertEqual(len(mail.outbox), 0)

        self.config.ACTIVATE_AFTER_REGISTRATION = False
        self.config.REGISTRATION_SEND_MAIL = False

        self._send_signal()

        assert len(mail.outbox) != 0
        assert 'a newly registered account need to be activated' in mail.outbox[0].body
