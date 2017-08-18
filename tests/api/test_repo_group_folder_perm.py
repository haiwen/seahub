"""seahub/api2/views.py::Repo api tests.
"""
import json
from tests.common.utils import randstring
from django.core.urlresolvers import reverse
from seaserv import seafile_api
from seahub.test_utils import BaseTestCase
try:
    from seahub.settings import LOCAL_PRO_DEV_ENV
except ImportError:
    LOCAL_PRO_DEV_ENV = False

class RepoGroupFolderPermTest(BaseTestCase):

    def setUp(self):
        self.user_repo_id = self.repo.id
        self.user_folder_path = self.folder
        self.perm_r = 'r'
        self.perm_rw = 'rw'
        self.group_id = self.group.id

    def tearDown(self):
        self.remove_repo()
        self.remove_group()

    def test_can_get_folder_perm(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        seafile_api.add_folder_group_perm(self.user_repo_id,
            self.user_folder_path, self.perm_r, self.group_id)

        self.login_as(self.user)

        resp = self.client.get(reverse("api2-repo-group-folder-perm", args=[self.user_repo_id]))
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp[0]['group_id'] == self.group_id
        assert json_resp[0]['repo_id'] == self.user_repo_id
        assert json_resp[0]['permission'] == self.perm_r
        assert json_resp[0]['folder_path'] == self.user_folder_path

    def test_can_not_get_if_not_repo_owner(self):
        self.login_as(self.admin)
        resp = self.client.get(reverse("api2-repo-group-folder-perm", args=[self.user_repo_id]))
        self.assertEqual(403, resp.status_code)

    def test_can_modify_folder_perm(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        seafile_api.add_folder_group_perm(self.user_repo_id,
            self.user_folder_path, self.perm_r, self.group_id)

        self.login_as(self.user)

        url = reverse("api2-repo-group-folder-perm", args=[self.user_repo_id])
        data = 'group_id=%s&folder_path=%s&permission=%s' % (self.group_id,
            self.user_folder_path, self.perm_rw)

        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        resp = self.client.get(reverse("api2-repo-group-folder-perm", args=[self.user_repo_id]))
        json_resp = json.loads(resp.content)
        assert json_resp[0]['permission'] == self.perm_rw

    def test_can_not_modify_if_not_repo_owner(self):
        self.login_as(self.admin)

        url = reverse("api2-repo-group-folder-perm", args=[self.user_repo_id])
        data = 'group_id=%s&folder_path=%s&permission=%s' % (self.group_id,
            self.user_folder_path, self.perm_rw)

        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)

    def test_can_not_modify_if_folder_perm_not_exist(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.user)

        url = reverse("api2-repo-group-folder-perm", args=[self.user_repo_id])
        data = 'group_id=%s&folder_path=%s&permission=%s' % (self.group_id,
            self.user_folder_path, self.perm_rw)

        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(404, resp.status_code)

    def test_can_add_folder_perm(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.user)

        url = reverse("api2-repo-group-folder-perm", args=[self.user_repo_id])
        data = {
            "group_id": self.group_id,
            "folder_path": self.user_folder_path,
            "permission": self.perm_rw
        }

        resp = self.client.post(url, data)
        self.assertEqual(200, resp.status_code)

        resp = self.client.get(reverse("api2-repo-group-folder-perm", args=[self.user_repo_id]))
        json_resp = json.loads(resp.content)
        assert json_resp[0]['group_id'] == self.group_id
        assert json_resp[0]['repo_id'] == self.user_repo_id
        assert json_resp[0]['permission'] == self.perm_rw
        assert json_resp[0]['folder_path'] == self.user_folder_path

    def test_can_not_add_if_not_repo_owner(self):
        self.login_as(self.admin)

        url = reverse("api2-repo-group-folder-perm", args=[self.user_repo_id])
        data = {
            "group_id": self.group_id,
            "folder_path": self.user_folder_path,
            "permission": self.perm_rw
        }

        resp = self.client.post(url, data)
        self.assertEqual(403, resp.status_code)

    def test_can_not_add_if_folder_perm_already_exist(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        seafile_api.add_folder_group_perm(self.user_repo_id,
            self.user_folder_path, self.perm_r, self.group_id)

        self.login_as(self.user)

        url = reverse("api2-repo-group-folder-perm", args=[self.user_repo_id])
        data = {
            "group_id": self.group_id,
            "folder_path": self.user_folder_path,
            "permission": self.perm_rw
        }

        resp = self.client.post(url, data)
        json_resp = json.loads(resp.content)
        assert len(json_resp['failed']) == 1
        assert len(json_resp['success']) == 0
        assert json_resp['failed'][0]['group_id'] == self.group_id

    def test_can_delete_folder_perm(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        seafile_api.add_folder_group_perm(self.user_repo_id,
            self.user_folder_path, self.perm_r, self.group_id)

        self.login_as(self.user)

        resp = self.client.get(reverse("api2-repo-group-folder-perm", args=[self.user_repo_id]))
        json_resp = json.loads(resp.content)
        assert len(json_resp) == 1

        url = reverse("api2-repo-group-folder-perm", args=[self.user_repo_id])
        data = 'group_id=%s&folder_path=%s' % (self.group_id, self.user_folder_path)
        resp = self.client.delete(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        resp = self.client.get(reverse("api2-repo-group-folder-perm", args=[self.user_repo_id]))
        json_resp = json.loads(resp.content)
        assert len(json_resp) == 0

    def test_can_not_delete_if_not_repo_owner(self):
        self.login_as(self.admin)

        url = reverse("api2-repo-group-folder-perm", args=[self.user_repo_id])
        data = 'group_id=%s&folder_path=%s' % (self.group_id, self.user_folder_path)
        resp = self.client.delete(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)

    def test_invalid_group(self):
        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.user)

        invalid_group_id = -1

        # test delete
        url = reverse("api2-repo-group-folder-perm", args=[self.user_repo_id])
        data = 'group_id=%s&folder_path=%s' % (invalid_group_id, self.user_folder_path)
        resp = self.client.delete(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(404, resp.status_code)

        # test modify
        url = reverse("api2-repo-group-folder-perm", args=[self.user_repo_id])
        data = 'group_id=%s&folder_path=%s&permission=%s' % (invalid_group_id, self.user_folder_path, self.perm_rw)
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(404, resp.status_code)

        # test add
        url = reverse("api2-repo-group-folder-perm", args=[self.user_repo_id])
        data = {
            "group_id": invalid_group_id,
            "folder_path": self.user_folder_path,
            "permission": self.perm_rw
        }
        resp = self.client.post(url, data)
        json_resp = json.loads(resp.content)
        assert invalid_group_id == json_resp['failed'][0]['group_id']

    def test_invalid_perm(self):
        self.login_as(self.user)

        invalid_perm = randstring(1)
        while invalid_perm == 'r':
            invalid_perm = randstring(1)

        # test modify
        url = reverse("api2-repo-group-folder-perm", args=[self.user_repo_id])
        data = 'group_id=%s&folder_path=%s&permsission=%s' % (self.group_id, self.user_folder_path, invalid_perm)
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(400, resp.status_code)

        invalid_perm = randstring(2)
        while invalid_perm == 'rw':
            invalid_perm = randstring(2)

        # test add
        url = reverse("api2-repo-group-folder-perm", args=[self.user_repo_id])
        data = {
            "group_id": self.group_id,
            "folder_path": self.user_folder_path,
            "permission": invalid_perm
        }
        resp = self.client.post(url, data)
        self.assertEqual(400, resp.status_code)
