import os
import json

from django.core.urlresolvers import reverse

from seaserv import seafile_api
from seahub.test_utils import BaseTestCase

class RepoTrashTest(BaseTestCase):

    def setUp(self):
        self.repo_id = self.repo.id
        self.user_name = self.user.username
        self.url = reverse('api-v2.1-repo-trash', args=[self.repo_id])

    def tearDown(self):
        self.remove_repo()
        self.remove_group()

    def test_can_get(self):
        # delete a file first
        file_name = os.path.basename(self.file)
        seafile_api.del_file(self.repo_id, '/', file_name, self.user_name)

        self.login_as(self.user)
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['data'][0]['obj_name'] == file_name
        assert json_resp['data'][0]['is_dir'] == False
