from django.core import mail
from django.test import override_settings

from seahub.test_utils import BaseTestCase
from registration import signals
from constance import config


class EmailAdminOnRegistrationTest(BaseTestCase):
    def setUp(self):
        self.clear_cache()
        self.old_config = config.ACTIVATE_AFTER_REGISTRATION
        config.ACTIVATE_AFTER_REGISTRATION = True

    def tearDown(self):
        config.ACTIVATE_AFTER_REGISTRATION = self.old_config

    def _send_signal(self):
        signals.user_registered.send(sender=self.__class__,
                                     user=self.user,
                                     request=self.fake_request)

    @override_settings(
        NOTIFY_ADMIN_AFTER_REGISTRATION=True,
    )
    def test_notify_admin_after_registration(self):
        self.assertEqual(len(mail.outbox), 0)
        self._send_signal()

        assert 'New account created' in mail.outbox[0].subject
        assert '%s is joined' % self.user.email in mail.outbox[0].body

        assert len(mail.outbox) > 0
