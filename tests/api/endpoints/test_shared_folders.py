import os
import json

from django.core.urlresolvers import reverse

from seaserv import seafile_api

from seahub.test_utils import BaseTestCase

class SharedFoldersTest(BaseTestCase):

    def create_virtual_repo(self):

        name = os.path.basename(self.folder.rstrip('/'))
        sub_repo_id = seafile_api.create_virtual_repo(
                self.repo.id, self.folder, name,
                name, self.user.username)
        return sub_repo_id

    def share_repo_to_user(self, repo_id):
        seafile_api.share_repo(
                repo_id, self.user.username,
                self.admin.username, 'rw')

    def share_repo_to_group(self, repo_id):
        seafile_api.set_group_repo(
                repo_id, self.group.id,
                self.user.username, 'rw')

    def setUp(self):
        self.repo_id = self.repo.id
        self.group_id = self.group.id
        self.user_name = self.user.username
        self.admin_user = self.admin.username
        self.url = reverse('api-v2.1-shared-folders')

        sub_repo_id = self.create_virtual_repo()
        self.share_repo_to_user(sub_repo_id)
        self.share_repo_to_group(sub_repo_id)

    def tearDown(self):
        self.remove_repo()

    def test_can_get(self):
        self.login_as(self.user)
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp[0]['share_type'] == 'personal'
        assert json_resp[1]['share_type'] == 'group'

    def test_get_with_invalid_repo_permission(self):
        # login with admin, then get user's share repo info
        self.login_as(self.admin)
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp) == 0
