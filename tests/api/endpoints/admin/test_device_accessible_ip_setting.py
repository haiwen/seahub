import json
from mock import patch
from django.core.urlresolvers import reverse
from django.conf import settings
from seahub.test_utils import BaseTestCase
from seahub.settings import ACCESSIBLE_IPADDRESS_RANGE

class DeviceAccessibleIpSetting(BaseTestCase):
    @patch('seahub.api2.endpoints.admin.device_accessible_ip_setting.is_pro_version')
    @patch('seahub.api2.endpoints.admin.device_accessible_ip_setting.ENABLE_LIMIT_IPADDRESS')
    def setUp(self, mock_enable_limit_ip, mock_is_pro_version):
        mock_enable_limit_ip.return_value = True
        mock_is_pro_version.return_value= True
        self.login_as(self.admin)
        self.url = reverse('api-v2.1-admin-device-accessible-ip-setting')
        self.test_ip = '123.213.132.111'
        settings.ACCESSIBLE_IPADDRESS_RANGE = ['127.0.0.1', '1.1.1.1']

    def test_can_get(self):
        resp = self.client.get(self.url)
        json_resp = json.loads(resp.content)
        assert '127.0.0.1' in  [x['ip_address'] for x in json_resp]

    def test_can_post(self):
        resp = self.client.post(self.url, {'ipaddress': self.test_ip})
        assert resp.status_code == 201
        resp = self.client.get(self.url)
        json_resp = json.loads(resp.content)
        assert self.test_ip in  [x['ip_address'] for x in json_resp]

    def test_can_delete(self):
        self.login_as(self.admin)
        resp = self.client.delete(self.url + "?ipaddress=1.1.1.1")
        assert resp.status_code == 200
        resp = self.client.get(self.url)
        json_resp = json.loads(resp.content)
        assert '1.1.1.1' not in  [x['ip_address'] for x in json_resp]
