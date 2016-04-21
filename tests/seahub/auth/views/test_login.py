from django.conf import settings
from django.core.urlresolvers import reverse

from constance import config

from seahub.options.models import UserOptions
from seahub.test_utils import BaseTestCase


class LoginTest(BaseTestCase):
    def test_can_login(self):
        resp = self.client.post(
            reverse('auth_login'), {'login': self.user.username,
                                    'password': self.user_password}
        )

        self.assertEqual(302, resp.status_code)
        self.assertRegexpMatches(resp['Location'], r'http://testserver%s' % settings.LOGIN_REDIRECT_URL)

    def test_redirect_to_after_success_login(self):
        resp = self.client.post(
            reverse('auth_login') + '?next=/foo/',
            {'login': self.user.username,
             'password': self.user_password}
        )

        self.assertEqual(302, resp.status_code)
        self.assertRegexpMatches(resp['Location'], r'http://testserver/foo/')

    def test_bad_redirect_to_after_success_login(self):
        from django.utils.http import urlquote
        resp = self.client.post(
            reverse('auth_login') + '?next=' + urlquote('http://testserver\@example.com'),
            {'login': self.user.username,
             'password': self.user_password}
        )

        self.assertEqual(302, resp.status_code)
        self.assertRegexpMatches(resp['Location'], r'http://testserver%s' % settings.LOGIN_REDIRECT_URL)

    def test_redirect_to_other_host_after_success_login(self):
        from django.utils.http import urlquote
        resp = self.client.post(
            reverse('auth_login') + '?next=' + urlquote('http://foo.com'),
            {'login': self.user.username,
             'password': self.user_password}
        )

        self.assertEqual(302, resp.status_code)
        self.assertRegexpMatches(resp['Location'], r'http://testserver%s' % settings.LOGIN_REDIRECT_URL)

    def test_force_passwd_change_when_login(self):
        UserOptions.objects.set_force_passwd_change(self.user.username)

        resp = self.login_as(self.user)

        self.assertEqual(302, resp.status_code)
        self.assertRedirects(resp, '/accounts/password/change/')

        resp = self.client.get(reverse('auth_password_change'))
        self.assertEqual(200, resp.status_code)
        self.assertEqual(resp.context['force_passwd_change'], True)


class LoginCaptchaTest(BaseTestCase):
    def setUp(self):
        config.LOGIN_ATTEMPT_LIMIT = 1
        config.FREEZE_USER_ON_LOGIN_FAILED = False

    def tearDown(self):
        self.clear_cache()

    def _bad_passwd_login(self):
        resp = self.client.post(
            reverse('auth_login'), {'login': self.user.username,
                                    'password': 'badpassword'}
        )
        return resp

    def _login_page(self):
        resp = self.client.get(reverse('auth_login'))
        return resp

    def test_can_show_captcha(self):
        resp = self._bad_passwd_login()
        print resp.context['form']

        resp = self._bad_passwd_login()
        print resp.context['form']

        resp = self._bad_passwd_login()
        print resp.context['form']

        print '-------------'
        resp = self._login_page()
        print resp.context['form']

