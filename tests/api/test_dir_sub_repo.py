import os
import json
from django.urls import reverse

from seaserv import seafile_api
from seahub.test_utils import BaseTestCase
from tests.common.utils import randstring

try:
    from seahub.settings import LOCAL_PRO_DEV_ENV
except ImportError:
    LOCAL_PRO_DEV_ENV = False

class DirSubRepoViewTest(BaseTestCase):

    def setUp(self):
        self.user_name = self.user.username
        self.user_repo_id = self.repo.id
        self.user_folder_path = self.folder
        self.user_folder_name = os.path.basename(self.folder.rstrip('/'))

        self.admin_name = self.admin.username

        self.url = reverse("api2-dir-sub-repo", args=[self.user_repo_id])

    def tearDown(self):
        self.remove_repo()

    def test_can_create_dir_sub_repo(self):
        self.login_as(self.user)

        args = "?p=%s&name=%s" % (self.user_folder_path, self.user_folder_name)
        resp = self.client.get(self.url + args)
        json_resp = json.loads(resp.content)
        assert len(json_resp['sub_repo_id']) == 36

    def test_can_create_in_encrypted_lib(self):

        password = randstring(8)
        encrypted_repo_id = seafile_api.create_repo(
                'encrypted_repo_name', '', self.user_name, password)

        dirname = randstring(8)
        seafile_api.post_dir(repo_id=encrypted_repo_id,
                parent_dir='/', dirname=dirname, username=self.user_name)

        self.login_as(self.user)

        url = reverse("api2-dir-sub-repo", args=[encrypted_repo_id])
        args = "?p=/%s&name=%s&password=%s" % (dirname, dirname, password)
        resp = self.client.get(url + args)
        json_resp = json.loads(resp.content)
        assert len(json_resp['sub_repo_id']) == 36

        self.remove_repo(encrypted_repo_id)

    def test_create_in_encrypted_lib_with_invalid_password(self):

        password = randstring(8)
        encrypted_repo_id = seafile_api.create_repo(
                'encrypted_repo_name', '', self.user_name, password)

        dirname = randstring(8)
        seafile_api.post_dir(repo_id=encrypted_repo_id,
                parent_dir='/', dirname=dirname, username=self.user_name)

        self.login_as(self.user)

        url = reverse("api2-dir-sub-repo", args=[encrypted_repo_id])

        # test invalid password argument
        args = "?p=/%s&name=%s&invalid_password=%s" % (dirname, dirname, password)
        resp = self.client.get(url + args)
        self.assertEqual(400, resp.status_code)

        # test wrong password
        args = "?p=/%s&name=%s&password=%s" % (dirname, dirname, 'invalid_password')
        resp = self.client.get(url + args)
        self.assertEqual(400, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['error_msg'] == 'Wrong password'

        self.remove_repo(encrypted_repo_id)

    def test_create_with_invalid_repo_permission(self):
        self.login_as(self.admin)

        args = "?p=%s&name=%s" % (self.user_folder_path, self.user_folder_name)
        resp = self.client.get(self.url + args)
        self.assertEqual(403, resp.status_code)

    def test_create_with_r_permission_folder(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.set_user_folder_r_permission_to_admin()

        self.login_as(self.admin)

        args = "?p=%s&name=%s" % (self.user_folder_path, self.user_folder_name)
        resp = self.client.get(self.url + args)
        json_resp = json.loads(resp.content)
        assert len(json_resp['sub_repo_id']) == 36

    def test_create_with_rw_permission_folder(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.set_user_folder_r_permission_to_admin()

        self.login_as(self.admin)

        args = "?p=%s&name=%s" % (self.user_folder_path, self.user_folder_name)
        resp = self.client.get(self.url + args)
        json_resp = json.loads(resp.content)
        assert len(json_resp['sub_repo_id']) == 36
