import json
from django.urls import reverse

from seahub.test_utils import BaseTestCase


class DefaultRepoViewTest(BaseTestCase):
    def setUp(self, ):
        self.url = reverse('api2-defaultrepo')
        self.login_as(self.user)

    def test_get_none_exists(self, ):
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['exists'] is False

    def test_create(self, ):
        resp = self.client.post(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['exists'] is True
        assert len(json_resp['repo_id']) == 36
