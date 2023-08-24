import os
import json

from django.core.urlresolvers import reverse

from seaserv import seafile_api
from seahub.test_utils import BaseTestCase


class RepoTrashItemTest(BaseTestCase):

    def setUp(self):

        self.user_name = self.user.username
        self.admin_name = self.admin.username

        self.repo_id = self.repo.id
        self.repo_name = self.repo.repo_name

        self.file_path = self.file
        self.file_name = os.path.basename(self.file_path)

        self.folder_path = self.folder
        self.folder_name = os.path.basename(self.folder.rstrip('/'))

        self.url = reverse('api-v2.1-repo-trash-item', args=[self.repo_id])

    def tearDown(self):
        self.remove_repo()
        self.remove_group()

    def test_can_delete(self):

        # delete a file first
        seafile_api.del_file(self.repo_id, '/',
                self.file_name, self.user_name)

        self.login_as(self.user)

        # get trash item count
        repo_trash_url = reverse('api-v2.1-repo-trash', args=[self.repo_id])
        resp = self.client.get(repo_trash_url)
        json_resp = json.loads(resp.content)
        init_num = len(json_resp['data'])

        # delete this file from library trash
        data = {'path': self.file_path}
        resp = self.client.delete(self.url,
                json.dumps(data), 'application/json')

        # get trash item count again
        resp = self.client.get(repo_trash_url)
        json_resp = json.loads(resp.content)
        assert len(json_resp['data']) == init_num - 1

    def test_can_not_delete_with_invalid_user_permission(self):

        self.login_as(self.admin)

        data = {'path': self.file_path}
        resp = self.client.delete(self.url,
                json.dumps(data), 'application/json')

        self.assertEqual(403, resp.status_code)

    def test_can_not_delete_without_path_parameter(self):

        self.login_as(self.admin)

        # delete this file from library trash
        data = {}
        resp = self.client.delete(self.url,
                json.dumps(data), 'application/json')

        self.assertEqual(400, resp.status_code)
