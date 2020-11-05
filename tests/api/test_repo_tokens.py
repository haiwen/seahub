import json

from django.urls import reverse
from tests.api.apitestbase import ApiTestBase
from tests.common.utils import apiurl

class RepoTokensTest(ApiTestBase):

    def test_can_get(self):
        with self.get_tmp_repo() as repo:
            url = apiurl(reverse('api2-repo-tokens')) + '?repos=' + repo.repo_id
            resp = self.get(url)
            json_resp = json.loads(resp.content)

            assert repo.repo_id in json_resp
