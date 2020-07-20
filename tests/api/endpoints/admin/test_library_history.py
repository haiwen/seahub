import json

from django.urls import reverse
from seahub.test_utils import BaseTestCase

class LibraryHistory(BaseTestCase):
    def setUp(self):
        self.login_as(self.admin)
        self.repo_id = self.repo.id
        self.url = reverse('api-v2.1-admin-library-history-limit', kwargs=dict(repo_id=self.repo_id))

    def test_get_admin_permission_denied(self):
        self.logout()
        self.login_as(self.admin_cannot_manage_library)
        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)

    def test_put_admin_permission_denied(self):
        self.logout()
        self.login_as(self.admin_cannot_manage_library)
        resp = self.client.put(self.url)
        self.assertEqual(403, resp.status_code)

    def test_can_get(self):
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

    def test_can_put(self):
        data = "keep_days=-1"
        resp = self.client.put(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertEqual(-1, json_resp['keep_days'])

        data = "keep_days=0"
        resp = self.client.put(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertEqual(0, json_resp['keep_days'])

        data = "keep_days=8"
        resp = self.client.put(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertEqual(8, json_resp['keep_days'])

        data = "keep_days=q"
        resp = self.client.put(self.url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(400, resp.status_code)
