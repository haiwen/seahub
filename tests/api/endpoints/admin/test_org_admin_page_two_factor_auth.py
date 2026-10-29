import json
from unittest import skipUnless
from unittest.mock import patch

from django.conf import settings
from django.urls import reverse

from seahub.organizations.models import OrgAdminSettings
from seahub.test_utils import BaseTestCase


@skipUnless(getattr(settings, 'MULTI_TENANCY', False), 'Requires multi-tenancy')
class OrgAdminPageTwoFactorAuthTest(BaseTestCase):
    """The org admin page must expose the switch only when 2FA is enabled."""

    def setUp(self):
        self.url = reverse('org_web_settings')
        self.login_as(self.org_admin)

    def test_page_exposes_two_factor_auth_flag(self):
        with patch('seahub.utils.two_factor_auth.config') as mock_config:
            mock_config.ENABLE_TWO_FACTOR_AUTH = True
            resp = self.client.get(self.url)

        self.assertEqual(200, resp.status_code)
        html = resp.content.decode('utf-8')
        assert 'twoFactorAuthEnabled' in html
        assert 'twoFactorAuthEnabled:  true' in html

    def test_page_hides_two_factor_auth_flag_when_disabled(self):
        with patch('seahub.utils.two_factor_auth.config') as mock_config:
            mock_config.ENABLE_TWO_FACTOR_AUTH = False
            resp = self.client.get(self.url)

        self.assertEqual(200, resp.status_code)
        html = resp.content.decode('utf-8')
        assert 'twoFactorAuthEnabled:  false' in html

    def test_org_info_returns_enable_force_2fa(self):
        with patch('seahub.utils.two_factor_auth.config') as mock_config:
            mock_config.ENABLE_TWO_FACTOR_AUTH = True
            OrgAdminSettings.objects.set_enable_force_2fa(self.org.org_id, True)

            resp = self.client.get(reverse('api-v2.1-org-admin-info'))
            json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert json_resp['enable_force_2fa'] is True
