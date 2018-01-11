from django.core import mail
from django.core.urlresolvers import reverse
from django.test import override_settings

from seahub.test_utils import BaseTestCase
from registration import signals
from constance import config


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
        self.old_config = config.ACTIVATE_AFTER_REGISTRATION
        config.ACTIVATE_AFTER_REGISTRATION = True

    def tearDown(self):
        config.ACTIVATE_AFTER_REGISTRATION = self.old_config

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

        self.old_cfg1 = config.ENABLE_SIGNUP
        self.old_cfg2 = config.ACTIVATE_AFTER_REGISTRATION
        self.old_cfg3 = config.REGISTRATION_SEND_MAIL

        config.ENABLE_SIGNUP = True
        self.email = 'newuser@test.com'
        self.remove_user(self.email)

    def tearDown(self):
        config.ENABLE_SIGNUP = self.old_cfg1
        config.ACTIVATE_AFTER_REGISTRATION = self.old_cfg2
        config.REGISTRATION_SEND_MAIL = self.old_cfg3

    def test_notify_admin_to_activate(self):
        assert bool(config.ENABLE_SIGNUP) is True
        self.assertEqual(len(mail.outbox), 0)

        config.ACTIVATE_AFTER_REGISTRATION = False
        config.REGISTRATION_SEND_MAIL = False

        self._send_signal()

        assert len(mail.outbox) != 0
        assert 'a newly registered account need to be activated' in mail.outbox[0].body
