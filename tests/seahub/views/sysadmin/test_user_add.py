import json

from django.urls import reverse
import pytest
pytestmark = pytest.mark.django_db

from seahub.options.models import (UserOptions, KEY_FORCE_PASSWD_CHANGE,
                                   VAL_FORCE_PASSWD_CHANGE)
from seahub.test_utils import BaseTestCase


class UserAddTest(BaseTestCase):
    def setUp(self):
        self.clear_cache()
        self.new_user = 'new_user@test.com'
        self.login_as(self.admin)
        self.remove_user(self.new_user)

    def test_can_add_requires_password_change(self):
        assert len(UserOptions.objects.filter(
            email=self.new_user, option_key=KEY_FORCE_PASSWD_CHANGE)) == 0

        resp = self.client.post(
            reverse('api-v2.1-admin-users',), {
                'email': self.new_user,
                'password': '123',
            }
        )

        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert UserOptions.objects.get(
            email=json_resp['email'],
            option_key=KEY_FORCE_PASSWD_CHANGE).option_val == VAL_FORCE_PASSWD_CHANGE
