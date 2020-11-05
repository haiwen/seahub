# -*- coding: utf-8 -*-
import os
import json

from seaserv import seafile_api

from django.urls import reverse

from seahub.test_utils import BaseTestCase
from seahub.utils import check_filename_with_rename

from tests.common.utils import randstring

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

    def create_new_file(self, parent_dir='/'):
        new_file_name = '%s-中文' % randstring(6)
        seafile_api.post_empty_file(self.repo_id,
                parent_dir, new_file_name, self.user_name)

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
        self.delete_url = reverse('api2-fileops-delete', args=[self.repo_id])

    def tearDown(self):
        self.remove_repo()

    def test_can_copy(self):
        self.login_as(self.user)

        file_name_1 = self.create_new_file()
        file_name_2 = self.create_new_file()

        # check old file name exists in src repo
        assert file_name_1 in self.get_dirent_name_list(self.repo_id)
        assert file_name_2 in self.get_dirent_name_list(self.repo_id)

        dst_repo_id = self.create_new_repo()
        renamed_name_1 = check_filename_with_rename(dst_repo_id, '/', file_name_1)
        renamed_name_2 = check_filename_with_rename(dst_repo_id, '/', file_name_2)

        data = {
            'file_names': file_name_1 + ':' + file_name_2,
            'dst_repo': dst_repo_id,
            'dst_dir': '/',
        }

        ### copy for first time ###
        resp = self.client.post(self.copy_url, data)
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)

        assert json_resp[0]['repo_id'] == dst_repo_id
        assert json_resp[0]['parent_dir'] == '/'
        assert json_resp[0]['obj_name'] == renamed_name_1
        assert json_resp[1]['obj_name'] == renamed_name_2

        # check old file still existes
        assert file_name_1 in self.get_dirent_name_list(self.repo_id)
        assert file_name_2 in self.get_dirent_name_list(self.repo_id)
        # check old file has been copyd to dst repo with a new name
        assert renamed_name_1 in self.get_dirent_name_list(dst_repo_id)
        assert renamed_name_2 in self.get_dirent_name_list(dst_repo_id)

        ### copy for second time ###
        renamed_name_1 = check_filename_with_rename(dst_repo_id, '/', file_name_1)
        renamed_name_2 = check_filename_with_rename(dst_repo_id, '/', file_name_2)

        resp = self.client.post(self.copy_url, data)
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)

        assert json_resp[0]['repo_id'] == dst_repo_id
        assert json_resp[0]['parent_dir'] == '/'
        assert json_resp[0]['obj_name'] == renamed_name_1
        assert json_resp[1]['obj_name'] == renamed_name_2

        # check old file still existes
        assert file_name_1 in self.get_dirent_name_list(self.repo_id)
        assert file_name_2 in self.get_dirent_name_list(self.repo_id)
        # check old file has been copyd to dst repo with a new name
        assert renamed_name_1 in self.get_dirent_name_list(dst_repo_id)
        assert renamed_name_2 in self.get_dirent_name_list(dst_repo_id)

        ### copy for third time ###
        renamed_name_1 = check_filename_with_rename(dst_repo_id, '/', file_name_1)
        renamed_name_2 = check_filename_with_rename(dst_repo_id, '/', file_name_2)

        resp = self.client.post(self.copy_url, data)
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)

        assert json_resp[0]['repo_id'] == dst_repo_id
        assert json_resp[0]['parent_dir'] == '/'
        assert json_resp[0]['obj_name'] == renamed_name_1
        assert json_resp[1]['obj_name'] == renamed_name_2

        # check old file still existes
        assert file_name_1 in self.get_dirent_name_list(self.repo_id)
        assert file_name_2 in self.get_dirent_name_list(self.repo_id)
        # check old file has been copyd to dst repo with a new name
        assert renamed_name_1 in self.get_dirent_name_list(dst_repo_id)
        assert renamed_name_2 in self.get_dirent_name_list(dst_repo_id)

        self.remove_repo(dst_repo_id)

    def test_can_move(self):
        self.login_as(self.user)

        file_name_1 = self.create_new_file()
        file_name_2 = self.create_new_file()

        # check old file name exists in src repo
        assert file_name_1 in self.get_dirent_name_list(self.repo_id)
        assert file_name_2 in self.get_dirent_name_list(self.repo_id)

        dst_repo_id = self.create_new_repo()
        renamed_name_1 = check_filename_with_rename(dst_repo_id, '/', file_name_1)
        renamed_name_2 = check_filename_with_rename(dst_repo_id, '/', file_name_2)

        data = {
            'file_names': file_name_1 + ':' + file_name_2,
            'dst_repo': dst_repo_id,
            'dst_dir': '/',
        }

        # move files
        resp = self.client.post(self.move_url, data)
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)

        assert json_resp[0]['repo_id'] == dst_repo_id
        assert json_resp[0]['parent_dir'] == '/'
        assert json_resp[0]['obj_name'] == renamed_name_1
        assert json_resp[1]['obj_name'] == renamed_name_2

        # check old file NOT existes
        assert file_name_1 not in self.get_dirent_name_list(self.repo_id)
        assert file_name_2 not in self.get_dirent_name_list(self.repo_id)
        # check old file has been copyd to dst repo with a new name
        assert renamed_name_1 in self.get_dirent_name_list(dst_repo_id)
        assert renamed_name_2 in self.get_dirent_name_list(dst_repo_id)
        self.remove_repo(dst_repo_id)

    def test_can_delete(self):
        self.login_as(self.user)

        file_name_1 = self.create_new_file()
        file_name_2 = self.create_new_file()

        # check file exists in repo
        assert file_name_1 in self.get_dirent_name_list(self.repo_id)
        assert file_name_2 in self.get_dirent_name_list(self.repo_id)

        data = {
            'file_names': file_name_1 + ':' + file_name_2,
        }

        resp = self.client.post(self.delete_url + '?p=/', data)
        self.assertEqual(200, resp.status_code)

        # check file not existes
        assert file_name_1 not in self.get_dirent_name_list(self.repo_id)
        assert file_name_2 not in self.get_dirent_name_list(self.repo_id)
