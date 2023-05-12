from django.core import mail
from django.contrib.sites.shortcuts import get_current_site
from django.test import TestCase
from django.test.client import RequestFactory

from registration.models import RegistrationProfile

class RegistrationTest(TestCase):
    user_info = {'username': 'test@test.com',
                 'password': 'password',
                 'email': 'test@test.com'}

    def setUp(self):
        self.request = RequestFactory().get('/accounts/signup/')
        self.site = get_current_site(self.request)

    def tearDown(self):
        self.request = None
        self.site = None

    def test_can_create_inactive_user(self):
        user = RegistrationProfile.objects.create_inactive_user(site=self.site,
                                                                send_email=False,
                                                                **self.user_info)
        self.assertTrue(user.check_password('password'))
        self.assertFalse(user.is_active)

    def test_can_send_activation_email(self):
        RegistrationProfile.objects.create_inactive_user(site=self.site,
                                                         send_email=True,
                                                         **self.user_info)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.user_info['email']])
