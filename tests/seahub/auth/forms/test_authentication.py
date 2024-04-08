from seaserv import ccnet_api

from seahub.test_utils import BaseTestCase
from seahub.auth.forms import AuthenticationForm
from seahub.profile.models import Profile


class AuthenticationFormTest(BaseTestCase):
    def setUp(self):
        self.inactive_user = self.create_user('inactive@test.com', is_active=False)
        Profile.objects.add_or_update(self.user.username,
                                      login_id='user_login_id',
                                      contact_email='contact@test.com')

        ccnet_api.set_reference_id(self.user.username, 'another_email@test.com')

    def tearDown(self):
        self.remove_user(self.inactive_user.username)

    def assertSuccess(self, f):
        assert f.is_valid() is True
        assert f.non_field_errors() == []

    def assertFailed(self, f):
        assert f.is_valid() is False
        assert 'Please enter a correct email/username and password. Note that both fields are case-sensitive.' in f.non_field_errors()

    def test_invalid_user(self):
        data = {
            'login': 'test_does_not_exist',
            'password': '123'
        }
        form = AuthenticationForm(None, data)
        self.assertFailed(form)

    def test_inactive_user(self):
        data = {
            'login': self.inactive_user.username,
            'password': 'secret'
        }

        form = AuthenticationForm(None, data)
        assert form.is_valid() is False
        assert 'This account is inactive.' in form.non_field_errors()

    def test_inactive_user_incorrect_password(self):
        """An invalid login doesn't leak the inactive status of a user."""
        data = {
            'login': self.inactive_user.username,
            'password': 'incorrect'
        }

        form = AuthenticationForm(None, data)
        self.assertFailed(form)

    def test_login_success(self):
        data = {
            'login': self.user.username,
            'password': self.user_password,
        }

        form = AuthenticationForm(None, data)
        self.assertSuccess(form)

    def test_login_failed(self):
        data = {
            'login': self.user.username,
            'password': 'incorrect',
        }

        form = AuthenticationForm(None, data)
        self.assertFailed(form)

    def test_login_id(self):
        data = {
            'login': 'user_login_id',
            'password': self.user_password,
        }

        form = AuthenticationForm(None, data)
        self.assertSuccess(form)

    def test_contact_email(self):
        data = {
            'login': 'contact@test.com',
            'password': self.user_password,
        }

        form = AuthenticationForm(None, data)
        self.assertSuccess(form)
