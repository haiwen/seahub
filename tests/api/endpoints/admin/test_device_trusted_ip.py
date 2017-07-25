import json
from mock import patch
from django.core.urlresolvers import reverse
from django.conf import settings
from seahub.test_utils import BaseTestCase
from seahub.trusted_ip.models import TrustedIP

class DeviceAccessibleIpSetting(BaseTestCase):
    @patch('seahub.api2.endpoints.admin.device_trusted_ip.is_pro_version')
    @patch('seahub.api2.endpoints.admin.device_trusted_ip.ENABLE_LIMIT_IPADDRESS')
    def setUp(self, mock_enable_limit_ip, mock_is_pro_version):
        mock_enable_limit_ip.return_value = True
        mock_is_pro_version.return_value= True
        self.url = reverse('api-v2.1-admin-device-trusted-ip')
        self.test_ip = '123.213.132.111'
        TrustedIP.objects.get_or_create('127.0.0.1')
        TrustedIP.objects.get_or_create('1.1.1.1')
        self.login_as(self.admin)

    def test_can_get(self):
        resp = self.client.get(self.url)
        json_resp = json.loads(resp.content)
        assert '127.0.0.1' in  [x['ip'] for x in json_resp]

    def test_can_post(self):
        resp = self.client.post(self.url, {'ipaddress': self.test_ip})
        assert resp.status_code == 201
        resp = self.client.get(self.url)
        json_resp = json.loads(resp.content)
        assert self.test_ip in  [x['ip'] for x in json_resp]

    def test_can_delete(self):
        resp = self.client.delete(self.url + "?ipaddress=1.1.1.1")
        assert resp.status_code == 200
        resp = self.client.get(self.url)
        json_resp = json.loads(resp.content)
        assert '1.1.1.1' not in  [x['ip'] for x in json_resp]
