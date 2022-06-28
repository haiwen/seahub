import os
import json

from django.urls import reverse

from seaserv import seafile_api
from seahub.test_utils import BaseTestCase


class RepoCommitRevertTest(BaseTestCase):

    def setUp(self):
        self.user_name = self.user.username
        self.admin_name = self.admin.username

        self.repo_id = self.repo.id
        self.repo_name = self.repo.repo_name

        self.file_path = self.file
        self.file_name = os.path.basename(self.file_path)

        self.enc_repo_id = self.enc_repo.id
        self.enc_repo_name = self.enc_repo

        self.folder_path = self.folder
        self.folder_name = os.path.basename(self.folder.rstrip('/'))

    def tearDown(self):
        self.remove_repo()
        self.remove_group()

    def test_post(self):
        # delete a file first
        seafile_api.del_file(self.repo_id, '/',
                             json.dumps([self.file_name]),
                             self.user_name)

        self.login_as(self.user)

        # get commit id form trash
        trash_url = reverse('api-v2.1-repo-trash', args=[self.repo_id])
        trash_resp = self.client.get(trash_url)
        self.assertEqual(200, trash_resp.status_code)
        trash_json_resp = json.loads(trash_resp.content)
        assert trash_json_resp['data'][0]['obj_name'] == self.file_name
        assert not trash_json_resp['data'][0]['is_dir']
        assert trash_json_resp['data'][0]['commit_id']
        commit_id = trash_json_resp['data'][0]['commit_id']

        dir_url = reverse('api-v2.1-dir-view', args=[self.repo_id])
        url = reverse('api-v2.1-repo-commit-revert', args=[self.repo_id, commit_id])

        # test can post
        resp = self.client.get(dir_url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp['dirent_list']) == 1

        resp = self.client.post(url)
        self.assertEqual(200, resp.status_code)

        resp = self.client.get(dir_url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp['dirent_list']) == 2

        # test_can_not_post_with_invalid_repo_permission
        self.logout()
        self.login_as(self.admin)

        resp = self.client.post(url)
        self.assertEqual(403, resp.status_code)

    def test_enc_repo_post(self):
        # delete a file first
        seafile_api.del_file(self.enc_repo_id, '/',
                             json.dumps([self.file_name]),
                             self.user_name)

        self.login_as(self.user)

        # get commit id form trash
        trash_url = reverse('api-v2.1-repo-trash', args=[self.enc_repo_id])
        trash_resp = self.client.get(trash_url)
        self.assertEqual(200, trash_resp.status_code)
        trash_json_resp = json.loads(trash_resp.content)
        assert trash_json_resp['data'][0]['obj_name'] == self.file_name
        assert not trash_json_resp['data'][0]['is_dir']
        assert trash_json_resp['data'][0]['commit_id']
        commit_id = trash_json_resp['data'][0]['commit_id']

        dir_url = reverse('api-v2.1-dir-view', args=[self.enc_repo_id])
        url = reverse('api-v2.1-repo-commit-revert', args=[self.enc_repo_id, commit_id])

        # test can not post without repo decrypted
        resp = self.client.post(url)
        self.assertEqual(403, resp.status_code)

        resp = self.client.get(dir_url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp['dirent_list']) == 0

        # test can post with repo decrypted
        decrypted_url = reverse('api-v2.1-repo-set-password', args=[self.enc_repo_id])
        resp = self.client.post(decrypted_url, data={'password': '123'})
        self.assertEqual(200, resp.status_code)

        resp = self.client.post(url)
        self.assertEqual(200, resp.status_code)

        resp = self.client.get(dir_url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp['dirent_list']) == 1
