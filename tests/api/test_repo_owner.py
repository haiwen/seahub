"""seahub/api2/views.py::Repo api tests.
"""
import json
from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase
from tests.common.utils import randstring

class RepoTest(BaseTestCase):

    def setUp(self):
        self.user_repo_id = self.repo.id

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
