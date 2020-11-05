import json

from seaserv import seafile_api
from django.urls import reverse
from seahub.test_utils import BaseTestCase

class GroupLibrariesTest(BaseTestCase):

    def setUp(self):
        self.user_name = self.user.username
        self.admin_name = self.admin.username
        self.group_id = self.group.id
        self.repo_id = self.repo.id

        seafile_api.set_group_repo(self.repo_id, self.group_id,
                self.admin.username, 'r')

    def tearDown(self):
        self.remove_group()

    def test_get_admin_permission_denied(self):
        self.login_as(self.admin_cannot_manage_group)
        resp = self.client.get(reverse('api-v2.1-admin-group-libraries', args=[self.group_id]))
        self.assertEqual(403, resp.status_code)

    def test_can_get(self):
        self.login_as(self.admin)
        url = reverse('api-v2.1-admin-group-libraries', args=[self.group_id])
        resp = self.client.get(url)

        json_resp = json.loads(resp.content)
        assert json_resp['libraries'][0]['repo_id'] == self.repo_id
        assert json_resp['group_id'] == self.group_id

    def test_can_not_get_if_not_admin(self):
        self.login_as(self.user)
        url = reverse('api-v2.1-admin-group-libraries', args=[self.group_id])
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)

    def test_can_unshare(self):

        # make sure repo is shared to group
        repos = seafile_api.get_repos_by_group(self.group_id)
        assert len(repos) == 1

        self.login_as(self.admin)
        url = reverse('api-v2.1-admin-group-library', args=[self.group_id, self.repo_id])
        resp = self.client.delete(url)
        self.assertEqual(200, resp.status_code)

        # make sure repo is unshared
        repos = seafile_api.get_repos_by_group(self.group_id)
        assert len(repos) == 0

    def test_can_not_unshare_if_not_admin(self):

        # make sure repo is shared to group
        repos = seafile_api.get_repos_by_group(self.group_id)
        assert len(repos) == 1

        self.login_as(self.user)
        url = reverse('api-v2.1-admin-group-library', args=[self.group_id, self.repo_id])
        resp = self.client.delete(url)
        self.assertEqual(403, resp.status_code)

        # make sure repo is unshared
        repos = seafile_api.get_repos_by_group(self.group_id)
        assert len(repos) == 1
