from types import SimpleNamespace
from unittest.mock import patch

import pytest
pytestmark = pytest.mark.django_db

from seahub.auth.models import SocialAuthUser
from seahub.organizations.models import OrgAdminSettings, FORCE_ADFS_LOGIN
from seahub.test_utils import BaseTestCase
from seahub.utils.auth import KRB5_PROVIDER, REMOTE_USER_PROVIDER, \
    is_remote_user, user_local_password_enabled
from seahub.utils.ldap import LDAP_PROVIDER, MULTI_LDAP_1_PROVIDER


class RemoteUserPasswordPolicyTest(BaseTestCase):
    def test_local_user_can_use_local_password(self):
        with patch('seahub.utils.auth.DISABLE_SSO_USER_LOCAL_PWD_LOGIN', True):
            self.assertFalse(is_remote_user(self.user))
            self.assertTrue(user_local_password_enabled(self.user))

    def test_ldap_users_are_remote_users(self):
        for provider in (LDAP_PROVIDER, MULTI_LDAP_1_PROVIDER):
            SocialAuthUser.objects.add(self.user.username, provider, self.user.username)
            with patch('seahub.utils.auth.DISABLE_SSO_USER_LOCAL_PWD_LOGIN', True):
                self.assertTrue(is_remote_user(self.user))
                self.assertFalse(user_local_password_enabled(self.user))
            SocialAuthUser.objects.filter(
                username=self.user.username, provider=provider).delete()

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
