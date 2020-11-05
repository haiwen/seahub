from mock import patch
from django.test import TestCase
from django.utils.html import escape

from tests.common.utils import randstring
from seahub.forms import AddUserForm
from seahub.constants import DEFAULT_USER

from tests.common.common import USERNAME


class TestAddUserForm(TestCase):

    @patch('seahub.forms.user_number_over_limit')
    def test_add_user_form_is_valid(self, mock_user_number_over_limit):

        mock_user_number_over_limit.return_value = False

        user_info = {
            'email': '%s@%s.com' % (randstring(10), randstring(10)),
            'role': DEFAULT_USER,
            'password1': 'password',
            'password2': 'password',
        }

        f = AddUserForm(data = user_info)

        self.assertTrue(f.is_valid())

    @patch('seahub.forms.user_number_over_limit')
    def test_add_user_form_email_invalid_for_exceed_limit(self, mock_user_number_over_limit):

        mock_user_number_over_limit.return_value = True

        user_info = {
            'email': '%s@%s.com' % (randstring(10), randstring(10)),
            'role': DEFAULT_USER,
            'password1': 'password',
            'password2': 'password',
        }

        f = AddUserForm(data = user_info)

        assert 'The number of users exceeds the limit.' in str(f['email'].errors)

    @patch('seahub.forms.user_number_over_limit')
    def test_add_user_form_email_invalid_for_user_exist(self, mock_user_number_over_limit):

        mock_user_number_over_limit.return_value = False

        user_info = {
            # invalid email
            'email': USERNAME,
            'role': DEFAULT_USER,
            'password1': 'password',
            'password2': 'password',
        }

        f = AddUserForm(data = user_info)

        assert 'A user with this email already exists.' in str(f['email'].errors)

    @patch('seahub.forms.user_number_over_limit')
    def test_add_user_form_password_invalid(self, mock_user_number_over_limit):

        mock_user_number_over_limit.return_value = False

        user_info = {
            'email': '%s@%s.com' % (randstring(10), randstring(10)),
            'role': DEFAULT_USER,
            # invalid password
            'password1': 'password1',
            'password2': 'password2',
        }

        f = AddUserForm(data = user_info)

        # to escape `'`
        assert escape("The two passwords didn't match.") in str(f.errors)
