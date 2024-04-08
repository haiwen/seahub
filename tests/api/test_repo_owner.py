"""seahub/api2/views.py::Repo api tests.
"""
import json
from django.urls import reverse

from seahub.test_utils import BaseTestCase
from seahub.base.accounts import User
from seahub.share.models import FileShare, UploadLinkShare
from tests.common.utils import randstring

from seaserv import seafile_api, ccnet_api

class RepoOwnerTest(BaseTestCase):

    def setUp(self):
        self.user_name = self.user.username
        self.user_repo_id = self.repo.id
        self.group_id = self.group.id
        self.fs_share = FileShare.objects.create_dir_link(self.user.username,
             self.user_repo_id, self.folder, None, None)

        self.fs_upload = UploadLinkShare.objects.create_upload_link_share(self.user.username,
             self.user_repo_id, self.folder, None, None)


    def tearDown(self):
        self.remove_repo()

    def test_can_get_owner(self):
        self.login_as(self.user)

        resp = self.client.get(reverse("api2-repo-owner", args=[self.user_repo_id]))
        json_resp = json.loads(resp.content)
        assert json_resp['owner'] == self.user.email

    def test_can_not_get_if_not_repo_owner(self):
        self.login_as(self.admin)

        resp = self.client.get(reverse("api2-repo-owner", args=[self.user_repo_id]))
        self.assertEqual(403, resp.status_code)

    def test_can_not_transfer_repo_to_owner(self):
        self.login_as(self.user)

        url = reverse("api2-repo-owner", args=[self.user_repo_id])
        data = 'owner=%s' % self.user.email

        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(400, resp.status_code)

    def test_can_transfer_repo(self):
        self.login_as(self.user)

        url = reverse("api2-repo-owner", args=[self.user_repo_id])
        data = 'owner=%s' % self.admin.email

        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

    def test_reshare_to_user_after_transfer_repo(self):

        tmp_user = 'tmp_user@email.com'
        self.create_user(tmp_user)

        # share user's repo to tmp_user with 'rw' permission
        seafile_api.share_repo(self.user_repo_id, self.user.username,
                tmp_user, 'rw')

        assert seafile_api.check_permission_by_path(self.user_repo_id,
                '/', tmp_user) == 'rw'

        self.login_as(self.user)

        url = reverse("api2-repo-owner", args=[self.user_repo_id])
        data = 'owner=%s' % self.admin.email

        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        assert seafile_api.check_permission_by_path(self.user_repo_id,
                '/', tmp_user) == 'rw'

    def test_not_reshare_to_user_after_transfer_repo(self):

        # remove all share
        shared_repos = seafile_api.get_share_in_repo_list(self.admin.username, -1, -1)
        for repo in  shared_repos:
            seafile_api.remove_share(repo.repo_id, self.admin.username,
                    self.user.username)

            seafile_api.remove_share(repo.repo_id, self.user.username,
                    self.admin.username)

        # share user's repo to admin with 'rw' permission
        seafile_api.share_repo(self.user_repo_id, self.user.username,
                self.admin.username, 'rw')

        # assert repo in admin's be shared repo list
        shared_repos = seafile_api.get_share_in_repo_list(self.admin.username, -1, -1)
        assert shared_repos[0].repo_name == self.repo.repo_name

        self.login_as(self.user)

        url = reverse("api2-repo-owner", args=[self.user_repo_id])
        data = 'owner=%s' % self.admin.email

        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        # assert repo NOT in admin's be shared repo list
        shared_repos = seafile_api.get_share_in_repo_list(self.admin.username, -1, -1)
        assert len(shared_repos) == 0

    def test_reshare_to_group_after_transfer_repo(self):
        # If new owner in group repo shared to, reshare to group

        # share user's repo to group with 'r' permission
        seafile_api.set_group_repo(self.user_repo_id, self.group_id,
                self.user_name, 'r')

        group_repos = seafile_api.get_repos_by_group(self.group_id)
        assert group_repos[0].permission == 'r'

        # add admin user to group
        ccnet_api.group_add_member(self.group_id, self.user_name, self.admin.username)

        self.login_as(self.user)

        url = reverse("api2-repo-owner", args=[self.user_repo_id])
        data = 'owner=%s' % self.admin.email

        # transfer repo to admin
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        group_repos = seafile_api.get_repos_by_group(self.group_id)
        assert group_repos[0].permission == 'r'

    def test_not_reshare_to_group_after_transfer_repo(self):
        # If new owner NOT in group repo shared to, NOT reshare to group

        # share user's repo to group with 'r' permission
        seafile_api.set_group_repo(self.user_repo_id, self.group_id,
                self.user_name, 'r')

        group_repos = seafile_api.get_repos_by_group(self.group_id)
        assert group_repos[0].permission == 'r'

        self.login_as(self.user)

        url = reverse("api2-repo-owner", args=[self.user_repo_id])
        data = 'owner=%s' % self.admin.email

        # transfer repo to admin
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        group_repos = seafile_api.get_repos_by_group(self.group_id)
        assert len(group_repos) == 0

    def test_reshare_to_user_group_after_transfer_repo(self):

        tmp_user = 'tmp_user@email.com'
        self.create_user(tmp_user)

        # add admin user to group
        ccnet_api.group_add_member(self.group_id, self.user_name, self.admin.username)

        # share user's repo to tmp_user with 'rw' permission
        seafile_api.share_repo(self.user_repo_id, self.user.username,
                tmp_user, 'rw')

        # share user's repo to group with 'r' permission
        seafile_api.set_group_repo(self.user_repo_id, self.group_id,
                self.user_name, 'r')
        group_repos = seafile_api.get_repos_by_group(self.group_id)

        assert group_repos[0].permission == 'r'
        assert seafile_api.check_permission_by_path(self.user_repo_id,
                '/', tmp_user) == 'rw'

        self.login_as(self.user)

        url = reverse("api2-repo-owner", args=[self.user_repo_id])
        data = 'owner=%s' % self.admin.email

        # transfer repo to admin
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        group_repos = seafile_api.get_repos_by_group(self.group_id)
        assert group_repos[0].permission == 'r'
        assert seafile_api.check_permission_by_path(self.user_repo_id,
                '/', tmp_user) == 'rw'

    def test_can_not_transfer_if_not_repo_owner(self):
        self.login_as(self.admin)

        url = reverse("api2-repo-owner", args=[self.user_repo_id])
        data = 'owner=%s' % self.admin.email

        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)

    def test_can_not_transfer_repo_to_unregistered_user(self):
        self.login_as(self.user)

        url = reverse("api2-repo-owner", args=[self.user_repo_id])
        unregistered_user = '%s@%s.com' % (randstring(6), randstring(6))
        data = 'owner=%s' % unregistered_user

        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(404, resp.status_code)

    def test_reshare_to_share_links_after_transfer_repo(self):
        self.login_as(self.user)

        assert len(UploadLinkShare.objects.all()) == 1

        url = reverse("api2-repo-owner", args=[self.user_repo_id])
        data = 'owner=%s' % self.admin.email
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')

        fs = FileShare.objects.get(repo_id=self.user_repo_id)
        assert fs.username == self.admin.email

    def test_reshare_to_upload_links_after_transfer_repo(self):
        self.login_as(self.user)

        assert len(UploadLinkShare.objects.all()) == 1

        url = reverse("api2-repo-owner", args=[self.user_repo_id])
        data = 'owner=%s' % self.admin.email
        self.client.put(url, data, 'application/x-www-form-urlencoded')

        fs = UploadLinkShare.objects.get(repo_id=self.user_repo_id)
        assert fs.username == self.admin.email
