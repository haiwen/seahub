from django.conf import settings
from django.core.cache import cache
from django.urls import reverse
from urllib.parse import quote

import pytest
pytestmark = pytest.mark.django_db

from seahub.base.accounts import User
from seahub.auth.forms import AuthenticationForm, CaptchaAuthenticationForm
from seahub.auth.utils import LOGIN_ATTEMPT_PREFIX
from seahub.options.models import UserOptions
from seahub.profile.models import Profile
from seahub.test_utils import BaseTestCase


class LoginTest(BaseTestCase):
    def test_can_login(self):
        resp = self.client.post(
            reverse('auth_login'), {'login': self.user.username,
                                    'password': self.user_password}
        )

        self.assertEqual(302, resp.status_code)
        self.assertRegex(resp['Location'], settings.LOGIN_REDIRECT_URL)

    def test_can_login_with_login_id(self):
        p = Profile.objects.add_or_update(self.user.username, 'nickname')
        login_id = 'test_login_id'
        p.login_id = login_id
        p.save()
        assert Profile.objects.get_username_by_login_id(login_id) == self.user.username

        resp = self.client.post(
            reverse('auth_login'), {'login': login_id,
                                    'password': self.user_password}
        )
        self.assertEqual(302, resp.status_code)
        self.assertRegex(resp['Location'], settings.LOGIN_REDIRECT_URL)

    def test_redirect_to_after_success_login(self):
        resp = self.client.post(
            reverse('auth_login') + '?next=/foo/',
            {'login': self.user.username,
             'password': self.user_password}
        )

        self.assertEqual(302, resp.status_code)
        self.assertRegex(resp['Location'], r'/foo/')

    def test_bad_redirect_to_after_success_login(self):
        from urllib.parse import quote
        resp = self.client.post(
            reverse('auth_login') + '?next=' + quote('http://testserver\@example.com'),
            {'login': self.user.username,
             'password': self.user_password}
        )

        self.assertEqual(302, resp.status_code)
        self.assertRegex(resp['Location'], settings.LOGIN_REDIRECT_URL)

    def test_bad_redirect2_to_after_success_login(self):
        from urllib.parse import quote
        resp = self.client.post(
            reverse('auth_login') + '?next=' + quote('http:999999999'),
            {'login': self.user.username,
             'password': self.user_password}
        )

        self.assertEqual(302, resp.status_code)
        self.assertRegex(resp['Location'], settings.LOGIN_REDIRECT_URL)

    def test_redirect_to_other_host_after_success_login(self):
        from urllib.parse import quote
        resp = self.client.post(
            reverse('auth_login') + '?next=' + quote('http://example.org'),
            {'login': self.user.username,
             'password': self.user_password}
        )

        self.assertEqual(302, resp.status_code)
        self.assertRegex(resp['Location'], settings.LOGIN_REDIRECT_URL)

    def test_force_passwd_change_when_login(self):
        UserOptions.objects.set_force_passwd_change(self.user.username)

        resp = self.login_as(self.user)

        self.assertEqual(302, resp.status_code)
        self.assertRedirects(resp, '/accounts/password/change/')

        resp = self.client.get(reverse('auth_password_change'))
        self.assertEqual(200, resp.status_code)
        self.assertEqual(resp.context['force_passwd_change'], True)


class LoginTestMixin():
    """Utility methods for login test.
    """
    def _bad_passwd_login(self, user=None):
        if user is None:
            user = self.user

        resp = self.client.post(
            reverse('auth_login'), {'login': user.username,
                                    'password': 'badpassword'}
        )
        return resp

    def _login_page(self):
        resp = self.client.get(reverse('auth_login'))
        return resp

    def _get_user_login_failed_attempt(self, username):
        return cache.get(LOGIN_ATTEMPT_PREFIX + quote(username), 0)


