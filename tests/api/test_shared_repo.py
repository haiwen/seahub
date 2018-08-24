import pytest
pytestmark = pytest.mark.django_db

from seahub.test_utils import BaseTestCase
from seaserv import seafile_api


class SharedRepoTest(BaseTestCase):
    def setUp(self):
        from constance import config
        self.config = config

        self.repo_id = self.create_repo(name='test-admin-repo', desc='',
                                        username=self.admin.username,
                                        passwd=None)
        self.shared_repo_url = '/api2/shared-repos/%s/?share_type=public&permission=rw'
        self.config.ENABLE_USER_CREATE_ORG_REPO = 1

    def tearDown(self):
        self.remove_repo(self.repo_id)
        self.clear_cache()

    def test_admin_can_share_repo_to_public(self):
        self.login_as(self.admin)

        url = self.shared_repo_url % self.repo_id
        resp = self.client.put(url)
        self.assertEqual(200, resp.status_code)
        assert "success" in resp.content

    def test_user_can_share_repo_to_public(self):
        self.login_as(self.user)

        url = self.shared_repo_url % self.repo.id
        resp = self.client.put(url)
        self.assertEqual(200, resp.status_code)
        assert "success" in resp.content

    def test_admin_can_set_pub_repo_when_setting_disalbed(self):
        assert bool(self.config.ENABLE_USER_CREATE_ORG_REPO) is True
        self.config.ENABLE_USER_CREATE_ORG_REPO = False
        assert bool(self.config.ENABLE_USER_CREATE_ORG_REPO) is False

        self.login_as(self.admin)

        resp = self.client.put(self.shared_repo_url % self.repo_id)
        self.assertEqual(200, resp.status_code)
        assert "success" in resp.content

    def test_user_can_not_set_pub_repo_when_setting_disalbed(self):
        assert bool(self.config.ENABLE_USER_CREATE_ORG_REPO) is True
        self.config.ENABLE_USER_CREATE_ORG_REPO = False
        assert bool(self.config.ENABLE_USER_CREATE_ORG_REPO) is False

        self.login_as(self.user)

        resp = self.client.put(self.shared_repo_url % self.repo.id)
        self.assertEqual(403, resp.status_code)

    def test_admin_can_unshare_public_repo(self):
        seafile_api.add_inner_pub_repo(self.repo_id, "r")

        self.login_as(self.admin)

        url = self.shared_repo_url % self.repo_id
        resp = self.client.delete(url)
        self.assertEqual(200, resp.status_code)
        assert "success" in resp.content

    def test_user_can_unshare_public_repo(self):
        seafile_api.add_inner_pub_repo(self.repo_id, "r")

        self.login_as(self.user)

        url = self.shared_repo_url % self.repo_id
        resp = self.client.delete(url)
        self.assertEqual(403, resp.status_code)
        assert 'You do not have permission to unshare library.' in resp.content
