"""seahub/api2/views.py::Repo api tests.
"""
import json

import pytest
pytestmark = pytest.mark.django_db

from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase


class RepoTest(BaseTestCase):

    def setUp(self):
        self.user_repo_id = self.repo.id
        from constance import config
        self.config = config

    def tearDown(self):
        self.remove_repo()
        self.clear_cache()

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
