from django.core import mail
from django.core.urlresolvers import reverse

from constance import config

from seahub.test_utils import BaseTestCase


class EmailAdminOnRegistrationTest(BaseTestCase):
    def setUp(self):
        config.ENABLE_SIGNUP = True
        self.email = 'newuser@test.com'
        self.remove_user(self.email)

    def test_can_notify_admin(self):
        assert bool(config.ENABLE_SIGNUP) is True
        self.assertEqual(len(mail.outbox), 0)

        config.ACTIVATE_AFTER_REGISTRATION = False
        config.REGISTRATION_SEND_MAIL = False

        resp = self.client.post(reverse('registration_register'), {
            'email': self.email,
            'password1': '123',
            'password2': '123'
        })
        self.assertRedirects(resp, 'http://testserver/accounts/register/complete/')
        assert len(mail.outbox) != 0
        assert 'a newly registered account need to be activated' in mail.outbox[0].body
