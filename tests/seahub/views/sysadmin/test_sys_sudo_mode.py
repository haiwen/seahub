from django.urls import reverse

import pytest
pytestmark = pytest.mark.django_db

from seahub.test_utils import BaseTestCase


class SysSettingsTest(BaseTestCase):
    def setUp(self):
        self.clear_cache()      # make sure cache is clean
        from constance import config
        self.config = config

        self.old_config = self.config.LOGIN_ATTEMPT_LIMIT
        self.config.LOGIN_ATTEMPT_LIMIT = 1

        self.url = reverse('sys_sudo_mode')
        self.login_as(self.admin)

    def tearDown(self):
        self.config.LOGIN_ATTEMPT_LIMIT = self.old_config
        self.clear_cache()

    def test_can_get(self):
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed('sysadmin/sudo_mode.html')
        self.assertEqual(False, resp.context['password_error'])

    def test_can_post(self):
        resp = self.client.post(self.url, {
            'password': self.admin_password,
        })
        self.assertEqual(302, resp.status_code)
        assert 'accounts/login/' not in resp['Location']

    def test_can_logout_when_reach_login_attempts(self):
        # first invalid login
        resp = self.client.post(self.url, {
            'password': 'xxx',
        })
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed('sysadmin/sudo_mode.html')
        self.assertEqual(True, resp.context['password_error'])

        # logout when second invalid login
        resp = self.client.post(self.url, {
            'password': 'xxx',
        })
        self.assertEqual(302, resp.status_code)
        self.assertRegex(resp['Location'], r'accounts/login/')

    def test_can_clear_login_attempt_cache(self):
        # first invalid login
        resp = self.client.post(self.url, {
            'password': 'xxx',
        })
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed('sysadmin/sudo_mode.html')
        self.assertEqual(True, resp.context['password_error'])

        # second valid login
        resp = self.client.post(self.url, {
            'password': self.admin_password,
        })
        self.assertEqual(302, resp.status_code)
        assert 'accounts/login/' not in resp['Location']

        # third invalid login should show error, which means cache is clear
        resp = self.client.post(self.url, {
            'password': 'xxx',
        })
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed('sysadmin/sudo_mode.html')
        self.assertEqual(True, resp.context['password_error'])
