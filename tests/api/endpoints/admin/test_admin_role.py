# -*- coding: utf-8 -*-
import json
from mock import patch

from tests.common.utils import randstring
from django.urls import reverse
from seahub.test_utils import BaseTestCase
from seahub.base.accounts import User
from seahub.role_permissions.models import AdminRole

from seaserv import ccnet_api

from seahub.constants import DEFAULT_ADMIN, DAILY_ADMIN, \
        AUDIT_ADMIN

try:
    from seahub.settings import LOCAL_PRO_DEV_ENV
except ImportError:
    LOCAL_PRO_DEV_ENV = False


class AdminAdminRoleTest(BaseTestCase):

    def setUp(self):
        self.user_email = self.user.username
        self.admin_email = self.admin.username

        tmp_admin_email = '%s@%s.com' % (randstring(6), randstring(6))
        ccnet_api.add_emailuser(tmp_admin_email, randstring(6), 1, 1)
        self.tmp_admin_email = tmp_admin_email

        AdminRole.objects.all().delete()

    def tearDown(self):
        self.remove_repo()
        self.remove_group()
        self.remove_user(self.tmp_admin_email)

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_add_amdin_role(self, mock_has_permission):

        mock_has_permission.return_value = True

        try:
            AdminRole.objects.get_admin_role(self.tmp_admin_email)
        except AdminRole.DoesNotExist:
            pass
        else:
            assert False

        self.login_as(self.admin)

        url = reverse('api-v2.1-admin-admin-role')
        data = {
            'email': self.tmp_admin_email,
            'role': DAILY_ADMIN,
        }
        resp = self.client.post(url, data)

        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert json_resp['email'] == self.tmp_admin_email
        assert json_resp['role'] == DAILY_ADMIN

        tmp_admin_role = AdminRole.objects.get_admin_role(self.tmp_admin_email)
        assert tmp_admin_role.role == DAILY_ADMIN

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_add_with_invalid_role_argument(self, mock_has_permission):

        mock_has_permission.return_value = True

        self.login_as(self.admin)
        url = reverse('api-v2.1-admin-admin-role')
        data = {
            'email': self.tmp_admin_email,
            'role': randstring(6),
        }
        resp = self.client.post(url, data)
        self.assertEqual(400, resp.status_code)
        json_resp = json.loads(resp.content)
        assert 'role must be in' in json_resp['error_msg']

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_add_with_request_adminuser_not_default_admin_role(self, mock_has_permission):

        mock_has_permission.return_value = True

        AdminRole.objects.add_admin_role(self.admin_email, DAILY_ADMIN)
        admin_role = AdminRole.objects.get_admin_role(self.admin_email)
        assert admin_role != DEFAULT_ADMIN

        self.login_as(self.admin)

        url = reverse('api-v2.1-admin-admin-role')
        data = {
            'email': self.tmp_admin_email,
            'role': DAILY_ADMIN,
        }
        resp = self.client.post(url, data)

        self.assertEqual(403, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['error_msg'] == "%s's role must be '%s'." % \
                (self.admin_email, DEFAULT_ADMIN)

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_add_with_email_is_not_admin(self, mock_has_permission):

        mock_has_permission.return_value = True

        tmp_user_email = '%s@%s.com' % (randstring(6), randstring(6))
        ccnet_api.add_emailuser(tmp_user_email, randstring(6), 0, 1)
        tmp_user = User.objects.get(email=tmp_user_email)
        assert not tmp_user.is_staff

        self.login_as(self.admin)

        url = reverse('api-v2.1-admin-admin-role')
        data = {
            'email': tmp_user_email,
            'role': DAILY_ADMIN,
        }
        resp = self.client.post(url, data)

        self.assertEqual(403, resp.status_code)
        json_resp = json.loads(resp.content)
        assert 'must be an administrator' in json_resp['error_msg']

        self.remove_user(tmp_user_email)

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_update_amdin_role(self, mock_has_permission):

        mock_has_permission.return_value = True

        AdminRole.objects.add_admin_role(self.tmp_admin_email, AUDIT_ADMIN)
        tmp_admin_role = AdminRole.objects.get_admin_role(self.tmp_admin_email)
        assert tmp_admin_role.role == AUDIT_ADMIN

        self.login_as(self.admin)

        url = reverse('api-v2.1-admin-admin-role')
        data = 'email=%s&role=%s' % (self.tmp_admin_email, DAILY_ADMIN)
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')

        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert json_resp['email'] == self.tmp_admin_email
        assert json_resp['role'] == DAILY_ADMIN

        tmp_admin_role = AdminRole.objects.get_admin_role(self.tmp_admin_email)
        assert tmp_admin_role.role == DAILY_ADMIN

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_update_with_invalid_role_argument(self, mock_has_permission):

        mock_has_permission.return_value = True

        self.login_as(self.admin)
        url = reverse('api-v2.1-admin-admin-role')
        data = 'email=%s&role=%s' % (self.tmp_admin_email, randstring(6))
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(400, resp.status_code)
        json_resp = json.loads(resp.content)
        assert 'role must be in' in json_resp['error_msg']

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_update_with_request_adminuser_not_default_admin_role(self, mock_has_permission):

        mock_has_permission.return_value = True

        AdminRole.objects.add_admin_role(self.admin_email, DAILY_ADMIN)
        admin_role = AdminRole.objects.get_admin_role(self.admin_email)
        assert admin_role != DEFAULT_ADMIN

        self.login_as(self.admin)

        url = reverse('api-v2.1-admin-admin-role')
        data = 'email=%s&role=%s' % (self.tmp_admin_email, DAILY_ADMIN)
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')

        self.assertEqual(403, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['error_msg'] == "%s's role must be '%s'." % \
                (self.admin_email, DEFAULT_ADMIN)

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_update_with_email_is_not_admin(self, mock_has_permission):

        mock_has_permission.return_value = True

        tmp_user_email = '%s@%s.com' % (randstring(6), randstring(6))
        ccnet_api.add_emailuser(tmp_user_email, randstring(6), 0, 1)
        tmp_user = User.objects.get(email=tmp_user_email)
        assert not tmp_user.is_staff

        self.login_as(self.admin)

        url = reverse('api-v2.1-admin-admin-role')
        data = 'email=%s&role=%s' % (tmp_user_email, DAILY_ADMIN)
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')

        self.assertEqual(403, resp.status_code)
        json_resp = json.loads(resp.content)
        assert 'must be an administrator' in json_resp['error_msg']

        self.remove_user(tmp_user_email)

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_get_amdin_role(self, mock_has_permission):

        mock_has_permission.return_value = True

        AdminRole.objects.add_admin_role(self.tmp_admin_email, AUDIT_ADMIN)
        tmp_admin_role = AdminRole.objects.get_admin_role(self.tmp_admin_email)
        assert tmp_admin_role.role == AUDIT_ADMIN

        self.login_as(self.admin)

        url = reverse('api-v2.1-admin-admin-role') + '?email=%s' % self.tmp_admin_email
        resp = self.client.get(url)

        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert json_resp['email'] == self.tmp_admin_email
        assert json_resp['role'] == AUDIT_ADMIN

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_get_with_invalid_user_permission(self, mock_has_permission):

        mock_has_permission.return_value = True

        self.login_as(self.user)
        url = reverse('api-v2.1-admin-admin-role') + '?email=%s' % self.tmp_admin_email
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_get_with_email_is_not_admin(self, mock_has_permission):

        mock_has_permission.return_value = True

        tmp_user_email = '%s@%s.com' % (randstring(6), randstring(6))
        ccnet_api.add_emailuser(tmp_user_email, randstring(6), 0, 1)
        tmp_user = User.objects.get(email=tmp_user_email)
        assert not tmp_user.is_staff

        self.login_as(self.admin)

        url = reverse('api-v2.1-admin-admin-role') + '?email=%s' % tmp_user_email
        resp = self.client.get(url)

        self.assertEqual(403, resp.status_code)
        json_resp = json.loads(resp.content)
        assert 'must be an administrator' in json_resp['error_msg']

        self.remove_user(tmp_user_email)
