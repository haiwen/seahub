"""seahub/api2/views.py::Repo api tests.
"""
import json
from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase
from seahub.base.accounts import User
from tests.common.utils import randstring

from seaserv import seafile_api, ccnet_api

class RepoOwnerTest(BaseTestCase):

    def setUp(self):
        self.user_name = self.user.username
        self.user_repo_id = self.repo.id
        self.group_id = self.group.id

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

    def test_can_transfer_repo(self):
        self.login_as(self.user)

        url = reverse("api2-repo-owner", args=[self.user_repo_id])
        data = 'owner=%s' % self.admin.email

        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

    def test_reshare_to_user_after_transfer_repo(self):

        tmp_user = 'tmp_user@email.com'
        User.objects.create_user(tmp_user)

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
        # Remove share if repo already shared to new owner

        # share user's repo to admin with 'rw' permission
        seafile_api.share_repo(self.user_repo_id, self.user.username,
                self.admin.username, 'rw')

        # repo in admin's be shared repo list
        shared_repos = seafile_api.get_share_in_repo_list(self.admin.username, -1, -1)
        assert shared_repos[0].repo_name == self.repo.repo_name

        self.login_as(self.user)

        url = reverse("api2-repo-owner", args=[self.user_repo_id])
        data = 'owner=%s' % self.admin.email

        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        # repo NOT in admin's be shared repo list
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
        User.objects.create_user(tmp_user)

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
