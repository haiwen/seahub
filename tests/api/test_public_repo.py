import json
import pytest
from mock import patch, MagicMock
from seaserv import seafile_api
from seahub.test_utils import BaseTestCase

pytestmark = pytest.mark.django_db


class RepoPublicTest(BaseTestCase):

    def setUp(self):
        from constance import config
        self.config = config

        self.repo_id = self.create_repo(name='test-admin-repo', desc='',
                                        username=self.admin.username,
                                        passwd=None)
        self.url = '/api2/shared-repos/%s/' % self.repo_id
        self.user_repo_url = '/api2/shared-repos/%s/' % self.repo.id

    def tearDown(self):
        self.remove_repo(self.repo_id)
        # clear cache between every test case to avoid config option cache issue
        self.clear_cache()

    def test_admin_can_set_pub_repo(self):
        self.login_as(self.admin)

        resp = self.client.put(self.url+'?share_type=public&permission=rw')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert 'success' in json_resp

    def test_admin_can_unset_pub_repo(self):
        seafile_api.add_inner_pub_repo(self.repo_id, "r")

        self.login_as(self.admin)

        resp = self.client.delete(self.url+'?share_type=public')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert 'success' in json_resp

    @patch('seahub.base.accounts.UserPermissions.can_add_public_repo', MagicMock(return_value=True))
    def test_user_can_set_pub_repo(self):
        self.login_as(self.user)
        assert self.user.permissions.can_add_public_repo() is True

        resp = self.client.put(self.user_repo_url+'?share_type=public&permission=rw')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert 'success' in json_resp

    def test_user_can_not_set_pub_repo_when_add_public_repo_disabled(self):
        self.login_as(self.user)
        assert self.user.permissions.can_add_public_repo() is False

        resp = self.client.put(self.user_repo_url+'?share_type=public&permission=rw')
        self.assertEqual(403, resp.status_code)

    def test_admin_can_set_pub_repo_when_setting_disalbed(self):

        self.login_as(self.admin)

        resp = self.client.put(self.url+'?share_type=public&permission=rw')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert 'success' in json_resp

    def test_user_can_not_set_pub_repo_when_setting_disalbed(self):

        self.login_as(self.user)

        resp = self.client.put(self.user_repo_url+'?share_type=public&permission=rw')
        self.assertEqual(403, resp.status_code)
