"""seahub/api2/views.py::Repo api tests.
"""
import json
from tests.common.utils import randstring
from django.urls import reverse
from seaserv import seafile_api
from seahub.test_utils import BaseTestCase
try:
    from seahub.settings import LOCAL_PRO_DEV_ENV
except ImportError:
    LOCAL_PRO_DEV_ENV = False

class RepoUserFolderPermTest(BaseTestCase):

    def setUp(self):
        self.user_repo_id = self.repo.id
        self.user_folder_path = self.folder
        self.perm_r = 'r'
        self.perm_rw = 'rw'
        self.admin_email = self.admin.email

    def tearDown(self):
        self.remove_repo()

    def share_repo_to_admin_with_admin_permission(self):
        # share user's repo to admin with 'admin' permission
        self.logout()
        self.login_as(self.user)
        share_url = reverse('api2-dir-shared-items', kwargs=dict(repo_id=self.repo.id))
        data = "share_type=user&permission=admin&username=%s" % self.admin.username
        self.client.put(share_url, data, 'application/x-www-form-urlencoded')
        self.logout()

    def share_repo_to_group_with_admin_permission(self):
        self.logout()
        self.login_as(self.user)
        share_group_url = reverse('api2-dir-shared-items', kwargs=dict(repo_id=self.repo.id))
        data = "share_type=group&permission=admin&group_id=%s" % self.group.id
        self.client.put(share_group_url, data, 'application/x-www-form-urlencoded')
        self.logout()

    def test_can_get_folder_perm(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        seafile_api.add_folder_user_perm(self.user_repo_id,
            self.user_folder_path, self.perm_r, self.admin_email)

        self.login_as(self.user)

        resp = self.client.get(reverse("api2-repo-user-folder-perm", args=[self.user_repo_id]))
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp[0]['user_email'] == self.admin_email
        assert json_resp[0]['repo_id'] == self.user_repo_id
        assert json_resp[0]['permission'] == self.perm_r
        assert json_resp[0]['folder_path'] == self.user_folder_path

    def test_can_get_folder_perm_with_admin(self):
        if not LOCAL_PRO_DEV_ENV:
            return
        self.share_repo_to_admin_with_admin_permission()
        self.login_as(self.admin)

        seafile_api.add_folder_user_perm(self.user_repo_id,
            self.user_folder_path, self.perm_r, self.admin_email)
        resp = self.client.get(reverse("api2-repo-user-folder-perm", args=[self.user_repo_id]))
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp[0]['user_email'] == self.admin_email
        assert json_resp[0]['repo_id'] == self.user_repo_id
        assert json_resp[0]['permission'] == self.perm_r
        assert json_resp[0]['folder_path'] == self.user_folder_path

    def test_can_get_folder_perm_with_admin_group(self):
        if not LOCAL_PRO_DEV_ENV:
            return
        self.share_repo_to_group_with_admin_permission()
        self.add_admin_to_group()
        self.login_as(self.admin)

        seafile_api.add_folder_user_perm(self.user_repo_id,
            self.user_folder_path, self.perm_r, self.admin_email)
        resp = self.client.get(reverse("api2-repo-user-folder-perm", args=[self.user_repo_id]))
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp[0]['user_email'] == self.admin_email
        assert json_resp[0]['repo_id'] == self.user_repo_id
        assert json_resp[0]['permission'] == self.perm_r
        assert json_resp[0]['folder_path'] == self.user_folder_path

    def test_can_not_get_if_not_repo_owner(self):
        self.login_as(self.admin)
        resp = self.client.get(reverse("api2-repo-user-folder-perm", args=[self.user_repo_id]))
        self.assertEqual(403, resp.status_code)

    def test_can_modify_folder_perm(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        seafile_api.add_folder_user_perm(self.user_repo_id,
            self.user_folder_path, self.perm_r, self.admin_email)

        self.login_as(self.user)

        url = reverse("api2-repo-user-folder-perm", args=[self.user_repo_id])
        data = 'user_email=%s&folder_path=%s&permission=%s' % (self.admin_email,
            self.user_folder_path, self.perm_rw)

        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        resp = self.client.get(reverse("api2-repo-user-folder-perm", args=[self.user_repo_id]))
        json_resp = json.loads(resp.content)
        assert json_resp[0]['permission'] == self.perm_rw

    def test_can_modify_folder_perm_with_admin(self):
        if not LOCAL_PRO_DEV_ENV:
            return
        self.share_repo_to_admin_with_admin_permission()
        self.login_as(self.admin)

        seafile_api.add_folder_user_perm(self.user_repo_id,
            self.user_folder_path, self.perm_r, self.admin_email)
        url = reverse("api2-repo-user-folder-perm", args=[self.user_repo_id])
        data = 'user_email=%s&folder_path=%s&permission=%s' % (self.admin_email,
            self.user_folder_path, self.perm_rw)
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)
        resp = self.client.get(reverse("api2-repo-user-folder-perm", args=[self.user_repo_id]))
        json_resp = json.loads(resp.content)
        assert json_resp[0]['permission'] == self.perm_rw

    def test_can_modify_folder_perm_with_admin_group(self):
        if not LOCAL_PRO_DEV_ENV:
            return
        self.share_repo_to_group_with_admin_permission()
        self.add_admin_to_group()
        self.login_as(self.admin)

        seafile_api.add_folder_user_perm(self.user_repo_id,
            self.user_folder_path, self.perm_r, self.admin_email)
        url = reverse("api2-repo-user-folder-perm", args=[self.user_repo_id])
        data = 'user_email=%s&folder_path=%s&permission=%s' % (self.admin_email,
            self.user_folder_path, self.perm_rw)
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)
        resp = self.client.get(reverse("api2-repo-user-folder-perm", args=[self.user_repo_id]))
        json_resp = json.loads(resp.content)
        assert json_resp[0]['permission'] == self.perm_rw

    def test_can_not_modify_if_not_repo_owner(self):
        self.login_as(self.admin)

        url = reverse("api2-repo-user-folder-perm", args=[self.user_repo_id])
        data = 'user_email=%s&folder_path=%s&permission=%s' % (self.admin_email,
            self.user_folder_path, self.perm_rw)

        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)

    def test_can_not_modify_if_folder_perm_not_exist(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.user)

        url = reverse("api2-repo-user-folder-perm", args=[self.user_repo_id])
        data = 'user_email=%s&folder_path=%s&permission=%s' % (self.admin_email,
            self.user_folder_path, self.perm_rw)

        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(404, resp.status_code)

    def test_can_add_folder_perm(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.user)

        url = reverse("api2-repo-user-folder-perm", args=[self.user_repo_id])
        data = {
            "user_email": self.admin_email,
            "folder_path": self.user_folder_path,
            "permission": self.perm_rw
        }

        resp = self.client.post(url, data)
        self.assertEqual(200, resp.status_code)

        resp = self.client.get(reverse("api2-repo-user-folder-perm", args=[self.user_repo_id]))
        json_resp = json.loads(resp.content)
        assert json_resp[0]['user_email'] == self.admin_email
        assert json_resp[0]['repo_id'] == self.user_repo_id
        assert json_resp[0]['permission'] == self.perm_rw
        assert json_resp[0]['folder_path'] == self.user_folder_path

    def test_can_add_folder_perm_with_admin(self):
        if not LOCAL_PRO_DEV_ENV:
            return
        self.share_repo_to_admin_with_admin_permission()
        self.login_as(self.admin)

        url = reverse("api2-repo-user-folder-perm", args=[self.user_repo_id])
        data = {
            "user_email": self.admin_email,
            "folder_path": self.user_folder_path,
            "permission": self.perm_rw
        }

        resp = self.client.post(url, data)
        self.assertEqual(200, resp.status_code)

        resp = self.client.get(reverse("api2-repo-user-folder-perm", args=[self.user_repo_id]))
        json_resp = json.loads(resp.content)
        assert json_resp[0]['user_email'] == self.admin_email
        assert json_resp[0]['repo_id'] == self.user_repo_id
        assert json_resp[0]['permission'] == self.perm_rw
        assert json_resp[0]['folder_path'] == self.user_folder_path

    def test_can_add_folder_perm_with_admin_group(self):
        if not LOCAL_PRO_DEV_ENV:
            return
        self.share_repo_to_group_with_admin_permission()
        self.add_admin_to_group()
        self.login_as(self.admin)

        url = reverse("api2-repo-user-folder-perm", args=[self.user_repo_id])
        data = {
            "user_email": self.admin_email,
            "folder_path": self.user_folder_path,
            "permission": self.perm_rw
        }

        resp = self.client.post(url, data)
        self.assertEqual(200, resp.status_code)

        resp = self.client.get(reverse("api2-repo-user-folder-perm", args=[self.user_repo_id]))
        json_resp = json.loads(resp.content)
        assert json_resp[0]['user_email'] == self.admin_email
        assert json_resp[0]['repo_id'] == self.user_repo_id
        assert json_resp[0]['permission'] == self.perm_rw
        assert json_resp[0]['folder_path'] == self.user_folder_path

    def test_can_not_add_if_not_repo_owner(self):
        self.login_as(self.admin)

        url = reverse("api2-repo-user-folder-perm", args=[self.user_repo_id])
        data = {
            "user_email": self.admin_email,
            "folder_path": self.user_folder_path,
            "permission": self.perm_rw
        }

        resp = self.client.post(url, data)
        self.assertEqual(403, resp.status_code)

    def test_can_not_add_if_folder_perm_already_exist(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        seafile_api.add_folder_user_perm(self.user_repo_id,
            self.user_folder_path, self.perm_r, self.admin_email)

        self.login_as(self.user)

        url = reverse("api2-repo-user-folder-perm", args=[self.user_repo_id])
        data = {
            "user_email": self.admin_email,
            "folder_path": self.user_folder_path,
            "permission": self.perm_r
        }

        resp = self.client.post(url, data)
        json_resp = json.loads(resp.content)
        assert len(json_resp['failed']) == 1
        assert len(json_resp['success']) == 0
        assert json_resp['failed'][0]['user_email'] == self.admin_email

    def test_can_delete_folder_perm(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        seafile_api.add_folder_user_perm(self.user_repo_id,
            self.user_folder_path, self.perm_r, self.admin_email)

        self.login_as(self.user)

        resp = self.client.get(reverse("api2-repo-user-folder-perm", args=[self.user_repo_id]))
        json_resp = json.loads(resp.content)
        assert len(json_resp) == 1

        url = reverse("api2-repo-user-folder-perm", args=[self.user_repo_id])
        data = 'user_email=%s&folder_path=%s' % (self.admin_email, self.user_folder_path)
        resp = self.client.delete(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        resp = self.client.get(reverse("api2-repo-user-folder-perm", args=[self.user_repo_id]))
        json_resp = json.loads(resp.content)
        assert len(json_resp) == 0

    def test_can_delete_folder_perm_with_admin(self):
        if not LOCAL_PRO_DEV_ENV:
            return
        self.share_repo_to_admin_with_admin_permission()
        self.login_as(self.admin)

        seafile_api.add_folder_user_perm(self.user_repo_id,
            self.user_folder_path, self.perm_r, self.admin_email)
        resp = self.client.get(reverse("api2-repo-user-folder-perm", args=[self.user_repo_id]))
        json_resp = json.loads(resp.content)
        assert len(json_resp) == 1

        url = reverse("api2-repo-user-folder-perm", args=[self.user_repo_id])
        data = 'user_email=%s&folder_path=%s' % (self.admin_email, self.user_folder_path)
        resp = self.client.delete(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        resp = self.client.get(reverse("api2-repo-user-folder-perm", args=[self.user_repo_id]))
        json_resp = json.loads(resp.content)
        assert len(json_resp) == 0

    def test_can_delete_folder_perm_with_admin_group(self):
        if not LOCAL_PRO_DEV_ENV:
            return
        self.share_repo_to_group_with_admin_permission()
        self.add_admin_to_group()
        self.login_as(self.admin)

        seafile_api.add_folder_user_perm(self.user_repo_id,
            self.user_folder_path, self.perm_r, self.admin_email)
        resp = self.client.get(reverse("api2-repo-user-folder-perm", args=[self.user_repo_id]))
        json_resp = json.loads(resp.content)
        assert len(json_resp) == 1

        url = reverse("api2-repo-user-folder-perm", args=[self.user_repo_id])
        data = 'user_email=%s&folder_path=%s' % (self.admin_email, self.user_folder_path)
        resp = self.client.delete(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        resp = self.client.get(reverse("api2-repo-user-folder-perm", args=[self.user_repo_id]))
        json_resp = json.loads(resp.content)
        assert len(json_resp) == 0

    def test_can_not_delete_if_not_repo_owner(self):
        self.login_as(self.admin)

        url = reverse("api2-repo-user-folder-perm", args=[self.user_repo_id])
        data = 'user_email=%s&folder_path=%s&permission=%s' % \
                (self.admin_email, self.user_folder_path, self.perm_rw)
        resp = self.client.delete(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)

    def test_invalid_user(self):
        if not LOCAL_PRO_DEV_ENV:
            return

        self.login_as(self.user)

        invalid_user = randstring(6) + '@' + randstring(6) + '.com'

        # test add
        url = reverse("api2-repo-user-folder-perm", args=[self.user_repo_id])
        data = {
            "user_email": invalid_user,
            "folder_path": self.user_folder_path,
            "permission": self.perm_rw
        }
        resp = self.client.post(url, data)
        json_resp = json.loads(resp.content)
        assert invalid_user == json_resp['failed'][0]['user_email']

        # test modify
        url = reverse("api2-repo-user-folder-perm", args=[self.user_repo_id])
        data = 'user_email=%s&folder_path=%s&permission=%s' % \
                (invalid_user, self.user_folder_path, self.perm_rw)
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(404, resp.status_code)

        # test delete
        url = reverse("api2-repo-user-folder-perm", args=[self.user_repo_id])
        data = 'user_email=%s&folder_path=%s&permission=%s' % \
                (invalid_user, self.user_folder_path, self.perm_rw)
        resp = self.client.delete(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(404, resp.status_code)

    def test_invalid_perm(self):
        self.login_as(self.user)

        invalid_perm = 'a'

        # test add
        url = reverse("api2-repo-user-folder-perm", args=[self.user_repo_id])
        data = {
            "user_email": self.admin_email,
            "folder_path": self.user_folder_path,
            "permission": invalid_perm
        }
        resp = self.client.post(url, data)
        self.assertEqual(400, resp.status_code)

        # test modify
        url = reverse("api2-repo-user-folder-perm", args=[self.user_repo_id])
        data = 'user_email=%s&folder_path=%s&permission=%s' % (self.admin_email, self.user_folder_path, invalid_perm)
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(400, resp.status_code)
