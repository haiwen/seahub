import json

from django.urls import reverse

from seahub.test_utils import BaseTestCase

class RepoHistoryTest(BaseTestCase):

    def setUp(self):
        self.repo_id = self.repo.id
        self.user_name = self.user.username
        self.url = reverse('api-v2.1-repo-history', args=[self.repo_id])

    def tearDown(self):
        self.remove_repo()
        self.remove_group()

    def test_can_get(self):
        self.login_as(self.user)
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['data'][0]['email'] == self.user_name
