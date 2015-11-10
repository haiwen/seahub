import json

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
        })

        json_resp = json.loads(resp.content)
        assert json_resp['token'] is not None
        assert len(json_resp['token']) == 40

    def test_correct_loginID_password(self):

        resp = self.client.post(TOKEN_URL, {
            'username': self.p.login_id,
            'password': self.user_password,
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
        assert json_resp['username'] == [u'This field may not be blank.']
