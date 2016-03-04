from django.conf import settings
from django.core.urlresolvers import reverse

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
