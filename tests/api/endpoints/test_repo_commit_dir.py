import os
import json

from django.urls import reverse

from seaserv import seafile_api
from seahub.test_utils import BaseTestCase
from seahub.utils import normalize_dir_path
from tests.common.utils import randstring


class RepoCommitDirTest(BaseTestCase):

    def setUp(self):
        self.user_name = self.user.username
        self.admin_name = self.admin.username

        self.repo_id = self.repo.id
        self.repo_name = self.repo.repo_name

        self.file_path = self.file
        self.file_name = os.path.basename(self.file_path)

        self.folder_path = self.folder
        self.folder_name = os.path.basename(self.folder.rstrip('/'))

        self.inner_file_name = 'inner.txt'
        self.inner_file = self.create_file(
            repo_id=self.repo.id, parent_dir=self.folder_path,
            filename=self.inner_file_name, username=self.user_name)

        self.trash_url = reverse('api-v2.1-repo-trash', args=[self.repo_id])

    def tearDown(self):
        self.remove_repo()
        self.remove_group()

    def test_get(self):
        # delete a folder first
        seafile_api.del_file(self.repo_id, '/',
                             json.dumps([self.folder_name]),
                             self.user_name)

        self.login_as(self.user)

        # get commit id
        trash_resp = self.client.get(self.trash_url)
        self.assertEqual(200, trash_resp.status_code)
        trash_json_resp = json.loads(trash_resp.content)
        assert trash_json_resp['data'][0]['obj_name'] == self.folder_name
        assert trash_json_resp['data'][0]['is_dir']
        assert trash_json_resp['data'][0]['commit_id']
        commit_id = trash_json_resp['data'][0]['commit_id']

        url = reverse('api-v2.1-repo-commit-dir', args=[self.repo_id, commit_id])

        # test can get
        resp = self.client.get(url + '?path=' + self.folder_path)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['dirent_list']
        assert json_resp['dirent_list'][0]
        assert json_resp['dirent_list'][0]['type'] == 'file'
        assert json_resp['dirent_list'][0]['name'] == self.inner_file_name
        assert json_resp['dirent_list'][0]['parent_dir'] == normalize_dir_path(self.folder_path)
        assert json_resp['dirent_list'][0]['size'] == 0

        # test can get without path
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['dirent_list']
        assert json_resp['dirent_list'][0]
        assert json_resp['dirent_list'][0]['type'] == 'dir'
        assert json_resp['dirent_list'][0]['name'] == self.folder_name
        assert json_resp['dirent_list'][0]['parent_dir'] == '/'
        assert json_resp['dirent_list'][0]['obj_id']

        assert json_resp['dirent_list'][1]
        assert json_resp['dirent_list'][1]['type'] == 'file'
        assert json_resp['dirent_list'][1]['name'] == self.file_name
        assert json_resp['dirent_list'][1]['parent_dir'] == '/'
        assert json_resp['dirent_list'][0]['obj_id']
        assert json_resp['dirent_list'][1]['size'] == 0

        # test_can_not_get_with_invalid_path_parameter
        invalid_path = randstring(6)

        resp = self.client.get(url + '?path=' + invalid_path)
        self.assertEqual(404, resp.status_code)

        # test_can_not_get_with_invalid_repo_permission
        self.logout()
        self.login_as(self.admin)

        resp = self.client.get(url + '?path=' + self.folder_path)
        self.assertEqual(403, resp.status_code)
