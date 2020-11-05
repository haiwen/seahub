import os
import json
from mock import patch

from seaserv import seafile_api

from django.urls import reverse
from seahub.test_utils import BaseTestCase
from tests.common.utils import randstring

class LibraryDirentsTest(BaseTestCase):

    def get_file_folder_num(self, repo_owner, repo_id, parent_dir):

        dir_id = seafile_api.get_dir_id_by_path(repo_id, parent_dir)
        dirents = seafile_api.list_dir_with_perm(
                repo_id, parent_dir, dir_id, repo_owner, -1, -1)

        return len(dirents)

    def setUp(self):

        self.user_name = self.user.username
        self.admin_name = self.admin.username

        self.repo_id = self.repo.id
        self.repo_name = self.repo.repo_name

        self.parent_dir = '/'
        self.init_num = self.get_file_folder_num(self.user_name,
                self.repo_id, self.parent_dir)

        self.url = reverse('api-v2.1-admin-library-dirents', args=[self.repo_id])

    def tearDown(self):

        self.remove_repo()
        self.remove_group()

    def test_get_admin_permission_denied(self):
        self.login_as(self.admin_cannot_manage_library)
        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)

    def test_post_admin_permission_denied(self):
        self.login_as(self.admin_cannot_manage_library)
        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)

    @patch('seahub.api2.endpoints.admin.library_dirents.can_view_sys_admin_repo')
    def test_can_get(self, mock_can_view_sys_admin_repo):

        mock_can_view_sys_admin_repo.return_value = True

        self.login_as(self.admin)
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['repo_id'] == self.repo_id
        assert json_resp['repo_name'] == self.repo_name
        assert len(json_resp['dirent_list']) == self.init_num

    @patch('seahub.api2.endpoints.admin.library_dirents.can_view_sys_admin_repo')
    def test_can_not_get_with_invalid_user_permission(self, mock_can_view_sys_admin_repo):

        mock_can_view_sys_admin_repo.return_value = True

        self.login_as(self.user)
        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)

    @patch('seahub.api2.endpoints.admin.library_dirents.can_view_sys_admin_repo')
    def test_can_not_get_with_invalid_parent_dir(self, mock_can_view_sys_admin_repo):

        mock_can_view_sys_admin_repo.return_value = True

        self.login_as(self.admin)
        parent_dir = randstring(6)
        resp = self.client.get(self.url + '?parent_dir=%s' % parent_dir)
        self.assertEqual(404, resp.status_code)

    @patch('seahub.api2.endpoints.admin.library_dirents.can_view_sys_admin_repo')
    def test_can_not_get_with_feather_disable(self, mock_can_view_sys_admin_repo):

        mock_can_view_sys_admin_repo.return_value = False

        self.login_as(self.admin)
        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)

    @patch('seahub.api2.endpoints.admin.library_dirents.can_view_sys_admin_repo')
    def test_can_create_file_folder(self, mock_can_view_sys_admin_repo):

        mock_can_view_sys_admin_repo.return_value = True

        self.login_as(self.admin)

        # create folder
        dir_name = randstring(6)
        resp = self.client.post(self.url, {'obj_name': dir_name})
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['is_file'] == False
        assert json_resp['obj_name'] == dir_name

        # length of dirent list will be init_num + 1
        # after created a folder
        resp = self.client.get(self.url)
        json_resp = json.loads(resp.content)
        assert len(json_resp['dirent_list']) == self.init_num + 1

        # create file
        file_name = randstring(6)
        data = {
            'obj_name': file_name,
            'is_file': 'true'
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['is_file'] == True
        assert json_resp['obj_name'] == file_name

        # length of dirent list will be init_num + 2
        # after created a file
        resp = self.client.get(self.url)
        json_resp = json.loads(resp.content)
        assert len(json_resp['dirent_list']) == self.init_num + 2

    @patch('seahub.api2.endpoints.admin.library_dirents.can_view_sys_admin_repo')
    def test_can_not_create_with_invalid_user_permission(self, mock_can_view_sys_admin_repo):

        mock_can_view_sys_admin_repo.return_value = True

        self.login_as(self.user)
        resp = self.client.post(self.url)
        self.assertEqual(403, resp.status_code)

        self.logout()
        self.login_as(self.admin)

        # length of dirent list will still be init_num
        # no file/folder was created
        resp = self.client.get(self.url)
        json_resp = json.loads(resp.content)
        assert len(json_resp['dirent_list']) == self.init_num

    @patch('seahub.api2.endpoints.admin.library_dirents.can_view_sys_admin_repo')
    def test_can_not_create_with_invalid_parent_dir(self, mock_can_view_sys_admin_repo):

        mock_can_view_sys_admin_repo.return_value = True

        self.login_as(self.admin)
        parent_dir = randstring(6)
        resp = self.client.post(self.url + '?parent_dir=%s' % parent_dir)
        self.assertEqual(404, resp.status_code)

        # length of dirent list will still be init_num
        # no file/folder was created
        resp = self.client.get(self.url)
        json_resp = json.loads(resp.content)
        assert len(json_resp['dirent_list']) == self.init_num

    @patch('seahub.api2.endpoints.admin.library_dirents.can_view_sys_admin_repo')
    def test_can_not_create_with_invalid_obj_name(self, mock_can_view_sys_admin_repo):

        mock_can_view_sys_admin_repo.return_value = True

        self.login_as(self.admin)
        resp = self.client.post(self.url, {'obj_name': 'invalid/name'})
        self.assertEqual(400, resp.status_code)

        # length of dirent list will still be init_num
        # no file/folder was created
        resp = self.client.get(self.url)
        json_resp = json.loads(resp.content)
        assert len(json_resp['dirent_list']) == self.init_num

    @patch('seahub.api2.endpoints.admin.library_dirents.can_view_sys_admin_repo')
    def test_can_not_create_with_feather_disable(self, mock_can_view_sys_admin_repo):

        mock_can_view_sys_admin_repo.return_value = False

        self.login_as(self.admin)
        parent_dir = randstring(6)
        dir_name = randstring(6)
        resp = self.client.post(self.url + '?parent_dir=%s' % parent_dir, {'obj_name': dir_name})
        self.assertEqual(403, resp.status_code)

        mock_can_view_sys_admin_repo.return_value = True

        # length of dirent list will still be init_num
        # no file/folder was created
        resp = self.client.get(self.url)
        json_resp = json.loads(resp.content)
        assert len(json_resp['dirent_list']) == self.init_num


class LibraryDirentTest(BaseTestCase):

    def get_file_folder_num(self, repo_owner, repo_id, parent_dir):

        dir_id = seafile_api.get_dir_id_by_path(repo_id, parent_dir)
        dirents = seafile_api.list_dir_with_perm(
                repo_id, parent_dir, dir_id, repo_owner, -1, -1)

        return len(dirents)

    def setUp(self):

        self.user_name = self.user.username
        self.admin_name = self.admin.username

        self.repo_id = self.repo.id
        self.repo_name = self.repo.repo_name

        self.file_path = self.file
        self.file_name = os.path.basename(self.file_path)

        self.folder_path = self.folder
        self.folder_name = os.path.basename(self.folder.rstrip('/'))

        self.parent_dir = '/'
        self.init_num = self.get_file_folder_num(self.user_name,
                self.repo_id, self.parent_dir)

        self.url = reverse('api-v2.1-admin-library-dirent', args=[self.repo_id])

    def tearDown(self):

        self.remove_repo()
        self.remove_group()

    def test_get_admin_permission_denied(self):
        self.login_as(self.admin_cannot_manage_library)
        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)

    def test_put_admin_permission_denied(self):
        self.login_as(self.admin_cannot_manage_library)
        resp = self.client.put(self.url)
        self.assertEqual(403, resp.status_code)

    def test_delete_admin_permission_denied(self):
        self.login_as(self.admin_cannot_manage_library)
        resp = self.client.delete(self.url)
        self.assertEqual(403, resp.status_code)

    @patch('seahub.api2.endpoints.admin.library_dirents.can_view_sys_admin_repo')
    def test_can_get(self, mock_can_view_sys_admin_repo):

        mock_can_view_sys_admin_repo.return_value = True

        self.login_as(self.admin)

        # get info of a file
        resp = self.client.get(self.url + '?path=%s' % (self.file_path))
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['is_file'] == True
        assert json_resp['obj_name'] == self.file_name

        # get info of a folder
        resp = self.client.get(self.url + '?path=%s' % (self.folder_path))
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['is_file'] == False
        assert json_resp['obj_name'] == self.folder_name

    @patch('seahub.api2.endpoints.admin.library_dirents.can_view_sys_admin_repo')
    def test_can_not_get_with_invalid_user_permission(self, mock_can_view_sys_admin_repo):

        mock_can_view_sys_admin_repo.return_value = True

        self.login_as(self.user)
        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)

    @patch('seahub.api2.endpoints.admin.library_dirents.can_view_sys_admin_repo')
    def test_can_not_get_with_invalid_path(self, mock_can_view_sys_admin_repo):

        mock_can_view_sys_admin_repo.return_value = True

        self.login_as(self.admin)

        # invalid `path` parameter
        resp = self.client.get(self.url)
        self.assertEqual(400, resp.status_code)

        # `path` not found
        invalid_path = randstring(6)
        resp = self.client.get(self.url + '?path=%s' % (invalid_path))
        self.assertEqual(404, resp.status_code)

    @patch('seahub.api2.endpoints.admin.library_dirents.can_view_sys_admin_repo')
    def test_can_not_get_with_feather_disable(self, mock_can_view_sys_admin_repo):

        mock_can_view_sys_admin_repo.return_value = False

        self.login_as(self.admin)
        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)

    @patch('seahub.api2.endpoints.admin.library_dirents.can_view_sys_admin_repo')
    def test_can_delete_file_folder(self, mock_can_view_sys_admin_repo):

        mock_can_view_sys_admin_repo.return_value = True

        self.login_as(self.admin)

        # delete folder
        resp = self.client.delete(self.url + '?path=%s' % (self.folder_path))
        self.assertEqual(200, resp.status_code)

        # length of dirent list will be init_num - 1
        # after deleted a folder
        url = reverse('api-v2.1-admin-library-dirents', args=[self.repo_id])
        resp = self.client.get(url)
        json_resp = json.loads(resp.content)
        assert len(json_resp['dirent_list']) == self.init_num - 1

        # delete file
        resp = self.client.delete(self.url + '?path=%s' % (self.file_path))
        self.assertEqual(200, resp.status_code)

        # length of dirent list will be init_num - 2
        # after deleted a folder
        url = reverse('api-v2.1-admin-library-dirents', args=[self.repo_id])
        resp = self.client.get(url)
        json_resp = json.loads(resp.content)
        assert len(json_resp['dirent_list']) == self.init_num - 2

    @patch('seahub.api2.endpoints.admin.library_dirents.can_view_sys_admin_repo')
    def test_can_not_delete_with_invalid_user_permission(self, mock_can_view_sys_admin_repo):

        mock_can_view_sys_admin_repo.return_value = True

        self.login_as(self.user)
        resp = self.client.delete(self.url)
        self.assertEqual(403, resp.status_code)

    @patch('seahub.api2.endpoints.admin.library_dirents.can_view_sys_admin_repo')
    def test_can_not_delete_with_invalid_path(self, mock_can_view_sys_admin_repo):

        mock_can_view_sys_admin_repo.return_value = True

        self.login_as(self.admin)

        # invalid `path` parameter
        resp = self.client.delete(self.url)
        self.assertEqual(400, resp.status_code)

    @patch('seahub.api2.endpoints.admin.library_dirents.can_view_sys_admin_repo')
    def test_can_not_delete_with_feather_disable(self, mock_can_view_sys_admin_repo):

        mock_can_view_sys_admin_repo.return_value = False

        self.login_as(self.admin)
        resp = self.client.delete(self.url)
        self.assertEqual(403, resp.status_code)

    @patch('seahub.api2.endpoints.admin.library_dirents.can_view_sys_admin_repo')
    def test_can_copy_file_folder_without_dst(self, mock_can_view_sys_admin_repo):

        mock_can_view_sys_admin_repo.return_value = True

        self.login_as(self.admin)

        ## copy file
        # if `dst_repo_id`, `dst_dir` is not provided,
        # file will be copied to current library's root directory
        data = {}
        resp = self.client.put(self.url + '?path=%s' % (self.file_path),
                json.dumps(data), 'application/json')

        self.assertEqual(200, resp.status_code)

        # length of dirent list will be init_num + 1
        # after copied file to current library's root directory
        url = reverse('api-v2.1-admin-library-dirents', args=[self.repo_id])
        resp = self.client.get(url)
        json_resp = json.loads(resp.content)
        assert len(json_resp['dirent_list']) == self.init_num + 1

        ## copy folder
        # if `dst_repo_id`, `dst_dir` is not provided,
        # folder will be copied to current library's root directory
        data = {}
        resp = self.client.put(self.url + '?path=%s' % (self.folder_path),
                json.dumps(data), 'application/json')

        self.assertEqual(200, resp.status_code)

        # length of dirent list will be init_num + 2
        # after copied file to current library's root directory
        url = reverse('api-v2.1-admin-library-dirents', args=[self.repo_id])
        resp = self.client.get(url)
        json_resp = json.loads(resp.content)
        assert len(json_resp['dirent_list']) == self.init_num + 2

    @patch('seahub.api2.endpoints.admin.library_dirents.can_view_sys_admin_repo')
    def test_can_copy_file_folder_with_dst(self, mock_can_view_sys_admin_repo):

        mock_can_view_sys_admin_repo.return_value = True

        dst_repo_id = seafile_api.create_repo(name='test-repo',
                desc='', username=self.user_name, passwd=None)

        dst_dir_name = randstring(6)
        dst_dir = '/' + dst_dir_name
        seafile_api.post_dir(dst_repo_id, '/', dst_dir_name, self.user_name)

        dst_init_num = self.get_file_folder_num(self.user_name,
                dst_repo_id, dst_dir)

        self.login_as(self.admin)

        dst_url = reverse('api-v2.1-admin-library-dirents',
                args=[dst_repo_id]) + '?parent_dir=%s' % dst_dir

        ## copy file
        data = {'dst_repo_id': dst_repo_id, 'dst_dir': dst_dir}
        resp = self.client.put(self.url + '?path=%s' % (self.file_path),
                json.dumps(data), 'application/json')

        self.assertEqual(200, resp.status_code)

        # length of dst library's dirent list will be dst_init_num + 1
        resp = self.client.get(dst_url)
        json_resp = json.loads(resp.content)
        assert len(json_resp['dirent_list']) == dst_init_num + 1

        ## copy folder
        resp = self.client.put(self.url + '?path=%s' % (self.folder_path),
                json.dumps(data), 'application/json')

        self.assertEqual(200, resp.status_code)

        # length of dst library's dirent list will be dst_init_num + 2
        resp = self.client.get(dst_url)
        json_resp = json.loads(resp.content)
        assert len(json_resp['dirent_list']) == dst_init_num + 2

        self.remove_repo(dst_repo_id)

    @patch('seahub.api2.endpoints.admin.library_dirents.can_view_sys_admin_repo')
    def test_can_not_copy_with_invalid_user_permission(self, mock_can_view_sys_admin_repo):

        mock_can_view_sys_admin_repo.return_value = True

        self.login_as(self.user)
        resp = self.client.put(self.url + '?path=%s' % (self.file_path),
                json.dumps({}), 'application/json')
        self.assertEqual(403, resp.status_code)

    @patch('seahub.api2.endpoints.admin.library_dirents.can_view_sys_admin_repo')
    def test_can_not_copy_with_invalid_path(self, mock_can_view_sys_admin_repo):

        mock_can_view_sys_admin_repo.return_value = True

        self.login_as(self.admin)
        # invalid `path` parameter
        resp = self.client.put(self.url, json.dumps({}), 'application/json')
        self.assertEqual(400, resp.status_code)

    @patch('seahub.api2.endpoints.admin.library_dirents.can_view_sys_admin_repo')
    def test_can_not_copy_with_feather_disable(self, mock_can_view_sys_admin_repo):

        mock_can_view_sys_admin_repo.return_value = False

        self.login_as(self.admin)
        resp = self.client.put(self.url, json.dumps({}), 'application/json')
        self.assertEqual(403, resp.status_code)
