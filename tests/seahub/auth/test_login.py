from django.conf import settings
from django.core.urlresolvers import reverse

from seahub.options.models import UserOptions
from seahub.test_utils import BaseTestCase


class LoginTest(BaseTestCase):
    def test_can_login(self):
        resp = self.login_as(self.user)

        self.assertEqual(302, resp.status_code)
        self.assertRedirects(resp, settings.LOGIN_REDIRECT_URL)

    def test_force_passwd_change_when_login(self):
        UserOptions.objects.set_force_passwd_change(self.user.username)

        resp = self.login_as(self.user)

        self.assertEqual(302, resp.status_code)
        self.assertRedirects(resp, '/accounts/password/change/')

        resp = self.client.get(reverse('auth_password_change'))
        self.assertEqual(200, resp.status_code)
        self.assertEqual(resp.context['force_passwd_change'], True)
