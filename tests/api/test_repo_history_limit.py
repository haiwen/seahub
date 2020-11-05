"""seahub/api2/views.py::Repo api tests.
"""
import json

import pytest
from seaserv import seafile_api, ccnet_api

from django.urls import reverse
from seahub.test_utils import BaseTestCase
from tests.common.utils import randstring
from seahub.group.utils import is_group_admin

try:
    from seahub.settings import LOCAL_PRO_DEV_ENV
except ImportError:
    LOCAL_PRO_DEV_ENV = False

pytestmark = pytest.mark.django_db


class RepoTest(BaseTestCase):

    def setUp(self):
        self.user_repo_id = self.repo.id
        from constance import config
        self.config = config

        self.tmp_user = self.create_user(
            'user_%s@test.com' % randstring(4), is_staff=False)

    def tearDown(self):
        self.remove_repo()
        self.clear_cache()
        self.remove_user(self.tmp_user.username)

    def test_can_get_history_limit(self):
        self.login_as(self.user)
        resp = self.client.get(reverse("api2-repo-history-limit", args=[self.user_repo_id]))
        json_resp = json.loads(resp.content)
        assert json_resp['keep_days'] == -1

    def test_can_get_history_limit_if_setting_not_enabled(self):
        self.login_as(self.user)

        self.config.ENABLE_REPO_HISTORY_SETTING = False

        resp = self.client.get(reverse("api2-repo-history-limit", args=[self.user_repo_id]))
        json_resp = json.loads(resp.content)
        assert json_resp['keep_days'] == -1

    def test_can_set_history_limit(self):
        self.login_as(self.user)
        url = reverse("api2-repo-history-limit", args=[self.user_repo_id])

        days = 0
        data = 'keep_days=%s' % days
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        json_resp = json.loads(resp.content)
        assert json_resp['keep_days'] == days

        days = 6
        data = 'keep_days=%s' % days
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        json_resp = json.loads(resp.content)
        assert json_resp['keep_days'] == days

        days = -1
        data = 'keep_days=%s' % days
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        json_resp = json.loads(resp.content)
        assert json_resp['keep_days'] == days

        days = -7
        data = 'keep_days=%s' % days
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        json_resp = json.loads(resp.content)
        assert json_resp['keep_days'] == -1

    def test_can_not_get_if_not_repo_owner(self):
        self.login_as(self.admin)

        resp = self.client.get(reverse("api2-repo-history-limit", args=[self.user_repo_id]))
        self.assertEqual(403, resp.status_code)

    def test_can_not_set_if_not_repo_owner(self):
        self.login_as(self.admin)

        url = reverse("api2-repo-history-limit", args=[self.user_repo_id])
        data = 'keep_days=%s' % 6
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)

    def test_can_not_set_if_not_invalid_arg(self):
        self.login_as(self.user)

        url = reverse("api2-repo-history-limit", args=[self.user_repo_id])
        data = 'limit_ays=%s' % 6
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(400, resp.status_code)

        url = reverse("api2-repo-history-limit", args=[self.user_repo_id])
        data = 'keep_days=%s' % 'invalid-arg'
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(400, resp.status_code)

    def test_can_not_set_if_setting_not_enabled(self):
        self.login_as(self.user)

        self.config.ENABLE_REPO_HISTORY_SETTING = False

        url = reverse("api2-repo-history-limit", args=[self.user_repo_id])
        data = 'keep_days=%s' % 6
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)

    def test_can_set_department_repo(self):
        if not LOCAL_PRO_DEV_ENV:
            return

        # create a department
        group_id = ccnet_api.create_group('department_test', 'system admin', parent_group_id=-1)
        seafile_api.set_group_quota(group_id, -2)
        repo_id = seafile_api.add_group_owned_repo(group_id, 'dep_test', 'rw')
        repo_owner = seafile_api.get_repo_owner(repo_id)
        assert '@seafile_group' in repo_owner
        group_repos = seafile_api.get_repos_by_group(group_id)
        assert len(group_repos) == 1
        group = ccnet_api.get_group(group_id)

        # department add user
        ccnet_api.group_add_member(group_id, group.creator_name, self.user.username)
        ccnet_api.group_add_member(group_id, group.creator_name, self.tmp_user.username)
        ccnet_api.group_set_admin(group_id, self.user.username)
        ccnet_api.group_unset_admin(group_id, self.tmp_user.username)
        assert is_group_admin(group_id, self.user.username)
        assert not is_group_admin(group_id, self.tmp_user.username)

        url = reverse("api2-repo-history-limit", args=[repo_id])
        self.config.ENABLE_REPO_HISTORY_SETTING = True

        # department member can not set
        self.logout()
        self.login_as(self.tmp_user)
        data = 'keep_days=%s' % 6
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)

        # department admin can set
        self.logout()
        self.login_as(self.user)
        data = 'keep_days=%s' % 6
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        self.remove_group(group_id)
        self.remove_repo(repo_id)
