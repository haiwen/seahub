import os
import json
import posixpath
from seaserv import seafile_api, ccnet_api
from django.urls import reverse
from tests.common.utils import randstring
from seahub.test_utils import BaseTestCase
from seahub.utils import normalize_dir_path

try:
    from seahub.settings import LOCAL_PRO_DEV_ENV
except ImportError:
    LOCAL_PRO_DEV_ENV = False


class ReposBatchViewTest(BaseTestCase):

    def create_new_repo(self, username):
        new_repo_id = seafile_api.create_repo(name=randstring(10),
                desc='', username=username, passwd=None)

        return new_repo_id

    def setUp(self):
        self.user_name = self.user.username
        self.admin_name = self.admin.username

        self.repo_id = self.repo.id
        self.group_id = self.group.id

        self.url = reverse('api-v2.1-repos-batch')

    def tearDown(self):
        self.remove_repo()
        self.remove_group()

    def test_can_share_repos_to_user(self):
        tmp_repo_id = self.create_new_repo(self.user_name)

        self.login_as(self.user)

        data = {
            'operation': 'share',
            'share_type': 'user',
            'username': self.admin_name,
            'repo_id': [self.repo_id]
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp['success']) == 1
        assert len(json_resp['failed']) == 0

        # share repo again will failed
        data = {
            'operation': 'share',
            'share_type': 'user',
            'username': self.admin_name,
            'repo_id': [self.repo_id, tmp_repo_id]
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp['success']) == 1
        assert len(json_resp['failed']) == 1
        assert self.repo_id in json_resp['failed'][0]['repo_id']

        self.remove_repo(tmp_repo_id)

    def test_can_share_repos_to_group(self):
        tmp_repo_id = self.create_new_repo(self.user_name)

        self.login_as(self.user)

        data = {
            'operation': 'share',
            'share_type': 'group',
            'group_id': self.group_id,
            'repo_id': [self.repo_id]
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp['success']) == 1
        assert len(json_resp['failed']) == 0

        # share repo again will failed
        data = {
            'operation': 'share',
            'share_type': 'group',
            'group_id': self.group_id,
            'repo_id': [self.repo_id, tmp_repo_id]
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp['success']) == 1
        assert len(json_resp['failed']) == 1
        assert self.repo_id in json_resp['failed'][0]['repo_id']

        self.remove_repo(tmp_repo_id)

    def test_share_with_invalid_operation(self):
        self.login_as(self.user)

        data = {
            'operation': 'invalid_operation',
            'share_type': 'user',
            'username': self.admin_name,
            'repo_id': [self.repo_id]
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(400, resp.status_code)

        data = {
            'operation': 'invalid_operation',
            'share_type': 'group',
            'group_id': self.group_id,
            'repo_id': [self.repo_id]
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(400, resp.status_code)

    def test_share_with_invalid_share_type(self):
        self.login_as(self.user)

        data = {
            'operation': 'share',
            'share_type': 'invalid_share_type',
            'username': self.admin_name,
            'repo_id': [self.repo_id]
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(400, resp.status_code)

        data = {
            'operation': 'share',
            'share_type': 'invalid_share_type',
            'group_id': self.group_id,
            'repo_id': [self.repo_id]
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(400, resp.status_code)

    def test_share_with_invalid_permisson(self):
        self.login_as(self.user)

        data = {
            'operation': 'share',
            'share_type': 'user',
            'permission': 'invalid_permission',
            'username': self.admin_name,
            'repo_id': [self.repo_id]
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(400, resp.status_code)

        data = {
            'operation': 'share',
            'share_type': 'group',
            'permission': 'invalid_permission',
            'group_id': self.group_id,
            'repo_id': [self.repo_id]
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(400, resp.status_code)

    def test_share_with_invalid_user(self):
        self.login_as(self.user)

        data = {
            'operation': 'share',
            'share_type': 'user',
            'username': 'invalid@user.com',
            'repo_id': [self.repo_id]
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(404, resp.status_code)

    def test_share_with_not_exist_group(self):
        self.login_as(self.user)

        data = {
            'operation': 'share',
            'share_type': 'group',
            'group_id': -1,
            'repo_id': [self.repo_id]
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(404, resp.status_code)

    def test_share_with_not_group_member(self):
        tmp_group_id = ccnet_api.create_group(randstring(10), self.admin_name)

        self.login_as(self.user)

        data = {
            'operation': 'share',
            'share_type': 'group',
            'group_id': tmp_group_id,
            'repo_id': [self.repo_id]
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(403, resp.status_code)


class ReposBatchCopyDirView(BaseTestCase):

    def setUp(self):
        self.user_name = self.user.username
        self.admin_name = self.admin.username
        self.repo_id = self.repo.id
        self.url = reverse('api-v2.1-repos-batch-copy-dir')

    def tearDown(self):
        self.remove_repo()
        self.remove_group()

    def get_random_path(self):
        return '/%s/%s/%s/' % (randstring(2), \
                randstring(2), randstring(2))

    def create_new_repo(self, username):
        new_repo_id = seafile_api.create_repo(name=randstring(10),
                desc='', username=username, passwd=None)

        return new_repo_id

    def test_copy_dir(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.user)

        # create two folders in src repo
        src_folder_1 = self.get_random_path()
        src_folder_2 = self.get_random_path()
        for path in [src_folder_1, src_folder_2]:
            seafile_api.mkdir_with_parents(self.repo_id,
                    '/', path.strip('/'), self.user_name)

        # share admin's tmp repo to user
        tmp_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(tmp_repo_id, self.admin_name,
                self.user_name, 'rw')

        # create two folders as parent dirs in dst repo for admin user
        dst_folder_1 = self.get_random_path()
        seafile_api.mkdir_with_parents(tmp_repo_id,
                '/', dst_folder_1.strip('/'), self.admin_name)

        dst_folder_2 = '/'

        # copy folders
        data = {
            "src_repo_id": self.repo_id,
            "dst_repo_id": tmp_repo_id,
            "paths": [
                {"src_path": src_folder_1, "dst_path": dst_folder_1},
                {"src_path": src_folder_2, "dst_path": dst_folder_2},
            ]
        }

        resp = self.client.post(self.url, json.dumps(data),
                'application/json')
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp['success']) == 2
        assert len(json_resp['failed']) == 0

        def folder_exist(src_folder, dst_repo_id, dst_folder):
            src_obj_name = os.path.basename(src_folder.rstrip('/'))
            full_dst_folder_path = posixpath.join(dst_folder.strip('/'),
                    src_obj_name.strip('/'))
            full_dst_folder_path = normalize_dir_path(full_dst_folder_path)
            return seafile_api.get_dir_id_by_path(dst_repo_id,
                    full_dst_folder_path) is not None

        assert folder_exist(src_folder_1, tmp_repo_id, dst_folder_1)
        assert folder_exist(src_folder_2, tmp_repo_id, dst_folder_2)

        self.remove_repo(tmp_repo_id)

    def test_copy_dir_with_invalid_repo_permisson(self):

        self.login_as(self.user)

        # create two folders as parent dirs in dst repo for admin user
        tmp_repo_id = self.create_new_repo(self.admin_name)

        # copy folders
        data = {
            "src_repo_id": self.repo_id,
            "dst_repo_id": tmp_repo_id,
            "paths": [
                {"src_path": '/', "dst_path": '/'},
                {"src_path": '/', "dst_path": '/'},
            ]
        }

        resp = self.client.post(self.url, json.dumps(data),
                'application/json')
        self.assertEqual(403, resp.status_code)

    def test_copy_dir_with_src_path_is_root_folder(self):

        self.login_as(self.user)

        # create two folders as parent dirs in dst repo for admin user
        tmp_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(tmp_repo_id, self.admin_name,
                self.user_name, 'rw')

        # copy folders
        data = {
            "src_repo_id": self.repo_id,
            "dst_repo_id": tmp_repo_id,
            "paths": [
                {"src_path": '/', "dst_path": '/'},
            ]
        }

        resp = self.client.post(self.url, json.dumps(data),
                'application/json')
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp['success']) == 0
        assert len(json_resp['failed']) == 1

        assert json_resp['failed'][0]['error_msg'] == \
                "The source path can not be '/'."

        self.remove_repo(tmp_repo_id)


class ReposBatchCreateDirViewTest(BaseTestCase):

    def setUp(self):
        self.user_name = self.user.username
        self.admin_name = self.admin.username
        self.repo_id = self.repo.id
        self.url = reverse('api-v2.1-repos-batch-create-dir')

    def tearDown(self):
        self.remove_repo()
        self.remove_group()

    def get_random_path(self):
        return '/%s/%s/%s/' % (randstring(2), \
                randstring(2), randstring(2))

    def test_create_dir(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        path_1 = self.get_random_path()
        path_2 = self.get_random_path()
        path_3 = self.get_random_path()

        self.login_as(self.user)

        data = {
            'repo_id': self.repo_id,
            'paths': [path_1, path_2, path_3],
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp['success']) == 3
        assert len(json_resp['failed']) == 0

        assert seafile_api.get_dir_id_by_path(self.repo_id,
                path_1) is not None
        assert seafile_api.get_dir_id_by_path(self.repo_id,
                path_2) is not None
        assert seafile_api.get_dir_id_by_path(self.repo_id,
                path_3) is not None

    def test_create_dir_with_invalid_repo_permission(self):

        # admin has NO permission for user's repo
        self.login_as(self.admin)

        data = {
            'repo_id': self.repo_id,
            'paths': 'path',
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(403, resp.status_code)

    def test_create_dir_with_invalid_folder_permission(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        path_1 = self.get_random_path()
        path_2 = self.get_random_path()
        path_3 = self.get_random_path()

        self.login_as(self.user)

        data = {
            'repo_id': self.repo_id,
            'paths': [path_1, path_2, path_3],
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp['success']) == 3
        assert len(json_resp['failed']) == 0

        assert seafile_api.get_dir_id_by_path(self.repo_id,
                path_1) is not None
        assert seafile_api.get_dir_id_by_path(self.repo_id,
                path_2) is not None
        assert seafile_api.get_dir_id_by_path(self.repo_id,
                path_3) is not None


class ReposAsyncBatchCopyItemView(BaseTestCase):

    def create_new_repo(self, username):
        new_repo_id = seafile_api.create_repo(name=randstring(10),
                desc='', username=username, passwd=None)

        return new_repo_id

    def setUp(self):
        self.user_name = self.user.username
        self.admin_name = self.admin.username

        self.src_repo_id = self.repo.id
        self.dst_repo_id = self.create_new_repo(self.user_name)

        self.file_path = self.file
        self.file_name = os.path.basename(self.file_path)

        self.folder_path = self.folder
        self.folder_name = os.path.basename(self.folder)

        self.url = reverse('api-v2.1-repos-async-batch-copy-item')

    def tearDown(self):
        self.remove_repo(self.src_repo_id)
        self.remove_repo(self.dst_repo_id)

    def test_can_copy(self):

        self.login_as(self.user)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],

            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }

        resp = self.client.post(self.url, json.dumps(data),
                'application/json')
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        task_id = json_resp['task_id']
        assert len(task_id) == 36

#        progress_url = reverse('api-v2.1-query-copy-move-progress') + '?task_id=%s' % task_id
#        count = 1
#        while True:
#            count += 1
#            resp = self.client.get(progress_url)
#            json_resp = json.loads(resp.content)
#            if json_resp['done'] == 1 or count == 10:
#                break
#
#        # items remain in src folder
#        assert seafile_api.get_dir_id_by_path(self.src_repo_id, self.folder_path) is not None
#        assert seafile_api.get_file_id_by_path(self.src_repo_id, self.file_path) is not None
#
#        # items in dst folder
#        assert seafile_api.get_file_id_by_path(self.dst_repo_id, self.file_path) is not None
#        assert seafile_api.get_dir_id_by_path(self.dst_repo_id, self.folder_path) is not None

    def test_copy_with_invalid_parameter(self):

        self.login_as(self.user)

        data = {
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(400, resp.status_code)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(400, resp.status_code)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(400, resp.status_code)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(400, resp.status_code)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.dst_repo_id,
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(400, resp.status_code)

    def test_copy_with_repo_not_exist(self):

        self.login_as(self.user)

        invalid_repo_id = 'd53fe97e-919a-42f9-a29f-042d285ba6fb'
        data = {
            "src_repo_id": invalid_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(404, resp.status_code)

        invalid_repo_id = 'd53fe97e-919a-42f9-a29f-042d285ba6fb'
        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": invalid_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(404, resp.status_code)

    def test_copy_with_folder_not_exist(self):

        self.login_as(self.user)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": 'invalid_folder',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(404, resp.status_code)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": 'invalid_folder',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(404, resp.status_code)

    def test_copy_with_invalid_repo_permission(self):

        tmp_repo_id = self.create_new_repo(self.admin_name)

        self.login_as(self.user)

        data = {
            "src_repo_id": tmp_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": tmp_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)

    def test_copy_with_invalid_src_folder_permission(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.user)

        # share admin's tmp repo to user with 'cloud-edit' permission
        admin_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, 'cloud-edit')
        data = {
            "src_repo_id": admin_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.src_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)
        self.remove_repo(admin_repo_id)

        # share admin's tmp repo to user with 'preivew' permission
        admin_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, 'preview')
        data = {
            "src_repo_id": admin_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.src_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)
        self.remove_repo(admin_repo_id)

    def test_copy_with_invalid_dst_folder_permission(self):

        self.login_as(self.user)

        # share admin's tmp repo to user with 'r' permission
        admin_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, 'r')
        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": admin_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)
        self.remove_repo(admin_repo_id)

        if not LOCAL_PRO_DEV_ENV:
            return

        # share admin's tmp repo to user with 'cloud-edit' permission
        admin_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, 'cloud-edit')
        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": admin_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)
        self.remove_repo(admin_repo_id)

        # share admin's tmp repo to user with 'preview' permission
        admin_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, 'preivew')
        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": admin_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)
        self.remove_repo(admin_repo_id)


class ReposAsyncBatchMoveItemView(BaseTestCase):

    def create_new_repo(self, username):
        new_repo_id = seafile_api.create_repo(name=randstring(10),
                desc='', username=username, passwd=None)

        return new_repo_id

    def setUp(self):
        self.user_name = self.user.username
        self.admin_name = self.admin.username

        self.src_repo_id = self.repo.id
        self.dst_repo_id = self.create_new_repo(self.user_name)

        self.file_path = self.file
        self.file_name = os.path.basename(self.file_path)

        self.folder_path = self.folder
        self.folder_name = os.path.basename(self.folder)

        self.url = reverse('api-v2.1-repos-async-batch-move-item')

    def tearDown(self):
        self.remove_repo(self.src_repo_id)
        self.remove_repo(self.dst_repo_id)

    def test_can_move(self):

        self.login_as(self.user)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],

            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }

        resp = self.client.post(self.url, json.dumps(data),
                'application/json')
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        task_id = json_resp['task_id']
        assert len(task_id) == 36

#        progress_url = reverse('api-v2.1-query-copy-move-progress') + '?task_id=%s' % task_id
#        count = 1
#        while True:
#            count += 1
#            resp = self.client.get(progress_url)
#            json_resp = json.loads(resp.content)
#            if json_resp['done'] == 1 or count == 10:
#                break
#
#        # items NOT in src folder
#        assert seafile_api.get_dir_id_by_path(self.src_repo_id, self.folder_path) is None
#        assert seafile_api.get_file_id_by_path(self.src_repo_id, self.file_path) is None
#
#        # items in dst folder
#        assert seafile_api.get_file_id_by_path(self.dst_repo_id, self.file_path) is not None
#        assert seafile_api.get_dir_id_by_path(self.dst_repo_id, self.folder_path) is not None

    def test_move_with_invalid_parameter(self):

        self.login_as(self.user)

        data = {
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(400, resp.status_code)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(400, resp.status_code)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(400, resp.status_code)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(400, resp.status_code)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.dst_repo_id,
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(400, resp.status_code)

    def test_move_with_repo_not_exist(self):

        self.login_as(self.user)

        invalid_repo_id = 'd53fe97e-919a-42f9-a29f-042d285ba6fb'
        data = {
            "src_repo_id": invalid_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(404, resp.status_code)

        invalid_repo_id = 'd53fe97e-919a-42f9-a29f-042d285ba6fb'
        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": invalid_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(404, resp.status_code)

    def test_move_with_folder_not_exist(self):

        self.login_as(self.user)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": 'invalid_folder',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(404, resp.status_code)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": 'invalid_folder',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(404, resp.status_code)

    def test_move_with_invalid_repo_permission(self):

        tmp_repo_id = self.create_new_repo(self.admin_name)

        self.login_as(self.user)

        data = {
            "src_repo_id": tmp_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": tmp_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)

    def test_move_with_invalid_src_folder_permission(self):

        self.login_as(self.user)

        # share admin's tmp repo to user with 'r' permission
        admin_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, 'r')
        data = {
            "src_repo_id": admin_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.src_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)
        self.remove_repo(admin_repo_id)

        if not LOCAL_PRO_DEV_ENV:
            return

        # share admin's tmp repo to user with 'cloud-edit' permission
        admin_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, 'cloud-edit')
        data = {
            "src_repo_id": admin_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.src_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)
        self.remove_repo(admin_repo_id)

        # share admin's tmp repo to user with 'preivew' permission
        admin_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, 'preview')
        data = {
            "src_repo_id": admin_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.src_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)
        self.remove_repo(admin_repo_id)

    def test_move_with_invalid_dst_folder_permission(self):

        self.login_as(self.user)

        # share admin's tmp repo to user with 'r' permission
        admin_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, 'r')
        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": admin_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)

        if not LOCAL_PRO_DEV_ENV:
            return

        # share admin's tmp repo to user with 'cloud-edit' permission
        admin_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, 'cloud-edit')
        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": admin_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)

        # share admin's tmp repo to user with 'preview' permission
        admin_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, 'preview')
        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": admin_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)

    def test_move_with_locked_file(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.user)

        # share admin's tmp repo to user with 'r' permission
        admin_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, 'rw')

        # admin lock file
        admin_file_name = randstring(6)
        seafile_api.post_empty_file(admin_repo_id, '/', admin_file_name,
                self.admin_name)
        seafile_api.lock_file(admin_repo_id, admin_file_name, self.admin_name, 0)

        # user move locked file
        data = {
            "src_repo_id": admin_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [admin_file_name],
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['error_msg'] == 'File %s is locked.' % admin_file_name

    def test_move_with_r_permission_sub_folder(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.user)

        # share admin's tmp repo to user with 'rw' permission
        admin_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, 'rw')

        # admin set 'r' sub folder permission
        admin_folder_name = randstring(6)
        seafile_api.post_dir(admin_repo_id, '/', admin_folder_name, self.admin_name)
        seafile_api.add_folder_user_perm(admin_repo_id, '/' +
                admin_folder_name, 'r', self.user_name)

        # user move r permission folder
        data = {
            "src_repo_id": admin_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [admin_folder_name],
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['error_msg'] == "Can't move folder %s, please check its permission." % admin_folder_name


class ReposSyncBatchCopyItemView(BaseTestCase):

    def create_new_repo(self, username):
        new_repo_id = seafile_api.create_repo(name=randstring(10),
                desc='', username=username, passwd=None)

        return new_repo_id

    def setUp(self):
        self.user_name = self.user.username
        self.admin_name = self.admin.username

        self.src_repo_id = self.repo.id
        self.dst_repo_id = self.create_new_repo(self.user_name)

        self.file_path = self.file
        self.file_name = os.path.basename(self.file_path)

        self.folder_path = self.folder
        self.folder_name = os.path.basename(self.folder)

        self.url = reverse('api-v2.1-repos-sync-batch-copy-item')

    def tearDown(self):
        self.remove_repo(self.src_repo_id)
        self.remove_repo(self.dst_repo_id)

    def test_can_copy(self):

        self.login_as(self.user)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],

            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }

        resp = self.client.post(self.url, json.dumps(data),
                'application/json')
        self.assertEqual(200, resp.status_code)

        # items remain in src folder
        assert seafile_api.get_dir_id_by_path(self.src_repo_id, self.folder_path) is not None
        assert seafile_api.get_file_id_by_path(self.src_repo_id, self.file_path) is not None

        # items in dst folder
        assert seafile_api.get_file_id_by_path(self.dst_repo_id, self.file_path) is not None
        assert seafile_api.get_dir_id_by_path(self.dst_repo_id, self.folder_path) is not None

    def test_copy_with_invalid_parameter(self):

        self.login_as(self.user)

        data = {
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(400, resp.status_code)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(400, resp.status_code)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(400, resp.status_code)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(400, resp.status_code)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.dst_repo_id,
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(400, resp.status_code)

    def test_copy_with_repo_not_exist(self):

        self.login_as(self.user)

        invalid_repo_id = 'd53fe97e-919a-42f9-a29f-042d285ba6fb'
        data = {
            "src_repo_id": invalid_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(404, resp.status_code)

        invalid_repo_id = 'd53fe97e-919a-42f9-a29f-042d285ba6fb'
        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": invalid_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(404, resp.status_code)

    def test_copy_with_folder_not_exist(self):

        self.login_as(self.user)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": 'invalid_folder',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(404, resp.status_code)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": 'invalid_folder',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(404, resp.status_code)

    def test_copy_with_invalid_repo_permission(self):

        tmp_repo_id = self.create_new_repo(self.admin_name)

        self.login_as(self.user)

        data = {
            "src_repo_id": tmp_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": tmp_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)

    def test_copy_with_invalid_src_folder_permission(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.user)

        # share admin's tmp repo to user with 'cloud-edit' permission
        admin_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, 'cloud-edit')
        data = {
            "src_repo_id": admin_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.src_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)
        self.remove_repo(admin_repo_id)

        # share admin's tmp repo to user with 'preivew' permission
        admin_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, 'preview')
        data = {
            "src_repo_id": admin_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.src_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)
        self.remove_repo(admin_repo_id)

    def test_copy_with_invalid_dst_folder_permission(self):

        self.login_as(self.user)

        # share admin's tmp repo to user with 'r' permission
        admin_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, 'r')
        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": admin_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)
        self.remove_repo(admin_repo_id)

        if not LOCAL_PRO_DEV_ENV:
            return

        # share admin's tmp repo to user with 'cloud-edit' permission
        admin_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, 'cloud-edit')
        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": admin_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)
        self.remove_repo(admin_repo_id)

        # share admin's tmp repo to user with 'preview' permission
        admin_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, 'preivew')
        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": admin_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)
        self.remove_repo(admin_repo_id)


