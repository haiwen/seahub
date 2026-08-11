from mock import patch

from django.urls import reverse

from seahub.options.models import UserOptions
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
                'new_password1': 'Seafile123',
                'new_password2': 'Seafile123',
            }
        )
        self.assertEqual(302, resp.status_code)
        self.assertRedirects(resp, reverse('auth_password_change_done'))

    @patch('seahub.auth.views.can_user_update_password', return_value=False)
    def test_forced_change_bypasses_password_update_permission(
            self, mock_can_update):
        UserOptions.objects.set_force_passwd_change(self.user.username)
        self.login_as(self.user)

        resp = self.client.post(
            reverse('auth_password_change'), {
                'old_password': self.user_password,
                'new_password1': 'Seafile123',
                'new_password2': 'Seafile123',
            }
        )

        self.assertEqual(302, resp.status_code)
        self.assertRedirects(resp, reverse('auth_password_change_done'))
        self.assertFalse(
            UserOptions.objects.passwd_change_required(self.user.username)
        )
        mock_can_update.assert_not_called()
