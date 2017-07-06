# -*- coding: utf-8 -*-
import os
import json
import posixpath

from seaserv import seafile_api

from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase
from seahub.utils import check_filename_with_rename

from tests.common.utils import randstring

try:
    from seahub.settings import LOCAL_PRO_DEV_ENV
except ImportError:
    LOCAL_PRO_DEV_ENV = False

class DirViewTest(BaseTestCase):

    def create_new_repo(self):
        new_repo_id = seafile_api.create_repo(name='test-repo-2', desc='',
            username=self.user.username, passwd=None)

        return new_repo_id

    def get_lib_folder_name(self, repo_id):

        url = reverse('list_lib_dir', args=[repo_id])
        resp = self.client.get(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        json_resp = json.loads(resp.content)

        if len(json_resp['dirent_list']) > 0:
            for dirent in json_resp['dirent_list']:
                if dirent.has_key('is_dir') and dirent['is_dir']:
                    return dirent['obj_name']
                else:
                    continue

        return None

    def setUp(self):
        self.repo_id = self.repo.id
        self.folder_path = self.folder
        self.folder_name = os.path.basename(self.folder_path)

        self.user_name = self.user.username
        self.admin_name = self.admin.username

        self.url = reverse('api-v2.1-dir-view', args=[self.repo_id])

    def tearDown(self):
        self.remove_repo()

    # for test http GET request
    def test_can_get_dir(self):
        self.login_as(self.user)
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert json_resp[0]['type'] == 'dir'
        assert json_resp[0]['name'] == self.folder_name

    def test_get_dir_with_invalid_perm(self):
        # login as admin, then get dir info in user's repo
        self.login_as(self.admin)
        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)

    # for test http POST request
    def test_post_operation_invalid(self):
        self.login_as(self.user)

        data = {'operation': 'invalid',}
        resp = self.client.post(self.url + '?p=' + self.folder_path, data)

        self.assertEqual(400, resp.status_code)

    def test_can_create_folder(self):
        self.login_as(self.user)

        # delete old folder
        resp = self.client.delete(self.url + '?p=' + self.folder_path,
                {}, 'application/x-www-form-urlencoded')
        assert None == self.get_lib_folder_name(self.repo_id)

        # check folder has been deleted
        assert None == self.get_lib_folder_name(self.repo_id)

        new_name = randstring(6)
        new_folder_path = '/' + new_name

        # create file
        data = {'operation': 'mkdir',}
        resp = self.client.post(self.url + '?p=' + new_folder_path, data)

        self.assertEqual(200, resp.status_code)

        # check new folder has been created
        assert new_name == self.get_lib_folder_name(self.repo_id)

    def test_can_create_same_name_folder(self):
        self.login_as(self.user)

        folder_name = os.path.basename(self.folder_path.rstrip('/'))
        new_name = check_filename_with_rename(self.repo_id, '/', folder_name)

        # create file
        data = {'operation': 'mkdir',}
        resp = self.client.post(self.url + '?p=' + self.folder_path, data)
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)

        # check new folder has been created
        assert new_name == json_resp['obj_name']

    def test_create_folder_with_invalid_repo_perm(self):

        # login as admin, then create dir in user's repo
        self.login_as(self.admin)

        new_name = randstring(6)
        new_folder_path = '/' + new_name

        # create file
        data = {'operation': 'mkdir',}
        resp = self.client.post(self.url + '?p=' + new_folder_path, data)
        self.assertEqual(403, resp.status_code)

    def test_create_folder_with_invalid_folder_perm(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        # share user's repo to admin with 'rw' permission
        seafile_api.share_repo(self.repo_id, self.user_name,
                self.admin_name, 'rw')

        # set sub-folder permisson as 'r' for admin
        seafile_api.add_folder_user_perm(self.repo_id,
                self.folder_path, 'r', self.admin_name)

        # admin can visit sub-folder with 'r' permission
        assert seafile_api.check_permission_by_path(self.repo_id,
                self.folder_path, self.admin_name) == 'r'

        # login as admin, then create dir in a 'r' permission folder
        self.login_as(self.admin)

        new_name = randstring(6)
        new_folder_path = posixpath.join(self.folder_path, new_name)
        data = {'operation': 'mkdir',}

        resp = self.client.post(self.url + '?p=' + new_folder_path, data)

        self.assertEqual(403, resp.status_code)

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

    def test_rename_folder_with_invalid_name(self):
        self.login_as(self.user)

        # check old folder exist
        assert self.folder_name == self.get_lib_folder_name(self.repo_id)

        data = {'operation': 'rename', 'newname': '123/456'}
        resp = self.client.post(self.url + '?p=' + self.folder_path, data)

        self.assertEqual(400, resp.status_code)

    def test_can_rename_folder_with_same_name(self):
        self.login_as(self.user)

        # check old folder exist
        assert self.folder_name == self.get_lib_folder_name(self.repo_id)

        # create a new folder
        new_name = randstring(6)
        data = {'operation': 'mkdir',}
        resp = self.client.post(self.url + '?p=/' + new_name, data)
        self.assertEqual(200, resp.status_code)

        # rename new folder with the same name of old folder
        old_folder_name = self.folder_name
        checked_name = check_filename_with_rename(self.repo_id,
                '/', old_folder_name)
        data = {'operation': 'rename', 'newname': checked_name}
        resp = self.client.post(self.url + '?p=/' + new_name, data)
        self.assertEqual(200, resp.status_code)

        # check old file has been renamed to new_name
        json_resp = json.loads(resp.content)
        print old_folder_name, new_name, checked_name
        assert checked_name == json_resp['obj_name']

    def test_rename_folder_with_invalid_repo_perm(self):

        # login as admin, then rename dir in user's repo
        self.login_as(self.admin)

        new_name = randstring(6)
        data = {'operation': 'rename', 'newname': new_name}

        resp = self.client.post(self.url + '?p=' + self.folder_path, data)
        self.assertEqual(403, resp.status_code)

    def test_rename_folder_with_invalid_folder_perm(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        # share user's repo to admin with 'rw' permission
        seafile_api.share_repo(self.repo_id, self.user_name,
                self.admin_name, 'rw')

        # set sub-folder permisson as 'r' for admin
        seafile_api.add_folder_user_perm(self.repo_id,
                self.folder_path, 'r', self.admin_name)

        # admin can visit sub-folder with 'r' permission
        assert seafile_api.check_permission_by_path(self.repo_id,
                self.folder_path, self.admin_name) == 'r'

        # login as admin, then rename a 'r' permission folder
        self.login_as(self.admin)

        new_name = randstring(6)
        data = {'operation': 'rename', 'newname': new_name}

        resp = self.client.post(self.url + '?p=' + self.folder_path, data)
        self.assertEqual(403, resp.status_code)

    def test_can_revert_folder(self):
        self.login_as(self.user)

        # first rename dir
        new_name = randstring(6)
        seafile_api.rename_file(self.repo_id, '/', self.folder_name,
                new_name, self.user_name)
        new_dir_path = '/' + new_name

        # get commit list
        commits = seafile_api.get_commit_list(self.repo_id, -1, -1)

        # then revert dir
        data = {
            'operation': 'revert',
            'commit_id': commits[0].id
        }
        resp = self.client.post(self.url + '?p=' + new_dir_path, data)

        self.assertEqual(200, resp.status_code)

    def test_revert_folder_with_invalid_user_permission(self):
        # first rename dir
        new_name = randstring(6)
        seafile_api.rename_file(self.repo_id, '/', self.folder_name,
                new_name, self.user_name)
        new_dir_path = '/' + new_name

        # get commit list
        commits = seafile_api.get_commit_list(self.repo_id, -1, -1)

        # then revert dir
        data = {
            'operation': 'revert',
            'commit_id': commits[0].id
        }
        resp = self.client.post(self.url + '?p=' + new_dir_path, data)
        self.assertEqual(403, resp.status_code)

    def test_revert_folder_with_r_permission(self):
        # first rename dir
        new_name = randstring(6)
        seafile_api.rename_file(self.repo_id, '/', self.folder_name,
                new_name, self.user_name)
        new_dir_path = '/' + new_name

        # get commit list
        commits = seafile_api.get_commit_list(self.repo_id, -1, -1)

        self.share_repo_to_admin_with_r_permission()
        self.login_as(self.admin)

        # then revert dir
        data = {
            'operation': 'revert',
            'commit_id': commits[0].id
        }
        resp = self.client.post(self.url + '?p=' + new_dir_path, data)
        self.assertEqual(403, resp.status_code)

    def test_revert_folder_without_commit_id(self):
        self.login_as(self.user)

        # then revert dir
        data = {
            'operation': 'revert',
        }
        resp = self.client.post(self.url + '?p=' + self.folder_path, data)
        self.assertEqual(400, resp.status_code)

    # for test http DELETE request
    def test_can_delete_folder(self):
        self.login_as(self.user)

        # check folder exist when init
        assert self.folder_name == self.get_lib_folder_name(self.repo_id)

        # delete folder
        resp = self.client.delete(self.url + '?p=' + self.folder_path,
                {}, 'application/x-www-form-urlencoded')
        assert None == self.get_lib_folder_name(self.repo_id)

        self.assertEqual(200, resp.status_code)

        # check folder has been deleted
        assert None == self.get_lib_folder_name(self.repo_id)

    def test_delete_folder_with_invalid_repo_perm(self):

        # login as admin, then delete dir in user's repo
        self.login_as(self.admin)
        resp = self.client.delete(self.url + '?p=' + self.folder_path,
                {}, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)

    def test_delete_folder_with_invalid_folder_perm(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        # share user's repo to admin with 'rw' permission
        seafile_api.share_repo(self.repo_id, self.user_name,
                self.admin_name, 'rw')

        # set sub-folder permisson as 'r' for admin
        seafile_api.add_folder_user_perm(self.repo_id,
                self.folder_path, 'r', self.admin_name)

        # admin can visit sub-folder with 'r' permission
        assert seafile_api.check_permission_by_path(self.repo_id,
                self.folder_path, self.admin_name) == 'r'

        # login as admin, then delete a 'r' permission folder
        self.login_as(self.admin)

        resp = self.client.delete(self.url + '?p=' + self.folder_path,
                {}, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)


class DirDetailViewTest(BaseTestCase):

    def setUp(self):
        self.repo_id = self.repo.id
        self.folder_path = self.folder
        self.folder_name = os.path.basename(self.folder_path)

        self.user_name = self.user.username
        self.admin_name = self.admin.username

        self.url = reverse('api-v2.1-dir-detail-view', args=[self.repo_id])

    def tearDown(self):
        self.remove_repo()

    def test_can_get_dir_detail(self):

        seafile_api.post_dir(self.repo_id, self.folder_path, randstring(3),
                self.user_name)
        seafile_api.post_empty_file(self.repo_id, self.folder_path, randstring(3),
                self.user_name)

        self.login_as(self.user)
        resp = self.client.get(self.url + '?path=%s' % self.folder_path)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert json_resp['name'] == self.folder_name
        assert json_resp['file_count'] == 1
        assert json_resp['dir_count'] == 1

    def test_get_dir_detail_with_invalid_perm(self):

        self.login_as(self.admin)

        resp = self.client.get(self.url + '?path=%s' % self.folder_path)
        self.assertEqual(403, resp.status_code)

    def test_get_dir_detail_without_path_parameter(self):

        self.login_as(self.user)

        resp = self.client.get(self.url)
        self.assertEqual(400, resp.status_code)

        resp = self.client.get(self.url + '?path=/')
        self.assertEqual(400, resp.status_code)
