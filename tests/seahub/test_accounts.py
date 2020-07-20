from mock import patch
from django.urls import reverse
from django.test import TestCase
from django.utils.html import escape

from tests.common.utils import randstring
from seahub.base.accounts import RegistrationForm

from tests.common.common import USERNAME

LOGIN_URL = reverse('auth_login')
class LoginTest(TestCase):
    def test_renders_correct_template(self):
        resp = self.client.get(LOGIN_URL)

        assert resp.status_code == 200
        self.assertTemplateUsed(resp, 'registration/login.html')

    def test_invalid_password(self):
        # load it once for test cookie
        self.client.get(LOGIN_URL)

        resp = self.client.post(LOGIN_URL, {
            'login': USERNAME,
            'password': 'fakepasswd',
        })
        assert resp.status_code == 200
        assert resp.context['form'].errors['__all__'] == [
            'Please enter a correct email/username and password. Note that both fields are case-sensitive.'
        ]


class TestRegistrationForm(TestCase):

    @patch('seahub.base.accounts.user_number_over_limit')
    def test_registration_form_is_valid(self, mock_user_number_over_limit):

        mock_user_number_over_limit.return_value = False

        user_info = {
            'email': '%s@%s.com' % (randstring(10), randstring(10)),
            'userid': randstring(40),
            'password1': 'password',
            'password2': 'password',
        }

        f = RegistrationForm(data = user_info)

        self.assertTrue(f.is_valid())

    @patch('seahub.base.accounts.user_number_over_limit')
    def test_registration_form_email_invalid(self, mock_user_number_over_limit):

        mock_user_number_over_limit.return_value = False

        user_info = {
            # invalid email without `@`
            'email': '%s%s.com' % (randstring(10), randstring(10)),
            'userid': randstring(40),
            'password1': 'password',
            'password2': 'password',
        }

        f = RegistrationForm(data = user_info)

        assert 'Enter a valid email address.' in str(f['email'].errors)

    @patch('seahub.base.accounts.user_number_over_limit')
    def test_registration_form_email_invalid_for_exceed_limit(self, mock_user_number_over_limit):

        mock_user_number_over_limit.return_value = True

        user_info = {
            'email': '%s@%s.com' % (randstring(10), randstring(10)),
            'userid': randstring(40),
            'password1': 'password',
            'password2': 'password',
        }

        f = RegistrationForm(data = user_info)

        assert 'The number of users exceeds the limit.' in str(f['email'].errors)

    @patch('seahub.base.accounts.user_number_over_limit')
    def test_registration_form_email_invalid_for_user_exist(self, mock_user_number_over_limit):

        mock_user_number_over_limit.return_value = False

        user_info = {
            # invalid email
            'email': USERNAME,
            'userid': randstring(40),
            'password1': 'password',
            'password2': 'password',
        }

        f = RegistrationForm(data = user_info)

        assert 'User %s already exists.' % USERNAME in str(f['email'].errors)

    @patch('seahub.base.accounts.user_number_over_limit')
    def test_registration_form_userid_invalid(self, mock_user_number_over_limit):

        mock_user_number_over_limit.return_value = False

        user_info = {
            'email': '%s@%s.com' % (randstring(10), randstring(10)),
            # invalid userid length < 40
            'userid': randstring(10),
            'password1': 'password',
            'password2': 'password',
        }

        f = RegistrationForm(data = user_info)

        assert 'Invalid user id.' in str(f['userid'].errors)

    @patch('seahub.base.accounts.user_number_over_limit')
    def test_registration_form_password_invalid(self, mock_user_number_over_limit):

        mock_user_number_over_limit.return_value = False

        user_info = {
            'email': '%s@%s.com' % (randstring(10), randstring(10)),
            'userid': randstring(40),
            # invalid password
            'password1': 'password1',
            'password2': 'password2',
        }

        f = RegistrationForm(data = user_info)

        # to escape `'`
        assert escape("The two password fields didn't match.") in str(f['password2'].errors)
