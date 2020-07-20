import json
from functools import cmp_to_key

from mock import patch
from django.urls import reverse
from django.test import override_settings
from seahub.test_utils import BaseTestCase
from seahub.trusted_ip.models import TrustedIP
from seahub.api2.endpoints.admin.device_trusted_ip import cmp_ip

@override_settings(ENABLE_LIMIT_IPADDRESS=True)
class DeviceAccessibleIpSetting(BaseTestCase):
    def setUp(self):
        self.url = reverse('api-v2.1-admin-device-trusted-ip')
        self.test_ip = '123.213.132.111'
        TrustedIP.objects.get_or_create('127.0.0.1')
        TrustedIP.objects.get_or_create('1.1.1.1')
        self.login_as(self.admin)

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_can_get(self, mock_IsProVersion):
        mock_IsProVersion.return_value= True
        resp = self.client.get(self.url)
        assert resp.status_code == 200
        json_resp = json.loads(resp.content)
        assert '127.0.0.1' in  [x['ip'] for x in json_resp]

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_no_permission(self, mock_IsProVersion):
        self.logout()
        self.login_as(self.admin_no_other_permission)
        mock_IsProVersion.return_value= True
        resp = self.client.get(self.url)
        assert resp.status_code == 403

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_can_post(self, mock_IsProVersion):
        mock_IsProVersion.return_value= True
        resp = self.client.post(self.url, {'ipaddress': self.test_ip})
        assert resp.status_code == 201
        resp = self.client.get(self.url)
        json_resp = json.loads(resp.content)
        assert self.test_ip in  [x['ip'] for x in json_resp]

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_can_delete(self, mock_IsProVersion):
        mock_IsProVersion.return_value= True
        data = 'ipaddress=1.1.1.1'
        resp = self.client.delete(self.url, data, 'application/x-www-form-urlencoded')
        assert resp.status_code == 200
        resp = self.client.get(self.url)
        json_resp = json.loads(resp.content)
        assert '1.1.1.1' not in  [x['ip'] for x in json_resp]

    def test_cmp_ip(self):
        ip_list = [{'ip': '200.1.1.1'}, {'ip': '192.1.1.1'}, {'ip': '111.1.1.1'}]
        new_ip_list = sorted(ip_list, key=cmp_to_key(cmp_ip))
        assert new_ip_list == ip_list[::-1]

        ip_list = [{'ip': '192.1.1.1'}, {'ip': '192.*.1.1'}]
        new_ip_list = sorted(ip_list, key=cmp_to_key(cmp_ip))
        assert new_ip_list == ip_list

        ip_list = [{'ip': '192.*.1.1'}, {'ip': '192.1.1.1'}]
        new_ip_list = sorted(ip_list, key=cmp_to_key(cmp_ip))
        assert new_ip_list == ip_list[::-1]

        ip_list = [{'ip': '111.1.1.1'}, {'ip': '111.8.1.1'}]
        new_ip_list = sorted(ip_list, key=cmp_to_key(cmp_ip))
        assert new_ip_list == ip_list

        ip_list = [{'ip': '111.1.*.2'}, {'ip': '111.1.*.1'}]
        new_ip_list = sorted(ip_list, key=cmp_to_key(cmp_ip))
        assert new_ip_list == ip_list[::-1]

        ip_list = [{'ip': '111.1.*.2'}, {'ip': '111.2.*.1'}, {'ip': '111.1.*.2'}]
        new_ip_list = sorted(ip_list, key=cmp_to_key(cmp_ip))
        assert new_ip_list == [ip_list[0], ip_list[2], ip_list[1]]

        ip_list = [{'ip': '111.1.*.2'}, {'ip': '112.2.*.1'}, {'ip': '110.1.*.2'}]
        new_ip_list = sorted(ip_list, key=cmp_to_key(cmp_ip))
        assert new_ip_list == [ip_list[2], ip_list[0], ip_list[1]]

        ip_list = [{'ip': '111.1.*.2'}, {'ip': '111.1.*.*'}, {'ip': '111.*.*.2'}]
        new_ip_list = sorted(ip_list, key=cmp_to_key(cmp_ip))
        assert new_ip_list == [ip_list[0], ip_list[1], ip_list[2]]