class LoginCaptchaTest(BaseTestCase, LoginTestMixin):
    def setUp(self):
        self.clear_cache()      # make sure cache is clean

        from constance import config
        self.config = config

        self.config.LOGIN_ATTEMPT_LIMIT = 3
        self.config.FREEZE_USER_ON_LOGIN_FAILED = False

    def tearDown(self):
        self.clear_cache()

    def test_can_show_captcha(self):
        resp = self._login_page()
        assert isinstance(resp.context['form'], AuthenticationForm) is True
        assert self._get_user_login_failed_attempt(self.user.username) == 0

        # first failed login
        resp = self._bad_passwd_login()
        assert isinstance(resp.context['form'], AuthenticationForm) is True
        assert isinstance(resp.context['form'], CaptchaAuthenticationForm) is False
        assert self._get_user_login_failed_attempt(self.user.username) == 1

        # second failed login
        resp = self._bad_passwd_login()
        assert isinstance(resp.context['form'], AuthenticationForm) is True
        assert isinstance(resp.context['form'], CaptchaAuthenticationForm) is False
        assert self._get_user_login_failed_attempt(self.user.username) == 2

        # third failed login, and show the captha
        resp = self._bad_passwd_login()
        assert isinstance(resp.context['form'], CaptchaAuthenticationForm) is True
        assert self._get_user_login_failed_attempt(self.user.username) == 3

    def test_can_clear_failed_attempt_after_login(self):
        resp = self._login_page()
        assert isinstance(resp.context['form'], AuthenticationForm) is True
        assert self._get_user_login_failed_attempt(self.user.username) == 0

        # first failed login
        resp = self._bad_passwd_login()
        assert isinstance(resp.context['form'], AuthenticationForm) is True
        assert isinstance(resp.context['form'], CaptchaAuthenticationForm) is False
        assert self._get_user_login_failed_attempt(self.user.username) == 1

        # successful login
        self.login_as(self.user)

        assert self._get_user_login_failed_attempt(self.user.username) == 0

    def test_login_with_login_id(self):
        p = Profile.objects.add_or_update(self.user.username, 'nickname')
        login_id = 'test_login_id'
        p.login_id = login_id
        p.save()
        assert Profile.objects.get_username_by_login_id(login_id) == self.user.username

        # first failed login
        resp = self._bad_passwd_login()
        assert isinstance(resp.context['form'], AuthenticationForm) is True
        assert isinstance(resp.context['form'], CaptchaAuthenticationForm) is False
        assert self._get_user_login_failed_attempt(self.user.username) == 1

        # successful login using login id
        self.login_as(login_id)

        assert self._get_user_login_failed_attempt(self.user.username) == 0


class FreezeUserOnLoginFailedTest(BaseTestCase, LoginTestMixin):
    def setUp(self):
        self.clear_cache()      # make sure cache is clean

        from constance import config
        self.config = config

        self.config.LOGIN_ATTEMPT_LIMIT = 3
        self.config.FREEZE_USER_ON_LOGIN_FAILED = True

        self.tmp_user = self.create_user()

    def tearDown(self):
        self.clear_cache()
        self.remove_user(self.tmp_user.username)

    def test_can_freeze(self):
        assert bool(self.config.FREEZE_USER_ON_LOGIN_FAILED) is True

        resp = self._login_page()
        assert isinstance(resp.context['form'], AuthenticationForm) is True
        assert self._get_user_login_failed_attempt(self.tmp_user.username) == 0

        # first failed login
        resp = self._bad_passwd_login(user=self.tmp_user)
        assert isinstance(resp.context['form'], AuthenticationForm) is True
        assert isinstance(resp.context['form'], CaptchaAuthenticationForm) is False
        assert self._get_user_login_failed_attempt(self.tmp_user.username) == 1
        assert User.objects.get(self.tmp_user.username).is_active is True

        # second failed login
        resp = self._bad_passwd_login(user=self.tmp_user)
        assert isinstance(resp.context['form'], AuthenticationForm) is True
        assert isinstance(resp.context['form'], CaptchaAuthenticationForm) is False
        assert self._get_user_login_failed_attempt(self.tmp_user.username) == 2
        assert User.objects.get(self.tmp_user.username).is_active is True

        # third failed login, and freeze user instead of showing captha
        resp = self._bad_passwd_login(user=self.tmp_user)
        assert isinstance(resp.context['form'], AuthenticationForm) is True
        assert isinstance(resp.context['form'], CaptchaAuthenticationForm) is False
        assert self._get_user_login_failed_attempt(self.tmp_user.username) == 3

        assert User.objects.get(self.tmp_user.username).is_active is False
