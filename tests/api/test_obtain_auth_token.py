import json

from seahub.api2.models import TokenV2
from seahub.profile.models import Profile
from seahub.test_utils import BaseTestCase
from .urls import TOKEN_URL

class ObtainAuthTokenTest(BaseTestCase):
    def setUp(self):
        self.p = Profile.objects.add_or_update(self.user.username, '', '')
        self.p.login_id = 'test_login_id'
        self.p.save()

    def test_correct_email_passwd(self):
        resp = self.client.post(TOKEN_URL, {
            'username': self.user.username,
            'password': self.user_password,
            'platform': 'linux',
            'device_id': '701143c1238e6736b61c20e73de82fc95989c413',
            'device_name': 'test',
        })

        json_resp = json.loads(resp.content)
        assert json_resp['token'] is not None
        assert len(json_resp['token']) == 40

    def test_correct_loginID_password(self):

        resp = self.client.post(TOKEN_URL, {
            'username': self.p.login_id,
            'password': self.user_password,
            'platform': 'linux',
            'device_id': '701143c1238e6736b61c20e73de82fc95989c413',
            'device_name': 'test',
        })

        json_resp = json.loads(resp.content)
        assert json_resp['token'] is not None
        assert len(json_resp['token']) == 40

    def test_invalid_password(self):
        resp = self.client.post(TOKEN_URL, {
            'username': self.user.username,
            'password': 'random_password',
        })
        self.assertEqual(400, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['non_field_errors'] == ['Unable to login with provided credentials.']

    def test_empty_login_id(self):
        self.p.login_id = ""
        self.p.save()

        resp = self.client.post(TOKEN_URL, {
            'username': self.p.login_id,
            'password': self.user_password,
        })

        self.assertEqual(400, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['username'] == ['This field may not be blank.']

    def test_can_obtain_token_v2(self):
        resp = self.client.post(TOKEN_URL, {
            'username': self.p.login_id,
            'password': self.user_password,
            'platform': 'windows',
            'device_id': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            'device_name': 'fake-device-name',
            'client_version': '4.1.0',
            'platform_version': '',
        })

        json_resp = json.loads(resp.content)
        assert json_resp['token'] is not None
        assert len(json_resp['token']) == 40

        t = TokenV2.objects.get(key=json_resp['token'])
        assert t.client_version == '4.1.0'
        assert t.platform_version == ''
