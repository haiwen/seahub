import requests
import unittest

from tests.common.utils import apiurl, urljoin, randstring
from tests.api.apitestbase import ApiTestBase
from tests.api.urls import ACCOUNTS_URL, ACCOUNT_INFO_URL, PING_URL, \
    AUTH_PING_URL

test_account_username = 'test_%s@test.com' % randstring(10)
test_account_password = randstring(20)
test_account_password2 = randstring(20)
test_account_url = urljoin(ACCOUNTS_URL, test_account_username)

class AccountsApiTest(ApiTestBase):
    def test_check_account_info(self):
        info = self.get(ACCOUNT_INFO_URL).json()
        self.assertIsNotNone(info)
        self.assertEqual(info['email'], self.username)
        self.assertIsNotNone(info['total'])
        self.assertIsNotNone(info['usage'])

    def test_list_accounts(self):
        # Normal user can not list accounts
        self.get(ACCOUNTS_URL, expected=403)
        accounts = self.admin_get(ACCOUNTS_URL).json()
        self.assertGreaterEqual(accounts, 2)
        # TODO: check returned json, test start/limit param

    def test_create_delete_account(self):
        data = {'password': test_account_password}
        # non-admin user can not create new user
        self.put(test_account_url, data=data, expected=403)

        res = self.admin_put(test_account_url, data=data, expected=201)
        self.assertEqual(res.text, u'"success"')

        # non-admin user can not delete a user
        self.delete(test_account_url, expected=403)

        self.admin_delete(test_account_url)
        # check the user is really deleted
        self.admin_get(test_account_url, expected=404)

    def test_auth_ping(self):
        res = self.get(AUTH_PING_URL)
        self.assertRegexpMatches(res.text, u'"pong"')
        res = requests.get(AUTH_PING_URL)
        self.assertEqual(res.status_code, 403)

    def test_ping(self):
        res = requests.get(PING_URL)
        self.assertRegexpMatches(res.text, u'"pong"')
        self.assertEqual(res.status_code, 200)
