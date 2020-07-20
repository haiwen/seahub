# -*- coding: utf-8 -*-
import os
import json
import posixpath

from seaserv import seafile_api

from django.urls import reverse

from seahub.test_utils import BaseTestCase
from seahub.utils import check_filename_with_rename
from seahub.utils.file_revisions import get_all_file_revisions

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

    def admin_create_new_repo(self):
        new_repo_id = seafile_api.create_repo(name='test-repo-2', desc='',
            username=self.admin.username, passwd=None)

        return new_repo_id

    def get_lib_file_name(self, repo_id):

        url = reverse('list_lib_dir', args=[repo_id])
        resp = self.client.get(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        json_resp = json.loads(resp.content)

        if len(json_resp['dirent_list']) > 0:
            for dirent in json_resp['dirent_list']:
                if 'is_file' in dirent and dirent['is_file']:
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

        self.url = reverse('api-v2.1-file-view', args=[self.repo_id])

    def tearDown(self):
        self.remove_repo()

    # for test http GET request
    def test_can_get_file_info(self):
        self.login_as(self.user)
        resp = self.client.get(self.url + '?p=' + self.file_path)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert self.file_name == json_resp['obj_name']

    def test_get_file_info_with_invalid_perm(self):
        # login as admin, then visit user's file
        self.login_as(self.admin)
        resp = self.client.get(self.url + '?p=' + self.file_path)
        self.assertEqual(403, resp.status_code)

    # for test http POST request
    def test_post_operation_invalid(self):
        self.login_as(self.user)
        data = {'operation': 'invalid',}
        resp = self.client.post(self.url + '?p=' + self.file_path, data)
        self.assertEqual(400, resp.status_code)

    def test_can_create_file(self):
        self.login_as(self.user)

        # delete old file
        resp = self.client.delete(self.url + '?p=' + self.file_path,
                {}, 'application/x-www-form-urlencoded')
        assert None == self.get_lib_file_name(self.repo_id)

        new_name = randstring(6)
        new_file_path = '/' + new_name
        data = {'operation': 'create',}

        # create file
        resp = self.client.post(self.url + '?p=' + new_file_path, data)
        self.assertEqual(200, resp.status_code)

        # check new file in repo
        assert new_name == self.get_lib_file_name(self.repo_id)

    def test_can_create_same_name_file(self):
        self.login_as(self.user)

        file_name = os.path.basename(self.file_path.rstrip('/'))
        new_name = check_filename_with_rename(self.repo_id, '/', file_name)
        data = {'operation': 'create',}

        # create file
        resp = self.client.post(self.url + '?p=' + self.file_path, data)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        # check new folder has been created
        assert new_name == json_resp['obj_name']

    def test_create_file_with_invalid_repo_perm(self):

        # login as admin, then create file in user's repo
        self.login_as(self.admin)

        new_name = randstring(6)
        new_file_path = '/' + new_name
        data = {'operation': 'create',}

        resp = self.client.post(self.url + '?p=' + new_file_path, data)
        self.assertEqual(403, resp.status_code)

    def test_create_file_with_invalid_folder_perm(self):

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

        # login as admin, then create file in a 'r' permission folder
        self.login_as(self.admin)

        new_name = randstring(6)
        new_file_path = posixpath.join(self.folder_path, new_name)
        data = {'operation': 'create',}

        resp = self.client.post(self.url + '?p=' + new_file_path, data)
        self.assertEqual(403, resp.status_code)

    def test_can_rename_file(self):
        self.login_as(self.user)
        new_name = randstring(6)

        # check old file exist
        assert self.file_name == self.get_lib_file_name(self.repo_id)

        data = {'operation': 'rename', 'newname': new_name}
        resp = self.client.post(self.url + '?p=' + self.file_path, data)
        self.assertEqual(200, resp.status_code)

        # check old file has been renamed to new_name
        assert new_name == self.get_lib_file_name(self.repo_id)

    def test_rename_file_with_invalid_name(self):
        self.login_as(self.user)

        # check old file exist
        assert self.file_name == self.get_lib_file_name(self.repo_id)

        data = {'operation': 'rename', 'newname': '123/456'}
        resp = self.client.post(self.url + '?p=' + self.file_path, data)
        self.assertEqual(400, resp.status_code)

    def test_can_rename_file_with_same_name(self):
        self.login_as(self.user)

        # check old file exist
        assert self.file_name == self.get_lib_file_name(self.repo_id)

        # create a new file
        new_name = randstring(6)
        data = {'operation': 'create',}
        resp = self.client.post(self.url + '?p=/' + new_name, data)
        self.assertEqual(200, resp.status_code)

        # rename new file with the same of the old file
        old_file_name = self.file_name
        checked_name = check_filename_with_rename(self.repo_id,
                '/', old_file_name)
        data = {'operation': 'rename', 'newname': checked_name}
        resp = self.client.post(self.url + '?p=/' + new_name, data)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert checked_name == json_resp['obj_name']

    def test_rename_file_with_invalid_repo_perm(self):

        # login as admin, then rename file in user's repo
        self.login_as(self.admin)

        new_name = randstring(6)
        data = {'operation': 'rename', 'newname': new_name}

        resp = self.client.post(self.url + '?p=' + self.file_path, data)
        self.assertEqual(403, resp.status_code)

    def test_rename_file_with_invalid_folder_perm(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        # create a file as old file in user repo sub-folder
        old_file_name = randstring(6)
        seafile_api.post_empty_file(repo_id=self.repo_id,
                parent_dir=self.folder_path, filename=old_file_name,
                username=self.user_name)

        # share user's repo to admin with 'rw' permission
        seafile_api.share_repo(self.repo_id, self.user_name,
                self.admin_name, 'rw')

        # set sub-folder permisson as 'r' for admin
        seafile_api.add_folder_user_perm(self.repo_id,
                self.folder_path, 'r', self.admin_name)

        # admin can visit old file with 'r' permission
        old_file_path = posixpath.join(self.folder_path, old_file_name)
        assert seafile_api.check_permission_by_path(self.repo_id,
                old_file_path, self.admin_name) == 'r'

        # login as admin, then rename a 'r' permission old file
        self.login_as(self.admin)

        new_name = randstring(6)
        data = {'operation': 'rename', 'newname': new_name}

        resp = self.client.post(self.url + '?p=' + old_file_path, data)
        self.assertEqual(403, resp.status_code)

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

    def test_move_file_with_invalid_src_repo_perm(self):

        # login as admin, then move file in user's repo
        self.login_as(self.admin)

        dst_repo_id = self.admin_create_new_repo()
        data = {
            'operation': 'move',
            'dst_repo': dst_repo_id,
            'dst_dir': '/',
        }

        resp = self.client.post(self.url + '?p=' + self.file_path, data)
        self.assertEqual(403, resp.status_code)

    def test_move_file_with_invalid_src_folder_perm(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        # create a file as old file in user repo sub-folder
        old_file_name = randstring(6)
        seafile_api.post_empty_file(repo_id=self.repo_id,
                parent_dir=self.folder_path, filename=old_file_name,
                username=self.user_name)

        # share user's repo to admin with 'rw' permission
        seafile_api.share_repo(self.repo_id, self.user_name,
                self.admin_name, 'rw')

        # set sub-folder permisson as 'r' for admin
        seafile_api.add_folder_user_perm(self.repo_id,
                self.folder_path, 'r', self.admin_name)

        # admin can visit old file with 'r' permission
        old_file_path = posixpath.join(self.folder_path, old_file_name)
        assert seafile_api.check_permission_by_path(self.repo_id,
                old_file_path, self.admin_name) == 'r'

        # login as admin, then move a 'r' permission file
        self.login_as(self.admin)

        dst_repo_id = self.admin_create_new_repo()
        data = {
            'operation': 'move',
            'dst_repo': dst_repo_id,
            'dst_dir': '/',
        }

        resp = self.client.post(self.url + '?p=' + old_file_path, data)

        self.assertEqual(403, resp.status_code)

    def test_move_file_with_invalid_dst_repo_perm(self):

        # login as user, then move file to admin's repo
        self.login_as(self.user)

        # create new repo for admin
        dst_repo_id = self.admin_create_new_repo()
        data = {
            'operation': 'move',
            'dst_repo': dst_repo_id,
            'dst_dir': '/',
        }
        resp = self.client.post(self.url + '?p=' + self.file_path, data)

        self.assertEqual(403, resp.status_code)

    def test_move_file_with_invalid_dst_folder_perm(self):

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

        # create a file for admin repo
        admin_repo_id = self.admin_create_new_repo()
        admin_file_name = randstring(6)
        seafile_api.post_empty_file(repo_id=admin_repo_id,
                parent_dir='/', filename=admin_file_name,
                username=self.admin_name)

        # login as admin, then move file to a 'r' permission folder
        self.login_as(self.admin)

        # create new repo for admin
        data = {
            'operation': 'move',
            'dst_repo': self.repo_id,
            'dst_dir': self.folder_path,
        }

        url = reverse('api-v2.1-file-view', args=[admin_repo_id])
        resp = self.client.post(url + '?p=/' + admin_file_name, data)
        self.assertEqual(403, resp.status_code)

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

    def test_copy_file_with_invalid_src_repo_perm(self):

        # login as admin, then copy file in user's repo
        self.login_as(self.admin)

        # copy file
        dst_repo_id = self.admin_create_new_repo()
        data = {
            'operation': 'copy',
            'dst_repo': dst_repo_id,
            'dst_dir': '/',
        }
        resp = self.client.post(self.url + '?p=' + self.file_path, data)

        self.assertEqual(403, resp.status_code)

    def test_copy_file_with_invalid_dst_repo_perm(self):

        # login as user, then copy file to admin's repo
        self.login_as(self.user)

        # create new repo for admin
        dst_repo_id = self.admin_create_new_repo()
        data = {
            'operation': 'copy',
            'dst_repo': dst_repo_id,
            'dst_dir': '/',
        }
        resp = self.client.post(self.url + '?p=' + self.file_path, data)

        self.assertEqual(403, resp.status_code)

    def test_copy_file_with_invalid_dst_folder_perm(self):

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

        # create a file for admin repo
        admin_repo_id = self.admin_create_new_repo()
        admin_file_name = randstring(6)
        seafile_api.post_empty_file(repo_id=admin_repo_id,
                parent_dir='/', filename=admin_file_name,
                username=self.admin_name)

        # login as admin, then move file to a 'r' permission folder
        self.login_as(self.admin)

        # create new repo for admin
        data = {
            'operation': 'copy',
            'dst_repo': self.repo_id,
            'dst_dir': self.folder_path,
        }

        url = reverse('api-v2.1-file-view', args=[admin_repo_id])
        resp = self.client.post(url + '?p=/' + admin_file_name, data)
        self.assertEqual(403, resp.status_code)

    def test_can_revert_file(self):
        self.login_as(self.user)

        # first rename file
        new_name = randstring(6)
        seafile_api.rename_file(self.repo_id, '/', self.file_name,
                new_name, self.user_name)
        new_file_path = '/' + new_name

        # get file revisions
        commits = get_all_file_revisions(self.repo_id, new_file_path)

        # then revert file
        data = {
            'operation': 'revert',
            'commit_id': commits[0].id
        }
        resp = self.client.post(self.url + '?p=' + new_file_path, data)

        self.assertEqual(200, resp.status_code)

    def test_revert_file_with_invalid_user_permission(self):
        # first rename file
        new_name = randstring(6)
        seafile_api.rename_file(self.repo_id, '/', self.file_name,
                new_name, self.user_name)
        new_file_path = '/' + new_name

        # get file revisions
        commits = get_all_file_revisions(self.repo_id, new_file_path)

        # then revert file
        data = {
            'operation': 'revert',
            'commit_id': commits[0].id
        }
        resp = self.client.post(self.url + '?p=' + new_file_path, data)
        self.assertEqual(403, resp.status_code)

    def test_revert_file_with_r_permission(self):
        # first rename file
        new_name = randstring(6)
        seafile_api.rename_file(self.repo_id, '/', self.file_name,
                new_name, self.user_name)
        new_file_path = '/' + new_name

        # get file revisions
        commits = get_all_file_revisions(self.repo_id, new_file_path)

        self.share_repo_to_admin_with_r_permission()
        self.login_as(self.admin)
        # then revert file
        data = {
            'operation': 'revert',
            'commit_id': commits[0].id
        }
        resp = self.client.post(self.url + '?p=' + new_file_path, data)
        self.assertEqual(403, resp.status_code)

    def test_revert_file_without_commit_id(self):
        self.login_as(self.user)
        data = {
            'operation': 'revert',
        }
        resp = self.client.post(self.url + '?p=' + self.file_path, data)
        self.assertEqual(400, resp.status_code)

    # for test http PUT request
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

    def test_lock_file_with_invalid_repo_perm(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        # login as admin, then lock file in user's repo
        self.login_as(self.admin)

        # lock file
        data = 'operation=lock'
        resp = self.client.put(self.url + '?p=' + self.file_path, data, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)

    def test_lock_file_with_invalid_folder_perm(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        # create a file in user repo sub-folder
        file_name = randstring(6)
        seafile_api.post_empty_file(repo_id=self.repo_id,
                parent_dir=self.folder_path, filename=file_name,
                username=self.user_name)

        # share user's repo to admin with 'rw' permission
        seafile_api.share_repo(self.repo_id, self.user_name,
                self.admin_name, 'rw')

        # set sub-folder permisson as 'r' for admin
        seafile_api.add_folder_user_perm(self.repo_id,
                self.folder_path, 'r', self.admin_name)

        # admin can visit file with 'r' permission
        file_path = posixpath.join(self.folder_path, file_name)
        assert seafile_api.check_permission_by_path(self.repo_id,
                file_path, self.admin_name) == 'r'

        # login as admin, then lock a 'r' permission file
        self.login_as(self.admin)

        data = 'operation=lock'
        resp = self.client.put(self.url + '?p=' + file_path,
                data, 'application/x-www-form-urlencoded')

        self.assertEqual(403, resp.status_code)

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

    def test_unlock_file_with_invalid_repo_perm(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        # login as admin, then unlock file in user's repo
        self.login_as(self.admin)

        # unlock file
        data = 'operation=unlock'
        resp = self.client.put(self.url + '?p=' + self.file_path, data, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)

    def test_unlock_file_with_invalid_folder_perm(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        # create a file in user repo sub-folder
        file_name = randstring(6)
        seafile_api.post_empty_file(repo_id=self.repo_id,
                parent_dir=self.folder_path, filename=file_name,
                username=self.user_name)

        # share user's repo to admin with 'rw' permission
        seafile_api.share_repo(self.repo_id, self.user_name,
                self.admin_name, 'rw')

        # set sub-folder permisson as 'r' for admin
        seafile_api.add_folder_user_perm(self.repo_id,
                self.folder_path, 'r', self.admin_name)

        # admin can visit file with 'r' permission
        file_path = posixpath.join(self.folder_path, file_name)
        assert seafile_api.check_permission_by_path(self.repo_id,
                file_path, self.admin_name) == 'r'

        # login as admin, then lock a 'r' permission file
        self.login_as(self.admin)

        data = 'operation=unlock'
        resp = self.client.put(self.url + '?p=' + file_path,
                data, 'application/x-www-form-urlencoded')

        self.assertEqual(403, resp.status_code)

    # for test http DELETE request
    def test_can_delete_file(self):
        self.login_as(self.user)

        # check old file name exist
        assert self.file_name == self.get_lib_file_name(self.repo_id)

        # delete file
        resp = self.client.delete(self.url + '?p=' + self.file_path,
                {}, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        # check old file has been deleted
        assert None == self.get_lib_file_name(self.repo_id)

    def test_delete_file_with_invalid_repo_perm(self):

        # login as admin, then delete file in user's repo
        self.login_as(self.admin)

        # delete file
        resp = self.client.delete(self.url + '?p=' + self.file_path,
                {}, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)

    def test_delete_file_with_invalid_folder_perm(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        # create a file in user repo sub-folder
        file_name = randstring(6)
        seafile_api.post_empty_file(repo_id=self.repo_id,
                parent_dir=self.folder_path, filename=file_name,
                username=self.user_name)

        # share user's repo to admin with 'rw' permission
        seafile_api.share_repo(self.repo_id, self.user_name,
                self.admin_name, 'rw')

        # set sub-folder permisson as 'r' for admin
        seafile_api.add_folder_user_perm(self.repo_id,
                self.folder_path, 'r', self.admin_name)

        # admin can visit file with 'r' permission
        file_path = posixpath.join(self.folder_path, file_name)
        assert seafile_api.check_permission_by_path(self.repo_id,
                file_path, self.admin_name) == 'r'

        # login as admin, then delete a 'r' permission file
        self.login_as(self.admin)

        resp = self.client.delete(self.url + '?p=' + file_path,
                {}, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)
