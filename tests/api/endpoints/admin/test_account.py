import json

from django.urls import reverse

from seahub.options.models import UserOptions
from seahub.test_utils import BaseTestCase
from tests.common.utils import randstring


class AdminAccountPasswordPolicyTest(BaseTestCase):

    def setUp(self):
        self.email = f'{randstring(10)}@example.com'
        self.url = reverse('api2-account', args=[self.email])
        self.login_as(self.admin)

    def tearDown(self):
        self.remove_user(self.email)

    def test_create_account_requires_password_change(self):
        data = {
            'password': randstring(10),
            'is_staff': False,
            'is_active': True,
        }

        resp = self.client.put(
            self.url, json.dumps(data), content_type='application/json'
        )

        self.assertEqual(201, resp.status_code)
        username = resp.json()['email']
        assert UserOptions.objects.passwd_change_required(username)

    def test_update_password_requires_password_change(self):
        self.create_user(email=self.email)

        resp = self.client.put(
            self.url,
            json.dumps({'password': randstring(10)}),
            content_type='application/json',
        )

        self.assertEqual(200, resp.status_code)
        assert UserOptions.objects.passwd_change_required(self.email)
