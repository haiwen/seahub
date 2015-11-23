from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase


class PasswordChangeTest(BaseTestCase):
    def test_can_render(self):
        self.login_as(self.user)

        resp = self.client.get(reverse('auth_password_change'))

        self.assertEqual(200, resp.status_code)
        self.assertContains(resp, 'Password Modification')

    def test_can_change(self):
        self.login_as(self.user)

        resp = self.client.post(
            reverse('auth_password_change'), {
                'old_password': self.user_password,
                'new_password1': '123',
                'new_password2': '123',
            }
        )
        self.assertEqual(302, resp.status_code)
        self.assertRedirects(resp, reverse('auth_password_change_done'))
