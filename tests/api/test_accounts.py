import requests

from tests.common.utils import randstring
from tests.api.apitestbase import ApiTestBase
from tests.api.urls import PING_URL, AUTH_PING_URL

test_account_username = 'test_%s@test.com' % randstring(10)
test_account_password = randstring(20)
test_account_password2 = randstring(20)

class AccountsApiTest(ApiTestBase):

    def test_update_account_passwd(self):
        with self.get_tmp_user() as user:
            data = {'password': 'new_password'}
            self.admin_put(user.user_url, data=data, expected=200)

    def test_set_account_to_staff(self):
        with self.get_tmp_user() as user:
            self.assertEqual(self.admin_get(user.user_url).json()['is_staff'],
                             False)
            data = {'is_staff': 'true'}
            self.admin_put(user.user_url, data=data, expected=200)
            self.assertEqual(self.admin_get(user.user_url).json()['is_staff'],
                             True)

    def test_set_account_inactive(self):
        with self.get_tmp_user() as user:
            self.assertEqual(self.admin_get(user.user_url).json()['is_active'],
                             True)
            data = {'is_active': 'false'}
            self.admin_put(user.user_url, data=data, expected=200)
            self.assertEqual(self.admin_get(user.user_url).json()['is_active'],
                             False)

    def test_set_account_inactive_with_wrong_arg(self):
        with self.get_tmp_user() as user:
            self.assertEqual(self.admin_get(user.user_url).json()['is_active'],
                             True)
            data = {'is_active': 'fals'}
            self.admin_put(user.user_url, data=data, expected=400)

    def test_set_account_inactive_with_empty_arg(self):
        with self.get_tmp_user() as user:
            self.assertEqual(self.admin_get(user.user_url).json()['is_active'],
                             True)
            data = {'is_active': ''}
            self.admin_put(user.user_url, data=data, expected=400)

    def test_update_account_nickname(self):
        with self.get_tmp_user() as user:
            data = {'name': 'new nick name'}
            self.admin_put(user.user_url, data=data, expected=200)

    # def test_update_account_nickname_with_slash(self):
    #     with self.get_tmp_user() as user:
    #         data = {'name': 'new /nick name'}
    #         self.admin_put(user.user_url, data=data, expected=400)

    def test_update_account_intro(self):
        with self.get_tmp_user() as user:
            data = {'note': 'hello, my name is foo'}
            self.admin_put(user.user_url, data=data, expected=200)

    def test_update_account_storage_quota(self):
        with self.get_tmp_user() as user:
            data = {'storage': 1024}  # 1 Mb
            self.admin_put(user.user_url, data=data, expected=200)
            self.assertEqual(self.admin_get(user.user_url).json()['total'],
                             1024000000)

    # def test_update_account_sharing_quota(self):
    #     with self.get_tmp_user() as user:
    #         data = {'sharing': 1024}  # 1KB
    #         self.admin_put(user.user_url, data=data, expected=200)
    #         self.assertEqual(self.admin_get(user.user_url).json()['sharing'],
    #                          1024)

    def test_unset_trial_account(self):
        with self.get_tmp_user() as user:
            data = {'is_trial': 'false'}
            self.admin_put(user.user_url, data=data, expected=200)

    def test_auth_ping(self):
        res = self.get(AUTH_PING_URL)
        self.assertRegex(res.text, '"pong"')
        res = requests.get(AUTH_PING_URL)
        self.assertEqual(res.status_code, 403)

    def test_ping(self):
        res = requests.get(PING_URL)
        self.assertRegex(res.text, '"pong"')
        self.assertEqual(res.status_code, 200)
