import json
from django.urls import reverse
from django.test import override_settings

from seahub.test_utils import BaseTestCase


@override_settings(ENABLE_WEBDAV_SECRET=True)
class WebdavSecretTest(BaseTestCase):
    def setUp(self, ):
        self.login_as(self.user)

    def test_can_get(self, ):
        resp = self.client.get(reverse('api-v2.1-webdav-secret'))
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['secret'] is None

    def test_can_put(self, ):
        resp = self.client.put(
            reverse('api-v2.1-webdav-secret'), 'secret=123456',
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(200, resp.status_code)

        resp = self.client.put(
            reverse('api-v2.1-webdav-secret'), 'secret=',
            'application/x-www-form-urlencoded',
        )
        self.assertEqual(200, resp.status_code)
