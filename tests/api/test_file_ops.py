# -*- coding: utf-8 -*-
import os
import json

from seaserv import seafile_api

from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase

class FileOpsApiTest(BaseTestCase):

    def create_new_repo(self):
        new_repo_id = seafile_api.create_repo(name='test-repo-2', desc='',
            username=self.user.username, passwd=None)

        return new_repo_id

    def get_lib_file_name(self, repo_id):

        url = reverse('list_lib_dir', args=[repo_id])
        resp = self.client.get(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        json_resp = json.loads(resp.content)

        if len(json_resp['dirent_list']) > 0:
            for dirent in json_resp['dirent_list']:
                if dirent.has_key('is_file') and dirent['is_file']:
                    return dirent['obj_name']
                else:
                    continue

        return None

    def setUp(self):
        self.user_name = self.user.username
        self.admin_name = self.admin.username

        self.repo_id = self.repo.id
        self.file_path = self.file
        self.file_name = os.path.basename(self.file_path)

        self.folder_path = self.folder

        self.copy_url = reverse('api2-fileops-copy', args=[self.repo_id])
        self.move_url = reverse('api2-fileops-move', args=[self.repo_id])

    def tearDown(self):
        self.remove_repo()

    def test_can_move_file(self):
        self.login_as(self.user)

        # check old file name exist
        assert self.file_name == self.get_lib_file_name(self.repo_id)

        # move file
        dst_repo_id = self.create_new_repo()
        data = {
            'file_names': self.file_name,
            'dst_repo': dst_repo_id,
            'dst_dir': '/',
        }

        resp = self.client.post(self.move_url, data)
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert json_resp[0]['obj_name'] == self.file_name
        assert json_resp[0]['repo_id'] == dst_repo_id
        assert json_resp[0]['parent_dir'] == '/'

        # check old file has been delete
        assert self.get_lib_file_name(self.repo_id) == None

        # check old file has been moved to dst repo
        assert self.file_name == self.get_lib_file_name(dst_repo_id)

        self.remove_repo(dst_repo_id)

    def test_can_copy_file(self):
        self.login_as(self.user)

        # check old file name exist
        assert self.file_name == self.get_lib_file_name(self.repo_id)

        # copy file
        dst_repo_id = self.create_new_repo()
        data = {
            'file_names': self.file_name,
            'dst_repo': dst_repo_id,
            'dst_dir': '/',
        }

        resp = self.client.post(self.copy_url, data)
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert json_resp[0]['obj_name'] == self.file_name
        assert json_resp[0]['repo_id'] == dst_repo_id
        assert json_resp[0]['parent_dir'] == '/'

        # check old file still existes
        assert self.file_name == self.get_lib_file_name(self.repo_id)

        # check old file has been copyd to dst repo
        assert self.file_name == self.get_lib_file_name(dst_repo_id)

        self.remove_repo(dst_repo_id)
