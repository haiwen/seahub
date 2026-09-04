from unittest.mock import patch

from django.conf import settings
from django.urls import reverse
from django.utils.http import int_to_base36

from seahub.auth.tokens import default_token_generator

from seahub.auth.models import SocialAuthUser
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

    @patch('seahub.utils.auth.DISABLE_SSO_USER_LOCAL_PWD_LOGIN', True)
    def test_can_change_when_password_change_is_forced(self):
        SocialAuthUser.objects.add(self.user.username, 'saml', self.user.username)
        UserOptions.objects.set_force_passwd_change(self.user.username)
        with patch('seahub.utils.auth.DISABLE_SSO_USER_LOCAL_PWD_LOGIN', False):
            self.login_as(self.user)

        session = self.client.session
        session['force_passwd_change'] = True
        session.save()

        resp = self.client.post(
            reverse('auth_password_change'), {
                'old_password': self.user_password,
                'new_password1': 'Seafile123',
                'new_password2': 'Seafile123',
            }
        )

        self.assertEqual(302, resp.status_code)
        self.assertRedirects(resp, reverse('auth_password_change_done'))
        self.assertFalse(UserOptions.objects.passwd_change_required(self.user.username))
        self.assertIsNone(self.client.session.get('force_passwd_change'))

    def test_password_reset_clears_forced_password_change_requirement(self):
        UserOptions.objects.set_force_passwd_change(self.user.username)
        token = default_token_generator.make_token(self.user)
        new_password = 'NewSeafile123'

        response = self.client.post(
            reverse('auth_password_reset_confirm', args=[
                int_to_base36(self.user.id), token,
            ]),
            {
                'new_password1': new_password,
                'new_password2': new_password,
            },
        )

        self.assertRedirects(response, reverse('auth_password_reset_complete'))
        self.assertTrue(self.user.check_password(new_password))
        self.assertFalse(UserOptions.objects.passwd_change_required(self.user.username))

        response = self.client.post(
            reverse('auth_login'), {
                'login': self.user.username,
                'password': new_password,
            },
        )

        self.assertEqual(302, response.status_code)
        self.assertRegex(response['Location'], settings.LOGIN_REDIRECT_URL)
        self.assertIsNone(self.client.session.get('force_passwd_change'))
