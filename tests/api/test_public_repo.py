import json

import pytest
pytestmark = pytest.mark.django_db

from seaserv import seafile_api, ccnet_threaded_rpc

from seahub.test_utils import BaseTestCase


class RepoPublicTest(BaseTestCase):
    def setUp(self):
        from constance import config
        self.config = config

        self.repo_id = self.create_repo(name='test-admin-repo', desc='',
                                        username=self.admin.username,
                                        passwd=None)
        self.url = '/api2/shared-repos/%s/' % self.repo_id
        self.user_repo_url = '/api2/shared-repos/%s/' % self.repo.id

        self.config.ENABLE_USER_CREATE_ORG_REPO = 1

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

    def test_user_can_set_pub_repo(self):
        self.login_as(self.user)

        resp = self.client.put(self.user_repo_url+'?share_type=public&permission=rw')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert 'success' in json_resp

    def test_admin_can_set_pub_repo_when_setting_disalbed(self):
        assert bool(self.config.ENABLE_USER_CREATE_ORG_REPO) is True
        self.config.ENABLE_USER_CREATE_ORG_REPO = False
        assert bool(self.config.ENABLE_USER_CREATE_ORG_REPO) is False

        self.login_as(self.admin)

        resp = self.client.put(self.url+'?share_type=public&permission=rw')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert 'success' in json_resp

    def test_user_can_not_set_pub_repo_when_setting_disalbed(self):
        assert bool(self.config.ENABLE_USER_CREATE_ORG_REPO) is True
        self.config.ENABLE_USER_CREATE_ORG_REPO = False
        assert bool(self.config.ENABLE_USER_CREATE_ORG_REPO) is False

        self.login_as(self.user)

        resp = self.client.put(self.user_repo_url+'?share_type=public&permission=rw')
        self.assertEqual(403, resp.status_code)
