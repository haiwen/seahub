#coding: UTF-8
import json
from django.urls import reverse

from seaserv import seafile_api
from seahub.test_utils import BaseTestCase
from tests.common.utils import randstring


class RepoSetPasswordTest(BaseTestCase):

    def setUp(self):
        self.login_as(self.user)

        self.password = randstring(6)
        self.repo_id = seafile_api.create_repo('test-repo',
            '', self.user.username, self.password)

    def tearDown(self):
        self.remove_repo(self.repo_id)

    def test_decrypt_repo(self):
        url = reverse("api-v2.1-repo-set-password", args=[self.repo_id])
        data = {"password": self.password,}
        resp = self.client.post(url, data)
        self.assertEqual(200, resp.status_code)

    def test_can_not_decrypt_repo_with_wrong_password(self):
        url = reverse("api-v2.1-repo-set-password", args=[self.repo_id])
        data = {"password": 'invalid-password',}

        resp = self.client.post(url, data)
        self.assertEqual(400, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['error_msg'] == 'Wrong password'
