import json

from mock import patch

from django.urls import reverse
from seahub.test_utils import BaseTestCase

class SysinfoTest(BaseTestCase):

    def setUp(self):
        self.login_as(self.admin)

    def tearDown(self):
        self.remove_repo()

    def test_admin_permission_denied(self):
        self.logout()
        self.login_as(self.admin_cannot_view_system_info)
        url = reverse('api-v2.1-sysinfo')
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)

    @patch('seahub.api2.endpoints.admin.sysinfo.is_pro_version')
    def test_get_sysinfo_in_community_edition(self, mock_is_pro_version):

        mock_is_pro_version.return_value = False

        url = reverse('api-v2.1-sysinfo')
        resp = self.client.get(url)
        json_resp = json.loads(resp.content)

        assert len(json_resp) == 16
        assert json_resp['is_pro'] is False
        assert json_resp['multi_tenancy_enabled'] is False
        assert json_resp['license_maxusers'] == 0

    @patch('seahub.api2.endpoints.admin.sysinfo.is_pro_version')
    @patch('seahub.api2.endpoints.admin.sysinfo.parse_license')
    def test_get_sysinfo_in_pro_edition(self, mock_parse_license, mock_is_pro_version):

        test_user = 'Test user'

        mock_is_pro_version.return_value = True
        mock_parse_license.return_value = {
            'Hash': '2981bd12cf0c83c81aaa453ce249ffdd2e492ed2220f3c89c57f06518de36c487c873be960577a0534f3de4ac2bb52d3918016aaa07d60dccbce92673bc23604f4d8ff547f88287c398f74f16e114a8a3b978cce66961fd0facd283da7b050b5fc6205934420e1b4a65daf1c6dcdb2dc78e38a3799eeb5533779595912f1723129037f093f925d8ab94478c8aded304c62d003c07a6e98e706fdf81b6f73c3a806f523bbff1a92f8eb8ea325e09b2b80acfc4b99dd0f5b339d5ed832da00bad3394b9d40a09cce6066b6dc2c9b2ec47338de41867f5c2380c96f7708a5e9cdf244fbdfa1cc174751b90e74e620f53778593b84ec3b15175c3e432c20dcb4cfde',
            'Name': test_user,
            'Mode': 'life-time',
            'Licencetype': 'User',
            'LicenceKEY': '1461659711',
            'Expiration': '2016-5-6',
            'MaxUsers': '500',
            'ProductID': 'Seafile server'
        }

        url = reverse('api-v2.1-sysinfo')
        resp = self.client.get(url)
        json_resp = json.loads(resp.content)

        assert len(json_resp) == 16
        assert json_resp['license_maxusers'] == 500
        assert json_resp['license_to'] == test_user
