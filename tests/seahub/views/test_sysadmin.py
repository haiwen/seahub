from django.core.urlresolvers import reverse
from django.test import TestCase

from seahub.base.accounts import User
from seahub.test_utils import Fixtures


class UserToggleStatusTest(TestCase, Fixtures):
    def test_can_activate(self):
        self.client.post(
            reverse('auth_login'), {'username': self.admin.username,
                                    'password': 'secret'}
        )

        old_passwd = self.user.enc_password
        resp = self.client.get(
            reverse('user_toggle_status', args=[self.user.username]) + '?s=1',
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(200, resp.status_code)
        self.assertContains(resp, '"success": true')

        u = User.objects.get(email=self.user.username)
        assert u.is_active is True
        assert u.enc_password == old_passwd

    def test_can_deactivate(self):
        self.client.post(
            reverse('auth_login'), {'username': self.admin.username,
                                    'password': 'secret'}
        )

        old_passwd = self.user.enc_password
        resp = self.client.get(
            reverse('user_toggle_status', args=[self.user.username]) + '?s=0',
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(200, resp.status_code)
        self.assertContains(resp, '"success": true')

        u = User.objects.get(email=self.user.username)
        assert u.is_active is False
        assert u.enc_password == old_passwd


class UserResetTest(TestCase, Fixtures):
    def test_can_reset(self):
        self.client.post(
            reverse('auth_login'), {'username': self.admin.username,
                                    'password': 'secret'}
        )

        old_passwd = self.user.enc_password
        resp = self.client.get(
            reverse('user_reset', args=[self.user.id])
        )
        self.assertEqual(302, resp.status_code)

        u = User.objects.get(email=self.user.username)
        assert u.enc_password != old_passwd


class BatchUserMakeAdminTest(TestCase, Fixtures):
    def test_can_make_admins(self):
        self.client.post(
            reverse('auth_login'), {'username': self.admin.username,
                                    'password': 'secret'}
        )

        resp = self.client.post(
            reverse('batch_user_make_admin'), {
                'set_admin_emails': self.user.username
            }, HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )

        old_passwd = self.user.enc_password
        self.assertContains(resp, '"success": true')

        u = User.objects.get(email=self.user.username)
        assert u.is_staff is True
        assert u.enc_password == old_passwd


class UserMakeAdminTest(TestCase, Fixtures):
    def test_can_make_admin(self):
        self.client.post(
            reverse('auth_login'), {'username': self.admin.username,
                                    'password': 'secret'}
        )

        resp = self.client.get(
            reverse('user_make_admin', args=[self.user.id])
        )

        old_passwd = self.user.enc_password
        self.assertEqual(302, resp.status_code)

        u = User.objects.get(email=self.user.username)
        assert u.is_staff is True
        assert u.enc_password == old_passwd
