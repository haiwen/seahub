import json

from django.core.urlresolvers import reverse

from seaserv import seafile_api

from seahub.test_utils import BaseTestCase


class ReposCountTest(BaseTestCase):
    def setUp(self):
        for e in seafile_api.get_owned_repo_list(self.user.email):
            self.remove_repo(e.id)
        self.repo_ids = []
        self.repo_ids.append(self.repo.id)
        self.url = reverse('api2-repos-count')
        self.login_as(self.user)

    def test_can_get(self):
        resp = self.client.get(self.url)
        resp_json = json.loads(resp.content)
        assert resp_json['total'] == 1
        repo_id = seafile_api.get_repo(self.create_repo(name='test-count', 
                                                        desc='', 
                                                        username=self.user.username, 
                                                        passwd=None)).id
        self.repo_ids.append(repo_id)
        resp = self.client.get(self.url)
        resp_json = json.loads(resp.content)
        assert resp_json['total'] == 2

    def tearDown(self):
        for repo_id in self.repo_ids:
            self.remove_repo(repo_id=repo_id)
