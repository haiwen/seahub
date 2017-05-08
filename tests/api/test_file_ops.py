# -*- coding: utf-8 -*-
import os
import json

from seaserv import seafile_api

from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase
from seahub.utils import check_filename_with_rename

class FileOpsApiTest(BaseTestCase):

    def create_new_repo(self):
        new_repo_id = seafile_api.create_repo(name='test-repo-2', desc='',
            username=self.user.username, passwd=None)

        return new_repo_id

    def get_dirent_name_list(self, repo_id):

        url = reverse('list_lib_dir', args=[repo_id])
        resp = self.client.get(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        json_resp = json.loads(resp.content)

        if len(json_resp['dirent_list']) > 0:
            dirent_name_list = []
            for dirent in json_resp['dirent_list']:
                dirent_name_list.append(dirent['obj_name'])

        return dirent_name_list

    def create_new_file(self):
        new_file_name = u'file-中文'
        seafile_api.post_empty_file(self.repo_id,
                '/', new_file_name, self.user_name)

        return new_file_name

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

    def test_can_move(self):
        self.login_as(self.user)

        file_name = self.create_new_file()

        # check old file name exists in src repo
        assert file_name in self.get_dirent_name_list(self.repo_id)

        dst_repo_id = self.create_new_repo()
        data = {
            'file_names': file_name,
            'dst_repo': dst_repo_id,
            'dst_dir': '/',
        }

        ### copy for first time ###
        renamed_name = check_filename_with_rename(dst_repo_id, '/', file_name)
        resp = self.client.post(self.copy_url, data)
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert json_resp[0]['obj_name'] == renamed_name
        assert json_resp[0]['repo_id'] == dst_repo_id
        assert json_resp[0]['parent_dir'] == '/'

        # check old file still existes
        assert file_name in self.get_dirent_name_list(self.repo_id)
        # check old file has been copyd to dst repo with a new name
        assert renamed_name in self.get_dirent_name_list(dst_repo_id)

        ### copy for second time ###
        renamed_name = check_filename_with_rename(dst_repo_id, '/', file_name)
        resp = self.client.post(self.copy_url, data)
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert json_resp[0]['obj_name'] == renamed_name
        assert json_resp[0]['repo_id'] == dst_repo_id
        assert json_resp[0]['parent_dir'] == '/'

        # check old file still exists in src repo
        assert file_name in self.get_dirent_name_list(self.repo_id)
        # check old file has been copyd to dst repo with a new name
        assert renamed_name in self.get_dirent_name_list(dst_repo_id)

        ### copy for third time ###
        renamed_name = check_filename_with_rename(dst_repo_id, '/', file_name)
        resp = self.client.post(self.copy_url, data)
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert json_resp[0]['obj_name'] == renamed_name
        assert json_resp[0]['repo_id'] == dst_repo_id
        assert json_resp[0]['parent_dir'] == '/'

        # check old file still exists in src repo
        assert file_name in self.get_dirent_name_list(self.repo_id)
        # check old file has been copyd to dst repo with a new name
        assert renamed_name in self.get_dirent_name_list(dst_repo_id)

        ### then move ###
        renamed_name = check_filename_with_rename(dst_repo_id, '/', file_name)
        resp = self.client.post(self.move_url, data)
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert json_resp[0]['obj_name'] == renamed_name
        assert json_resp[0]['repo_id'] == dst_repo_id
        assert json_resp[0]['parent_dir'] == '/'

        # check old file NOT exists in src repo
        assert file_name not in self.get_dirent_name_list(self.repo_id)
        # check old file has been copyd to dst repo with a new name
        assert renamed_name in self.get_dirent_name_list(dst_repo_id)

        self.remove_repo(dst_repo_id)

    def test_can_copy(self):
        self.login_as(self.user)

        file_name = self.create_new_file()

        # check old file name exists in src repo
        assert file_name in self.get_dirent_name_list(self.repo_id)

        dst_repo_id = self.create_new_repo()
        data = {
            'file_names': file_name,
            'dst_repo': dst_repo_id,
            'dst_dir': '/',
        }

        ### copy for first time ###
        renamed_name = check_filename_with_rename(dst_repo_id, '/', file_name)
        resp = self.client.post(self.copy_url, data)
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert json_resp[0]['obj_name'] == renamed_name
        assert json_resp[0]['repo_id'] == dst_repo_id
        assert json_resp[0]['parent_dir'] == '/'

        # check old file still existes
        assert file_name in self.get_dirent_name_list(self.repo_id)
        # check old file has been copyd to dst repo with a new name
        assert renamed_name in self.get_dirent_name_list(dst_repo_id)

        ### copy for second time ###
        renamed_name = check_filename_with_rename(dst_repo_id, '/', file_name)
        resp = self.client.post(self.copy_url, data)
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert json_resp[0]['obj_name'] == renamed_name
        assert json_resp[0]['repo_id'] == dst_repo_id
        assert json_resp[0]['parent_dir'] == '/'

        # check old file still exists in src repo
        assert file_name in self.get_dirent_name_list(self.repo_id)
        # check old file has been copyd to dst repo with a new name
        assert renamed_name in self.get_dirent_name_list(dst_repo_id)

        ### copy for third time ###
        renamed_name = check_filename_with_rename(dst_repo_id, '/', file_name)
        resp = self.client.post(self.copy_url, data)
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert json_resp[0]['obj_name'] == renamed_name
        assert json_resp[0]['repo_id'] == dst_repo_id
        assert json_resp[0]['parent_dir'] == '/'

        # check old file still exists in src repo
        assert file_name in self.get_dirent_name_list(self.repo_id)
        # check old file has been copyd to dst repo with a new name
        assert renamed_name in self.get_dirent_name_list(dst_repo_id)

        self.remove_repo(dst_repo_id)
