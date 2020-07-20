import json
from django.urls import reverse
from seahub.test_utils import BaseTestCase
from seahub.api2.models import TokenV2

class DevicesTest(BaseTestCase):

    def setUp(self):

        client_version = '2.0.4'
        device_id = '4a0d62c1f27b3b74'
        device_name = 'PLK-AL10'
        last_accessed = '2016-04-11T20:25:05+08:00'
        last_login_ip = '192.168.1.210'
        platform_version = '5.0.2'
        user = '1@1.com'

        key = 'b45250fe41735e2f56255a9917d58637b138ba4b'
        platform = 'ios'
        token = TokenV2.objects.create(client_version=client_version,
            device_id=device_id, device_name=device_name, key=key,
            last_accessed=last_accessed, last_login_ip=last_login_ip,
            platform=platform, platform_version=platform_version, user=user)

        token.save()

        key = 'a45250fe41735e2f56255a9917d58637b138ba4b'
        platform = 'linux'
        token = TokenV2.objects.create(client_version=client_version,
            device_id=device_id, device_name=device_name, key=key,
            last_accessed=last_accessed, last_login_ip=last_login_ip,
            platform=platform, platform_version=platform_version, user=user)

        token.save()

    def test_can_get(self):
        self.login_as(self.admin)
        url = reverse('api-v2.1-admin-devices')
        resp = self.client.get(url)

        json_resp = json.loads(resp.content)
        assert len(json_resp['devices']) == 2

    def test_no_permission(self):
        self.logout()
        self.login_as(self.admin_no_other_permission)
        url = reverse('api-v2.1-admin-devices')
        resp = self.client.get(url)
        assert resp.status_code == 403

    def test_can_get_desktop(self):
        self.login_as(self.admin)
        url = reverse('api-v2.1-admin-devices') + '?platform=desktop'
        resp = self.client.get(url)

        json_resp = json.loads(resp.content)
        assert len(json_resp['devices']) == 1
        assert json_resp['devices'][0]['platform'] == 'linux'

    def test_can_get_mobile(self):
        self.login_as(self.admin)
        url = reverse('api-v2.1-admin-devices') + '?platform=mobile'
        resp = self.client.get(url)

        json_resp = json.loads(resp.content)
        assert len(json_resp['devices']) == 1
        assert json_resp['devices'][0]['platform'] == 'ios'

    def test_can_not_get_if_not_admin(self):
        self.login_as(self.user)
        url = reverse('api-v2.1-admin-devices')
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)
