# -*- coding: utf-8 -*-
import json

from django.urls import reverse

from seahub.api2.models import TokenV2
from seahub.test_utils import BaseTestCase, Fixtures


class DevicesTest(BaseTestCase, Fixtures):
    def setUp(self):
        self.platform = 'android'
        self.device_id = '4a0d62c1f27b3b74'
        TokenV2.objects.get_or_create_token(self.user.username, self.platform,
            self.device_id, 'PLK-AL10', '2.0.3', '5.0.2', '192.168.1.208')

    def tearDown(self):
        self.remove_repo()

    def test_can_list(self):
        self.login_as(self.user)

        resp = self.client.get(reverse('api2-devices'))
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp[0]['platform'] == self.platform
        assert json_resp[0]['device_id'] == self.device_id

    def test_can_not_list_if_not_authenticated(self):

        resp = self.client.get(reverse('api2-devices'))
        self.assertEqual(403, resp.status_code)

    def test_can_delete(self):
        self.login_as(self.user)
        data = 'platform=%s&device_id=%s' % (self.platform, self.device_id)
        resp = self.client.delete(reverse('api2-devices'), data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)
        self.assertEqual(0, len(TokenV2.objects.all()))

    def test_can_not_delete_with_invalid_args(self):
        self.login_as(self.user)

        resp = self.client.delete(reverse('api2-devices'))
        self.assertEqual(400, resp.status_code)
