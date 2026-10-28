import json
from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse

from seahub.organizations.models import OrgAdminSettings
from seahub.options.models import KEY_FORCE_2FA, UserOptions
from seahub.test_utils import BaseTestCase
from seahub.two_factor.models import TOTPDevice, devices_for_user


class OrgAdminSettingsTwoFactorAuthTest(TestCase):

    def test_missing_setting_defaults_to_disabled(self):
        assert OrgAdminSettings.objects.is_enable_force_2fa_by_org_id(1) is False

    def test_updates_existing_setting_and_keeps_other_orgs_isolated(self):
        OrgAdminSettings.objects.set_enable_force_2fa(1, True)
        OrgAdminSettings.objects.set_enable_force_2fa(2, True)
        OrgAdminSettings.objects.set_enable_force_2fa(1, False)

        assert OrgAdminSettings.objects.is_enable_force_2fa_by_org_id(1) is False
        assert OrgAdminSettings.objects.is_enable_force_2fa_by_org_id(2) is True
        assert OrgAdminSettings.objects.filter(
            org_id=1, key='enable_force_2fa').count() == 1


class OrgAdminUserTwoFactorAuthTest(BaseTestCase):

    def setUp(self):
        self.url = reverse('api-v2.1-org-admin-user-two-factor-auth',
                           args=[self.org.org_id, self.org_user.email])
        self.login_as(self.org_admin)

    def test_put_force_2fa(self):
        with patch('seahub.utils.two_factor_auth.config') as mock_config:
            mock_config.ENABLE_TWO_FACTOR_AUTH = True

            resp = self.client.put(self.url, 'force_2fa=1',
                                   'application/x-www-form-urlencoded')
            self.assertEqual(200, resp.status_code)
            assert len(UserOptions.objects.filter(
                email=self.org_user.email, option_key=KEY_FORCE_2FA)) == 1

            resp = self.client.put(self.url, 'force_2fa=0',
                                   'application/x-www-form-urlencoded')
            self.assertEqual(200, resp.status_code)
            assert len(UserOptions.objects.filter(
                email=self.org_user.email, option_key=KEY_FORCE_2FA)) == 0

    def test_put_force_2fa_with_invalid_value(self):
        with patch('seahub.utils.two_factor_auth.config') as mock_config:
            mock_config.ENABLE_TWO_FACTOR_AUTH = True

            resp = self.client.put(self.url, 'force_2fa=abc',
                                   'application/x-www-form-urlencoded')
            self.assertEqual(400, resp.status_code)

    def test_put_returns_404_when_two_factor_auth_disabled(self):
        with patch('seahub.utils.two_factor_auth.config') as mock_config:
            mock_config.ENABLE_TWO_FACTOR_AUTH = False

            resp = self.client.put(self.url, 'force_2fa=1',
                                   'application/x-www-form-urlencoded')
            self.assertEqual(404, resp.status_code)

    def test_delete_removes_devices(self):
        TOTPDevice(user=self.org_user.email, name='', confirmed=1).save()
        assert len(list(devices_for_user(self.org_user))) > 0

        with patch('seahub.utils.two_factor_auth.config') as mock_config:
            mock_config.ENABLE_TWO_FACTOR_AUTH = True
            resp = self.client.delete(self.url)

        self.assertEqual(200, resp.status_code)
        assert len(list(devices_for_user(self.org_user))) == 0

    def test_returns_404_for_user_outside_org(self):
        url = reverse('api-v2.1-org-admin-user-two-factor-auth',
                      args=[self.org.org_id, self.user.email])
        with patch('seahub.utils.two_factor_auth.config') as mock_config:
            mock_config.ENABLE_TWO_FACTOR_AUTH = True
            resp = self.client.put(url, 'force_2fa=1',
                                   'application/x-www-form-urlencoded')
        self.assertEqual(404, resp.status_code)

    def test_org_user_can_not_change_force_2fa(self):
        self.logout()
        self.login_as(self.org_user)
        with patch('seahub.utils.two_factor_auth.config') as mock_config:
            mock_config.ENABLE_TWO_FACTOR_AUTH = True
            resp = self.client.put(self.url, 'force_2fa=1',
                                   'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)


class OrgAdminForceTwoFactorAuthSettingTest(BaseTestCase):

    def setUp(self):
        self.url = reverse('api-v2.1-org-admin-web-settings',
                           args=[self.org.org_id])
        self.login_as(self.org_admin)

    def test_put_org_enable_force_2fa(self):
        with patch('seahub.utils.two_factor_auth.config') as mock_config:
            mock_config.ENABLE_TWO_FACTOR_AUTH = True

            resp = self.client.put(self.url, 'enable_force_2fa=1',
                                   'application/x-www-form-urlencoded')
            self.assertEqual(200, resp.status_code)
            assert json.loads(resp.content)['enable_force_2fa'] is True
            assert OrgAdminSettings.objects.is_enable_force_2fa_by_org_id(self.org.org_id) is True
            assert OrgAdminSettings.objects.get(
                org_id=self.org.org_id, key='enable_force_2fa').value == '1'

            resp = self.client.put(self.url, 'enable_force_2fa=0',
                                   'application/x-www-form-urlencoded')
            self.assertEqual(200, resp.status_code)
            assert json.loads(resp.content)['enable_force_2fa'] is False
            assert OrgAdminSettings.objects.is_enable_force_2fa_by_org_id(self.org.org_id) is False
            assert OrgAdminSettings.objects.get(
                org_id=self.org.org_id, key='enable_force_2fa').value == '0'

    def test_put_org_enable_force_2fa_ignored_when_two_factor_auth_disabled(self):
        with patch('seahub.utils.two_factor_auth.config') as mock_config:
            mock_config.ENABLE_TWO_FACTOR_AUTH = False

            resp = self.client.put(self.url, 'enable_force_2fa=1',
                                   'application/x-www-form-urlencoded')
            self.assertEqual(200, resp.status_code)
            assert OrgAdminSettings.objects.is_enable_force_2fa_by_org_id(self.org.org_id) is False
            assert not OrgAdminSettings.objects.filter(
                org_id=self.org.org_id, key='enable_force_2fa').exists()

    def test_put_org_enable_force_2fa_rejects_invalid_value(self):
        OrgAdminSettings.objects.set_enable_force_2fa(self.org.org_id, True)
        with patch('seahub.utils.two_factor_auth.config') as mock_config:
            mock_config.ENABLE_TWO_FACTOR_AUTH = True
            resp = self.client.put(self.url, 'enable_force_2fa=abc',
                                   'application/x-www-form-urlencoded')

        self.assertEqual(400, resp.status_code)
        assert OrgAdminSettings.objects.is_enable_force_2fa_by_org_id(self.org.org_id) is True

    def test_system_and_org_admin_share_force_2fa_setting(self):
        admin_url = reverse('api-v2.1-admin-organization', args=[self.org.org_id])
        with patch('seahub.utils.two_factor_auth.config') as mock_config:
            mock_config.ENABLE_TWO_FACTOR_AUTH = True
            self.logout()
            self.login_as(self.admin)
            resp = self.client.put(admin_url, 'enable_force_2fa=1',
                                   'application/x-www-form-urlencoded')
            self.assertEqual(200, resp.status_code)

            self.logout()
            self.login_as(self.org_admin)
            resp = self.client.get(reverse('api-v2.1-org-admin-info'))
            self.assertEqual(200, resp.status_code)
            assert json.loads(resp.content)['enable_force_2fa'] is True

            resp = self.client.put(self.url, 'enable_force_2fa=0',
                                   'application/x-www-form-urlencoded')
            self.assertEqual(200, resp.status_code)

            self.logout()
            self.login_as(self.admin)
            resp = self.client.get(admin_url)
            self.assertEqual(200, resp.status_code)
            assert json.loads(resp.content)['enable_force_2fa'] is False

        assert OrgAdminSettings.objects.filter(
            org_id=self.org.org_id, key='enable_force_2fa').count() == 1

    def test_get_org_info_returns_enable_force_2fa(self):
        with patch('seahub.utils.two_factor_auth.config') as mock_config:
            mock_config.ENABLE_TWO_FACTOR_AUTH = True
            OrgAdminSettings.objects.set_enable_force_2fa(self.org.org_id, True)

            resp = self.client.get(reverse('api-v2.1-org-admin-info'))
            json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert json_resp['enable_force_2fa'] is True


class OrgAdminUserInfoTwoFactorAuthTest(BaseTestCase):

    def setUp(self):
        self.url = reverse('api-v2.1-org-admin-user',
                           args=[self.org.org_id, self.org_user.email])
        self.login_as(self.org_admin)

    def test_user_info_contains_two_factor_auth_fields(self):
        with patch('seahub.utils.two_factor_auth.config') as mock_config:
            mock_config.ENABLE_TWO_FACTOR_AUTH = True
            UserOptions.objects.set_force_2fa(self.org_user.email)

            resp = self.client.get(self.url)
            json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert json_resp['is_force_2fa'] is True
        assert json_resp['has_default_device'] is False
