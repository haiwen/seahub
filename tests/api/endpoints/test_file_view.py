# -*- coding: utf-8 -*-
import os
import json

from seaserv import seafile_api

from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase
from seahub.share.models import FileShare

from tests.common.utils import randstring

try:
    from seahub.settings import LOCAL_PRO_DEV_ENV
except ImportError:
    LOCAL_PRO_DEV_ENV = False


class FileViewTest(BaseTestCase):

    def create_new_repo(self):
        new_repo_id = seafile_api.create_repo(name='test-repo-2', desc='',
            username=self.user.username, passwd=None)

        return new_repo_id

    def get_lib_file_name(self, repo_id):

        url = reverse('list_lib_dir', args=[repo_id])
        resp = self.client.get(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        json_resp = json.loads(resp.content)

        if len(json_resp['dirent_list']) == 0:
            return None

        return json_resp['dirent_list'][0]['obj_name']

    def setUp(self):
        self.repo_id = self.repo.id
        self.file_path = self.file
        self.file_name = os.path.basename(self.file_path)

        self.url = reverse('api-v2.1-file-view', args=[self.repo_id])

    def tearDown(self):
        self.remove_repo()

    def test_can_get_file_download_url(self):
        self.login_as(self.user)
        resp = self.client.get(self.url + '?p=' + self.file_path)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert '8082' in json_resp['url']

    def test_can_get_file_downloadblks_info(self):
        file_id = seafile_api.get_file_id_by_path(self.repo_id, self.file_path)

        self.login_as(self.user)
        resp = self.client.get(self.url + '?p=' + self.file_path + '&op=downloadblks')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['file_id'] == file_id

    def test_can_get_file_share_link_info(self):
        fs = FileShare.objects.create_file_link(self.user.username,
            self.repo_id, self.file_path, None, None)

        self.login_as(self.user)

        resp = self.client.get(self.url + '?p=' + self.file_path + '&op=sharelink')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert fs.token in json_resp['link']

    def test_get_operation_invalid(self):
        self.login_as(self.user)
        resp = self.client.get(self.url + '?p=' + self.file_path + '&op=invalid')
        self.assertEqual(400, resp.status_code)

    def test_can_rename_file(self):
        self.login_as(self.user)
        new_name = randstring(6)

        # check old file name exist
        assert self.file_name == self.get_lib_file_name(self.repo_id)

        data = {'operation': 'rename', 'newname': new_name}
        resp = self.client.post(self.url + '?p=' + self.file_path, data)

        self.assertEqual(200, resp.status_code)
        # check old file has been renamed to new_name
        assert new_name == self.get_lib_file_name(self.repo_id)

    def test_can_move_file(self):
        self.login_as(self.user)

        # check old file name exist
        assert self.file_name == self.get_lib_file_name(self.repo_id)

        # move file
        dst_repo_id = self.create_new_repo()
        data = {
            'operation': 'move',
            'dst_repo': dst_repo_id,
            'dst_dir': '/',
        }
        resp = self.client.post(self.url + '?p=' + self.file_path, data)

        self.assertEqual(200, resp.status_code)

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
            'operation': 'copy',
            'dst_repo': dst_repo_id,
            'dst_dir': '/',
        }
        resp = self.client.post(self.url + '?p=' + self.file_path, data)

        self.assertEqual(200, resp.status_code)

        # check old file still in old repo
        assert self.file_name == self.get_lib_file_name(self.repo_id)

        # check old file has been moved to dst repo
        assert self.file_name == self.get_lib_file_name(dst_repo_id)

        self.remove_repo(dst_repo_id)

    def test_can_delete_file(self):
        self.login_as(self.user)

        # check old file name exist
        assert self.file_name == self.get_lib_file_name(self.repo_id)

        # delete file
        resp = self.client.delete(self.url + '?p=' + self.file_path, {}, 'application/x-www-form-urlencoded')

        self.assertEqual(200, resp.status_code)

        # check old file has been deleted
        assert None == self.get_lib_file_name(self.repo_id)

    def test_can_create_file(self):
        self.login_as(self.user)
        # delete old file
        resp = self.client.delete(self.url + '?p=' + self.file_path, {}, 'application/x-www-form-urlencoded')
        assert None == self.get_lib_file_name(self.repo_id)

        new_name = randstring(6)
        new_file_path = '/' + new_name

        # create file
        data = {
            'operation': 'create',
        }
        resp = self.client.post(self.url + '?p=' + new_file_path, data)

        self.assertEqual(200, resp.status_code)

        # check old file still in old repo
        assert new_name == self.get_lib_file_name(self.repo_id)

    def test_post_operation_invalid(self):
        self.login_as(self.user)
        # create file
        data = {
            'operation': 'invalid',
        }
        resp = self.client.post(self.url + '?p=' + self.file_path, data)
        self.assertEqual(400, resp.status_code)

    def test_can_lock_file(self):
        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.user)

        # check file NOT locked when init
        return_value = seafile_api.check_file_lock(self.repo_id,
            self.file_path.lstrip('/'), self.user.username)

        assert return_value == 0

        # lock file
        data = 'operation=lock'
        resp = self.client.put(self.url + '?p=' + self.file_path, data, 'application/x-www-form-urlencoded')

        self.assertEqual(200, resp.status_code)

        # check file has been locked
        return_value = seafile_api.check_file_lock(self.repo_id,
            self.file_path.lstrip('/'), self.user.username)
        assert return_value == 2

    def test_can_unlock_file(self):
        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.user)

        # lock file for test
        seafile_api.lock_file(self.repo_id, self.file_path.lstrip('/'),
                self.user.username, -1)

        # check file has been locked when init
        return_value = seafile_api.check_file_lock(self.repo_id,
            self.file_path.lstrip('/'), self.user.username)
        assert return_value == 2

        # unlock file
        data = 'operation=unlock'
        resp = self.client.put(self.url + '?p=' + self.file_path, data, 'application/x-www-form-urlencoded')

        self.assertEqual(200, resp.status_code)

        # check file has been unlocked
        return_value = seafile_api.check_file_lock(self.repo_id,
            self.file_path.lstrip('/'), self.user.username)
        assert return_value == 0
