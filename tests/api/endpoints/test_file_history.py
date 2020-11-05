import json

from django.urls import reverse

from seahub.test_utils import BaseTestCase
from tests.common.utils import randstring

class FileHistoryTest(BaseTestCase):

    def setUp(self):

        self.endpoint = reverse('api-v2.1-file-history-view', args=[self.repo.id])
        self.username = self.user.username

    def tearDown(self):
        self.remove_repo()

    def test_can_get(self):
        self.login_as(self.user)
        file_path = self.file
        resp = self.client.get(self.endpoint + "?path=%s" % file_path)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['data'][0]['path'] == file_path
        assert json_resp['data'][0]['creator_email'] == self.user.username

    def test_can_get_with_invalid_path_parameter(self):
        self.login_as(self.user)
        resp = self.client.get(self.endpoint)
        self.assertEqual(400, resp.status_code)

    def test_can_get_with_invalid_user_permission(self):
        self.login_as(self.admin)
        file_path = self.file
        resp = self.client.get(self.endpoint + "?path=%s" % file_path)
        self.assertEqual(403, resp.status_code)

    def test_can_get_with_invalid_file(self):
        self.login_as(self.admin)
        resp = self.client.get(self.endpoint + "?path=%s" % randstring(6))
        self.assertEqual(404, resp.status_code)