class ReposSyncBatchMoveItemView(BaseTestCase):

    def create_new_repo(self, username):
        new_repo_id = seafile_api.create_repo(name=randstring(10),
                desc='', username=username, passwd=None)

        return new_repo_id

    def setUp(self):
        self.user_name = self.user.username
        self.admin_name = self.admin.username

        self.src_repo_id = self.repo.id
        self.dst_repo_id = self.create_new_repo(self.user_name)

        self.file_path = self.file
        self.file_name = os.path.basename(self.file_path)

        self.folder_path = self.folder
        self.folder_name = os.path.basename(self.folder)

        self.url = reverse('api-v2.1-repos-sync-batch-move-item')

    def tearDown(self):
        self.remove_repo(self.src_repo_id)
        self.remove_repo(self.dst_repo_id)

    def test_can_move(self):

        self.login_as(self.user)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],

            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }

        resp = self.client.post(self.url, json.dumps(data),
                'application/json')
        self.assertEqual(200, resp.status_code)

        # items NOT in src folder
        assert seafile_api.get_dir_id_by_path(self.src_repo_id, self.folder_path) is None
        assert seafile_api.get_file_id_by_path(self.src_repo_id, self.file_path) is None

        # items in dst folder
        assert seafile_api.get_file_id_by_path(self.dst_repo_id, self.file_path) is not None
        assert seafile_api.get_dir_id_by_path(self.dst_repo_id, self.folder_path) is not None

    def test_move_with_invalid_parameter(self):

        self.login_as(self.user)

        data = {
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(400, resp.status_code)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(400, resp.status_code)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(400, resp.status_code)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(400, resp.status_code)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.dst_repo_id,
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(400, resp.status_code)

    def test_move_with_repo_not_exist(self):

        self.login_as(self.user)

        invalid_repo_id = 'd53fe97e-919a-42f9-a29f-042d285ba6fb'
        data = {
            "src_repo_id": invalid_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(404, resp.status_code)

        invalid_repo_id = 'd53fe97e-919a-42f9-a29f-042d285ba6fb'
        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": invalid_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(404, resp.status_code)

    def test_move_with_folder_not_exist(self):

        self.login_as(self.user)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": 'invalid_folder',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(404, resp.status_code)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": 'invalid_folder',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(404, resp.status_code)

    def test_move_with_invalid_repo_permission(self):

        tmp_repo_id = self.create_new_repo(self.admin_name)

        self.login_as(self.user)

        data = {
            "src_repo_id": tmp_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)

        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": tmp_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)

    def test_move_with_invalid_src_folder_permission(self):

        self.login_as(self.user)

        # share admin's tmp repo to user with 'r' permission
        admin_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, 'r')
        data = {
            "src_repo_id": admin_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.src_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)
        self.remove_repo(admin_repo_id)

        if not LOCAL_PRO_DEV_ENV:
            return

        # share admin's tmp repo to user with 'cloud-edit' permission
        admin_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, 'cloud-edit')
        data = {
            "src_repo_id": admin_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.src_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)
        self.remove_repo(admin_repo_id)

        # share admin's tmp repo to user with 'preivew' permission
        admin_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, 'preview')
        data = {
            "src_repo_id": admin_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": self.src_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)
        self.remove_repo(admin_repo_id)

    def test_move_with_invalid_dst_folder_permission(self):

        self.login_as(self.user)

        # share admin's tmp repo to user with 'r' permission
        admin_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, 'r')
        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": admin_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)

        if not LOCAL_PRO_DEV_ENV:
            return

        # share admin's tmp repo to user with 'cloud-edit' permission
        admin_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, 'cloud-edit')
        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": admin_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)

        # share admin's tmp repo to user with 'preview' permission
        admin_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, 'preview')
        data = {
            "src_repo_id": self.src_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [self.folder_name, self.file_name],
            "dst_repo_id": admin_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)

    def test_move_with_locked_file(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.user)

        # share admin's tmp repo to user with 'rw' permission
        admin_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, 'rw')

        # admin lock file
        admin_file_name = randstring(6)
        seafile_api.post_empty_file(admin_repo_id, '/', admin_file_name,
                self.admin_name)
        seafile_api.lock_file(admin_repo_id, admin_file_name, self.admin_name, 0)

        # user move locked file
        data = {
            "src_repo_id": admin_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [admin_file_name],
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['error_msg'] == 'File %s is locked.' % admin_file_name

    def test_move_with_r_permission_sub_folder(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.user)

        # share admin's tmp repo to user with 'rw' permission
        admin_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, 'rw')

        # admin set 'r' sub folder permission
        admin_folder_name = randstring(6)
        seafile_api.post_dir(admin_repo_id, '/', admin_folder_name, self.admin_name)
        seafile_api.add_folder_user_perm(admin_repo_id, '/' +
                admin_folder_name, 'r', self.user_name)

        # user move r permission folder
        data = {
            "src_repo_id": admin_repo_id,
            "src_parent_dir": '/',
            "src_dirents": [admin_folder_name],
            "dst_repo_id": self.dst_repo_id,
            "dst_parent_dir": '/',
        }
        resp = self.client.post(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['error_msg'] == "Can't move folder %s, please check its permission." % admin_folder_name

class ReposBatchDeleteItemView(BaseTestCase):

    def create_new_repo(self, username):
        new_repo_id = seafile_api.create_repo(name=randstring(10),
                desc='', username=username, passwd=None)

        return new_repo_id

    def setUp(self):
        self.user_name = self.user.username
        self.admin_name = self.admin.username

        self.repo_id = self.repo.id

        self.file_path = self.file
        self.file_name = os.path.basename(self.file_path)

        self.folder_path = self.folder
        self.folder_name = os.path.basename(self.folder)

        self.url = reverse('api-v2.1-repos-batch-delete-item')

    def tearDown(self):
        self.remove_repo(self.repo_id)

    def test_can_delete(self):

        # items in parent folder
        assert seafile_api.get_dir_id_by_path(self.repo_id, self.folder_path) != None
        assert seafile_api.get_file_id_by_path(self.repo_id, self.file_path) != None

        self.login_as(self.user)

        data = {
            "repo_id": self.repo_id,
            "parent_dir": '/',
            "dirents": [self.folder_name, self.file_name],
        }

        resp = self.client.delete(self.url, json.dumps(data),
                'application/json')
        self.assertEqual(200, resp.status_code)

        # items NOT in parent folder
        assert seafile_api.get_dir_id_by_path(self.repo_id, self.folder_path) is None
        assert seafile_api.get_file_id_by_path(self.repo_id, self.file_path) is None

    def test_delete_with_invalid_parameter(self):

        self.login_as(self.user)

        data = {
            "parent_dir": '/',
            "dirents": [self.folder_name, self.file_name],
        }
        resp = self.client.delete(self.url, json.dumps(data), 'application/json')
        self.assertEqual(400, resp.status_code)

        data = {
            "repo_id": self.repo_id,
            "dirents": [self.folder_name, self.file_name],
        }
        resp = self.client.delete(self.url, json.dumps(data), 'application/json')
        self.assertEqual(400, resp.status_code)

        data = {
            "repo_id": self.repo_id,
            "parent_dir": '/',
        }
        resp = self.client.delete(self.url, json.dumps(data), 'application/json')
        self.assertEqual(400, resp.status_code)

    def test_delete_with_repo_not_exist(self):

        self.login_as(self.user)

        invalid_repo_id = 'd53fe97e-919a-42f9-a29f-042d285ba6fb'
        data = {
            "repo_id": invalid_repo_id,
            "parent_dir": '/',
            "dirents": [self.folder_name, self.file_name],
        }
        resp = self.client.delete(self.url, json.dumps(data), 'application/json')
        self.assertEqual(404, resp.status_code)

    def test_delete_with_folder_not_exist(self):

        self.login_as(self.user)

        data = {
            "repo_id": self.repo_id,
            "parent_dir": 'invalid_folder',
            "dirents": [self.folder_name, self.file_name],
        }
        resp = self.client.delete(self.url, json.dumps(data), 'application/json')
        self.assertEqual(404, resp.status_code)

    def test_delete_with_invalid_repo_permission(self):

        tmp_repo_id = self.create_new_repo(self.admin_name)

        self.login_as(self.user)

        data = {
            "repo_id": tmp_repo_id,
            "parent_dir": '/',
            "dirents": [self.folder_name, self.file_name],
        }
        resp = self.client.delete(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)

    def test_delete_with_invalid_parent_folder_permission(self):

        self.login_as(self.user)

        # share admin's tmp repo to user with 'r' permission
        admin_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, 'r')
        data = {
            "repo_id": admin_repo_id,
            "parent_dir": '/',
            "dirents": [self.folder_name, self.file_name],
        }
        resp = self.client.delete(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)
        self.remove_repo(admin_repo_id)

    def test_delete_with_locked_file(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.user)

        # share admin's tmp repo to user with 'r' permission
        admin_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, 'rw')

        # admin lock file
        admin_file_name = randstring(6)
        seafile_api.post_empty_file(admin_repo_id, '/', admin_file_name,
                self.admin_name)
        seafile_api.lock_file(admin_repo_id, admin_file_name, self.admin_name, 0)

        # user move locked file
        data = {
            "repo_id": admin_repo_id,
            "parent_dir": '/',
            "dirents": [admin_file_name],
        }
        resp = self.client.delete(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['error_msg'] == 'File %s is locked.' % admin_file_name

    def test_delete_with_r_permission_sub_folder(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.user)

        # share admin's tmp repo to user with 'r' permission
        admin_repo_id = self.create_new_repo(self.admin_name)
        seafile_api.share_repo(admin_repo_id, self.admin_name,
                self.user_name, 'rw')

        # admin set 'r' sub folder permission
        admin_folder_name = randstring(6)
        seafile_api.post_dir(admin_repo_id, '/', admin_folder_name, self.admin_name)
        seafile_api.add_folder_user_perm(admin_repo_id, '/' +
                admin_folder_name, 'r', self.user_name)

        # user move locked file
        data = {
            "repo_id": admin_repo_id,
            "parent_dir": '/',
            "dirents": [admin_folder_name],
        }
        resp = self.client.delete(self.url, json.dumps(data), 'application/json')
        self.assertEqual(403, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['error_msg'] == "Can't delete folder %s, please check its permission." % admin_folder_name
