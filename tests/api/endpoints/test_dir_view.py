# -*- coding: utf-8 -*-
import os
import json

from seaserv import seafile_api

from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase
from seahub.share.models import FileShare

from tests.common.utils import randstring

class FileViewTest(BaseTestCase):

    def create_new_repo(self):
        new_repo_id = seafile_api.create_repo(name='test-repo-2', desc='',
            username=self.user.username, passwd=None)

        return new_repo_id

    def get_lib_folder_name(self, repo_id):

        url = reverse('list_lib_dir', args=[repo_id])
        resp = self.client.get(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        json_resp = json.loads(resp.content)

        if len(json_resp['dirent_list']) == 0:
            return None

        return json_resp['dirent_list'][0]['obj_name']

    def setUp(self):
        self.repo_id = self.repo.id
        self.folder_path = self.folder
        self.folder_name = os.path.basename(self.folder_path)

        self.url = reverse('api-v2.1-dir-view', args=[self.repo_id])

    def tearDown(self):
        self.remove_repo()

    def test_can_get_dir(self):
        self.login_as(self.user)
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert json_resp[0]['type'] == 'dir'
        assert json_resp[0]['name'] == self.folder_name

    def test_can_create_folder(self):
        self.login_as(self.user)

        # delete old folder
        resp = self.client.delete(self.url + '?p=' + self.folder_path, {}, 'application/x-www-form-urlencoded')
        assert None == self.get_lib_folder_name(self.repo_id)

        # check folder has been deleted
        assert None == self.get_lib_folder_name(self.repo_id)

        new_name = randstring(6)
        new_folder_path = '/' + new_name

        # create file
        data = {
            'operation': 'mkdir',
        }
        resp = self.client.post(self.url + '?p=' + new_folder_path, data)

        self.assertEqual(200, resp.status_code)

        # check new folder has been created
        assert new_name == self.get_lib_folder_name(self.repo_id)

    def test_can_delete_folder(self):
        self.login_as(self.user)

        # check folder exist when init
        assert self.folder_name == self.get_lib_folder_name(self.repo_id)

        # delete folder
        resp = self.client.delete(self.url + '?p=' + self.folder_path, {}, 'application/x-www-form-urlencoded')
        assert None == self.get_lib_folder_name(self.repo_id)

        self.assertEqual(200, resp.status_code)

        # check folder has been deleted
        assert None == self.get_lib_folder_name(self.repo_id)

    def test_can_rename_folder(self):
        self.login_as(self.user)
        new_name = randstring(6)

        # check old folder exist
        assert self.folder_name == self.get_lib_folder_name(self.repo_id)

        data = {'operation': 'rename', 'newname': new_name}
        resp = self.client.post(self.url + '?p=' + self.folder_path, data)

        self.assertEqual(200, resp.status_code)
        # check old file has been renamed to new_name
        assert new_name == self.get_lib_folder_name(self.repo_id)

    def test_can_post_operation_invalid(self):
        self.login_as(self.user)

        data = {
            'operation': 'invalid',
        }
        resp = self.client.post(self.url + '?p=' + self.folder_path, data)

        self.assertEqual(400, resp.status_code)

