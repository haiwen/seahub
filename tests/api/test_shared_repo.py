import pytest
from mock import patch, MagicMock
from seahub.test_utils import BaseTestCase
from seaserv import seafile_api

pytestmark = pytest.mark.django_db


class SharedRepoTest(BaseTestCase):

    def setUp(self):
        from constance import config
        self.config = config

        self.repo_id = self.create_repo(name='test-admin-repo', desc='',
                                        username=self.admin.username,
                                        passwd=None)
        self.shared_repo_url = '/api2/shared-repos/%s/?share_type=public&permission=rw'

    def tearDown(self):
        self.remove_repo(self.repo_id)
        self.clear_cache()

    def test_admin_can_share_repo_to_public(self):
        self.login_as(self.admin)

        url = self.shared_repo_url % self.repo_id
        resp = self.client.put(url)
        self.assertEqual(200, resp.status_code)
        assert b"success" in resp.content

    @patch('seahub.base.accounts.UserPermissions.can_add_public_repo', MagicMock(return_value=True))
    def test_user_can_share_repo_to_public(self):
        self.login_as(self.user)
        assert self.user.permissions.can_add_public_repo() is True

        url = self.shared_repo_url % self.repo.id
        resp = self.client.put(url)
        self.assertEqual(200, resp.status_code)
        assert b"success" in resp.content

    def test_user_can_not_share_repo_to_public_when_add_public_repo_disabled(self):
        self.login_as(self.user)
        assert self.user.permissions.can_add_public_repo() is False

        url = self.shared_repo_url % self.repo.id
        resp = self.client.put(url)
        self.assertEqual(403, resp.status_code)

    def test_admin_can_set_pub_repo_when_setting_disalbed(self):

        self.login_as(self.admin)

        resp = self.client.put(self.shared_repo_url % self.repo_id)
        self.assertEqual(200, resp.status_code)
        assert b"success" in resp.content

    def test_user_can_not_set_pub_repo_when_setting_disalbed(self):

        self.login_as(self.user)

        resp = self.client.put(self.shared_repo_url % self.repo.id)
        self.assertEqual(403, resp.status_code)

    def test_admin_can_unshare_public_repo(self):
        seafile_api.add_inner_pub_repo(self.repo_id, "r")

        self.login_as(self.admin)

        url = self.shared_repo_url % self.repo_id
        resp = self.client.delete(url)
        self.assertEqual(200, resp.status_code)
        assert b"success" in resp.content

    def test_user_can_unshare_public_repo(self):
        seafile_api.add_inner_pub_repo(self.repo_id, "r")

        self.login_as(self.user)

        url = self.shared_repo_url % self.repo_id
        resp = self.client.delete(url)
        self.assertEqual(403, resp.status_code)
        assert b'You do not have permission to unshare library.' in resp.content
