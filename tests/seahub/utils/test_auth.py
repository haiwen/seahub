from types import SimpleNamespace
from unittest.mock import patch

import pytest
pytestmark = pytest.mark.django_db

from seahub.auth.models import SocialAuthUser
from seahub.organizations.models import OrgAdminSettings, FORCE_ADFS_LOGIN
from seahub.test_utils import BaseTestCase
from seahub.utils.auth import KRB5_PROVIDER, REMOTE_USER_PROVIDER, is_force_user_sso, \
    is_remote_user, user_local_password_enabled


class RemoteUserPasswordPolicyTest(BaseTestCase):
    def test_local_user_can_use_local_password(self):
        with patch('seahub.utils.auth.DISABLE_SSO_USER_LOCAL_PWD_LOGIN', True):
            self.assertFalse(is_remote_user(self.user))
            self.assertTrue(user_local_password_enabled(self.user))

    def test_ldap_users_are_remote_users(self):
        for source in ('LDAP', 'LDAPImport'):
            self.user.source = source
            with patch('seahub.utils.auth.DISABLE_SSO_USER_LOCAL_PWD_LOGIN', True):
                self.assertTrue(is_remote_user(self.user))
                self.assertFalse(user_local_password_enabled(self.user))

    def test_social_auth_users_are_remote_users(self):
        SocialAuthUser.objects.add(self.user.username, 'saml', self.user.username)

        with patch('seahub.utils.auth.DISABLE_SSO_USER_LOCAL_PWD_LOGIN', True):
            self.assertTrue(is_remote_user(self.user))
            self.assertFalse(user_local_password_enabled(self.user))

        with patch('seahub.utils.auth.DISABLE_SSO_USER_LOCAL_PWD_LOGIN', False):
            self.assertTrue(user_local_password_enabled(self.user))

    def test_remote_user_and_kerberos_markers_are_persisted_as_social_auth(self):
        for provider in (REMOTE_USER_PROVIDER, KRB5_PROVIDER):
            SocialAuthUser.objects.add(self.user.username, provider, provider + self.user.username)
            self.assertTrue(is_remote_user(self.user))


class ForceUserSSOPolicyTest(BaseTestCase):
    @patch('seahub.organizations.utils.can_use_sso_in_multi_tenancy', return_value=True)
    @patch('seahub.utils.auth.ENABLE_MULTI_ADFS', True)
    @patch('seahub.utils.auth.ccnet_api.is_org_staff', return_value=False)
    @patch('seahub.utils.auth.ccnet_api.get_orgs_by_user')
    def test_oauth_binding_is_still_subject_to_org_force_sso(
            self, mock_get_orgs, _mock_is_org_staff, _mock_can_use_sso):
        org_id = 123
        mock_get_orgs.return_value = [SimpleNamespace(org_id=org_id)]
        OrgAdminSettings.objects.create(
            org_id=org_id, key=FORCE_ADFS_LOGIN, value='1')
        SocialAuthUser.objects.add(
            self.user.username, 'oauth.example.com', self.user.username)

        with patch(
                'seahub.utils.auth.settings.OAUTH_PROVIDER_DOMAIN',
                'oauth.example.com', create=True):
            self.assertTrue(is_force_user_sso(self.user))

    @patch('seahub.utils.auth.DISABLE_SSO_USER_LOCAL_PWD_LOGIN', False)
    @patch('seahub.utils.auth.is_force_user_sso', return_value=True)
    def test_org_force_sso_overrides_global_local_password_enable(
            self, _mock_is_force_user_sso):
        SocialAuthUser.objects.add(self.user.username, 'saml', self.user.username)

        self.assertFalse(user_local_password_enabled(self.user))
