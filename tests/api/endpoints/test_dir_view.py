# -*- coding: utf-8 -*-
import os
import json
import posixpath

from seaserv import seafile_api

from django.urls import reverse

from seahub.test_utils import BaseTestCase
from seahub.utils import check_filename_with_rename

from tests.common.utils import randstring
from seahub.settings import THUMBNAIL_ROOT

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
                if 'is_dir' in dirent and dirent['is_dir']:
                    return dirent['obj_name']
                else:
                    continue

        return None

    def setUp(self):
        self.repo_id = self.repo.id

        self.file_path = self.file
        self.file_name = os.path.basename(self.file_path.rstrip('/'))

        self.folder_path = self.folder
        self.folder_name = os.path.basename(self.folder_path)

        self.user_name = self.user.username
        self.admin_name = self.admin.username

        self.url = reverse('api-v2.1-dir-view', args=[self.repo_id])

    def tearDown(self):
        self.remove_repo()

    # for test http GET request
    def test_can_get(self):

        self.login_as(self.user)
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert len(json_resp['dirent_list']) == 2

        assert json_resp['dirent_list'][0]['type'] == 'dir'
        assert json_resp['dirent_list'][0]['name'] == self.folder_name

        assert json_resp['dirent_list'][1]['type'] == 'file'
        assert json_resp['dirent_list'][1]['name'] == self.file_name

    def test_can_get_with_dir_type_parameter(self):

        self.login_as(self.user)
        resp = self.client.get(self.url + '?t=d')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert len(json_resp['dirent_list']) == 1
        assert json_resp['dirent_list'][0]['type'] == 'dir'
        assert json_resp['dirent_list'][0]['name'] == self.folder_name

    def test_can_get_with_file_type_parameter(self):

        self.login_as(self.user)
        resp = self.client.get(self.url + '?t=f')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert len(json_resp['dirent_list']) == 1
        assert json_resp['dirent_list'][0]['type'] == 'file'
        assert json_resp['dirent_list'][0]['name'] == self.file_name

    def test_can_get_with_recursive_parameter(self):

        # create a sub folder
        new_dir_name = randstring(6)
        seafile_api.post_dir(self.repo_id, self.folder_path,
                new_dir_name, self.user_name)

        self.login_as(self.user)
        resp = self.client.get(self.url + '?recursive=1')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert len(json_resp['dirent_list']) == 3
        assert json_resp['dirent_list'][0]['type'] == 'dir'
        assert json_resp['dirent_list'][0]['name'] == self.folder_name
        assert json_resp['dirent_list'][0]['parent_dir'] == '/'

        assert json_resp['dirent_list'][1]['type'] == 'dir'
        assert json_resp['dirent_list'][1]['name'] == new_dir_name
        assert json_resp['dirent_list'][1]['parent_dir'] == self.folder_path

        assert json_resp['dirent_list'][2]['type'] == 'file'
        assert json_resp['dirent_list'][2]['name'] == self.file_name

    def test_can_get_with_recursive_and_dir_type_parameter(self):

        # create a sub folder
        new_dir_name = randstring(6)
        seafile_api.post_dir(self.repo_id, self.folder_path,
                new_dir_name, self.user_name)

        self.login_as(self.user)
        resp = self.client.get(self.url + '?recursive=1&t=d')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert len(json_resp['dirent_list']) == 2
        assert json_resp['dirent_list'][0]['type'] == 'dir'
        assert json_resp['dirent_list'][0]['name'] == self.folder_name
        assert json_resp['dirent_list'][0]['parent_dir'] == '/'

        assert json_resp['dirent_list'][1]['type'] == 'dir'
        assert json_resp['dirent_list'][1]['name'] == new_dir_name
        assert json_resp['dirent_list'][1]['parent_dir'] == self.folder_path

    def test_can_get_with_recursive_and_file_type_parameter(self):

        # create a sub folder
        new_dir_name = randstring(6)
        seafile_api.post_dir(self.repo_id, self.folder_path,
                new_dir_name, self.user_name)

        self.login_as(self.user)
        resp = self.client.get(self.url + '?recursive=1&t=f')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert len(json_resp['dirent_list']) == 1
        assert json_resp['dirent_list'][0]['type'] == 'file'
        assert json_resp['dirent_list'][0]['name'] == self.file_name

    def test_can_get_file_with_lock_info(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.user)

        # no lock owner info returned
        resp = self.client.get(self.url + '?t=f')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp['dirent_list']) == 1
        assert json_resp['dirent_list'][0]['type'] == 'file'
        assert json_resp['dirent_list'][0]['name'] == self.file_name
        assert json_resp['dirent_list'][0]['lock_owner'] == ''

        # lock file
        seafile_api.lock_file(self.repo_id, self.file_path, self.admin_name, 1)

        # return lock owner info
        resp = self.client.get(self.url + '?t=f')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp['dirent_list']) == 1
        assert json_resp['dirent_list'][0]['type'] == 'file'
        assert json_resp['dirent_list'][0]['name'] == self.file_name
        assert json_resp['dirent_list'][0]['lock_owner'] == self.admin_name

    def test_can_get_file_with_star_info(self):

        self.login_as(self.user)

        # file is not starred
        resp = self.client.get(self.url + '?t=f')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp['dirent_list']) == 1
        assert json_resp['dirent_list'][0]['type'] == 'file'
        assert json_resp['dirent_list'][0]['name'] == self.file_name
        assert json_resp['dirent_list'][0]['starred'] == False

        # star file
        resp = self.client.post(reverse('starredfiles'), {'repo_id': self.repo.id, 'p': self.file_path})
        self.assertEqual(201, resp.status_code)

        # file is starred
        resp = self.client.get(self.url + '?t=f')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp['dirent_list']) == 1
        assert json_resp['dirent_list'][0]['type'] == 'file'
        assert json_resp['dirent_list'][0]['name'] == self.file_name
        assert json_resp['dirent_list'][0]['starred'] == True

    def test_can_get_file_with_tag_info(self):

        self.login_as(self.user)

        # file has no tags
        resp = self.client.get(self.url + '?t=f')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp['dirent_list']) == 1
        assert json_resp['dirent_list'][0]['type'] == 'file'
        assert json_resp['dirent_list'][0]['name'] == self.file_name
        assert 'file_tags' not in json_resp['dirent_list'][0]

        # add file tag
        tag_name = randstring(6)
        tag_color = randstring(6)
        repo_tag_data = {'name': tag_name, 'color': tag_color}
        resp = self.client.post(reverse('api-v2.1-repo-tags', args=[self.repo_id]), repo_tag_data)
        json_resp = json.loads(resp.content)
        repo_tag_id = json_resp['repo_tag']['repo_tag_id']
        file_tag_data = {'file_path': self.file_path, 'repo_tag_id': repo_tag_id}
        resp = self.client.post(reverse('api-v2.1-file-tags', args=[self.repo_id]), file_tag_data)

        # file has tag
        resp = self.client.get(self.url + '?t=f')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp['dirent_list']) == 1
        assert json_resp['dirent_list'][0]['type'] == 'file'
        assert json_resp['dirent_list'][0]['name'] == self.file_name
        assert json_resp['dirent_list'][0]['file_tags'][0]['repo_tag_id'] == repo_tag_id
        assert json_resp['dirent_list'][0]['file_tags'][0]['tag_name'] == tag_name
        assert json_resp['dirent_list'][0]['file_tags'][0]['tag_color'] == tag_color

    def test_can_get_file_with_thumbnail_info(self):

        self.login_as(self.user)

        # create a image file
        image_file_name = randstring(6) + '.jpg'
        seafile_api.post_empty_file(self.repo_id, self.folder_path,
                image_file_name, self.user_name)

        # file has no thumbnail
        resp = self.client.get(self.url + '?t=f&with_thumbnail=true&p=%s' % self.folder_path)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp['dirent_list']) == 1
        assert json_resp['dirent_list'][0]['type'] == 'file'
        assert json_resp['dirent_list'][0]['name'] == image_file_name
        assert 'encoded_thumbnail_src' not in json_resp['dirent_list'][0]

        file_id = json_resp['dirent_list'][0]['id']

        # prepare thumbnail
        size = 48
        thumbnail_dir = os.path.join(THUMBNAIL_ROOT, str(size))
        if not os.path.exists(thumbnail_dir):
            os.makedirs(thumbnail_dir)
        thumbnail_file = os.path.join(thumbnail_dir, file_id)

        with open(thumbnail_file, 'w'):
            pass
        assert os.path.exists(thumbnail_file)

        # file has thumbnail
        resp = self.client.get(self.url + '?t=f&with_thumbnail=true&p=%s' % self.folder_path)
        self.assertEqual(200, resp.status_code)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp['dirent_list']) == 1
        assert json_resp['dirent_list'][0]['type'] == 'file'
        assert json_resp['dirent_list'][0]['name'] == image_file_name
        assert image_file_name in json_resp['dirent_list'][0]['encoded_thumbnail_src']

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
