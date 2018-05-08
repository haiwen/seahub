from django.core.urlresolvers import reverse
import pytest
pytestmark = pytest.mark.django_db

from seahub.options.models import (UserOptions, KEY_FORCE_PASSWD_CHANGE,
                                   VAL_FORCE_PASSWD_CHANGE)
from seahub.test_utils import BaseTestCase


class UserAddTest(BaseTestCase):
    def setUp(self):
        self.clear_cache()
        from constance import config
        self.config = config

        self.new_user = 'new_user@test.com'
        self.login_as(self.admin)
        self.remove_user(self.new_user)

    def test_can_add_when_pwd_change_required(self):
        self.config.FORCE_PASSWORD_CHANGE = 1

        assert len(UserOptions.objects.filter(
            email=self.new_user, option_key=KEY_FORCE_PASSWD_CHANGE)) == 0

        resp = self.client.post(
            reverse('user_add',), {
                'email': self.new_user,
                'password1': '123',
                'password2': '123',
            }, HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )

        self.assertEqual(200, resp.status_code)
        assert UserOptions.objects.get(
            email=self.new_user,
            option_key=KEY_FORCE_PASSWD_CHANGE).option_val == VAL_FORCE_PASSWD_CHANGE

    def test_can_add_when_pwd_change_not_required(self):
        self.config.FORCE_PASSWORD_CHANGE = 0

        assert len(UserOptions.objects.filter(
            email=self.new_user, option_key=KEY_FORCE_PASSWD_CHANGE)) == 0

        resp = self.client.post(
            reverse('user_add',), {
                'email': self.new_user,
                'password1': '123',
                'password2': '123',
            }, HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )

        self.assertEqual(200, resp.status_code)
        assert len(UserOptions.objects.filter(
            email=self.new_user, option_key=KEY_FORCE_PASSWD_CHANGE)) == 0
