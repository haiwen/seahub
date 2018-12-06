import json

from seahub.test_utils import BaseTestCase


class DownloadRepoViewTest(BaseTestCase):
    def test_get(self, ):
        url = '/api2/repos/%s/download-info/' % self.repo.id
        self.login_as(self.user)

        resp = self.client.get(url)

        info = json.loads(resp.content)
        self.assertIsNotNone(info['relay_addr'])
        self.assertIsNotNone(info['token'])
        self.assertIsNotNone(info['repo_id'])
        self.assertIsNotNone(info['relay_port'])
        self.assertIsNotNone(info['encrypted'])
        self.assertIsNotNone(info['repo_name'])
        self.assertIsNotNone(info['relay_id'])
        self.assertIsNotNone(info['email'])
