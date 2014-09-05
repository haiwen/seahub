import unittest

from tests.common.utils import apiurl, urljoin
from tests.api.apitestbase import USERNAME, ApiTestBase
from tests.api.urls import ACCOUNTS_URL, ACCOUNT_INFO_URL, PING_URL, \
    AUTH_PING_URL

test_account_username = u'test_tmp@test.com'
test_account_password = r'test_test'
test_account_password2 = r'test_test2'
test_account_url = urljoin(ACCOUNTS_URL, test_account_username)

class AccountsApiTest(ApiTestBase):
    use_test_uesr = True

    def test_check_account_info(self):
        info = self.get(ACCOUNT_INFO_URL).json()
        self.assertIsNotNone(info)
        self.assertEqual(info['email'], USERNAME)
        self.assertIsNotNone(info['total'])
        self.assertIsNotNone(info['usage'])

    def test_list_accounts(self):
        accounts = self.get(ACCOUNTS_URL).json()
        found = False
        for account in accounts:
            if account['email'] == USERNAME:
                found = True
        self.assertTrue(found)

    def test_create_account(self):
        data = {'password': test_account_password}
        res = self.put(test_account_url, data=data, expected=201)
        self.assertEqual(res.text, u'"success"')
        self.delete(test_account_url)

    def test_update_account(self):
        data = {'password': test_account_password}
        self.put(test_account_url, data=data, expected=201)
        data = {
            'password': test_account_password2,
            'is_staff': 1,
            'is_active': 1,
        }
        res = self.put(test_account_url, data=data)
        self.assertEqual(res.text, u'"success"')
        self.delete(test_account_url)

    def test_delete_account(self):
        data = {'password': test_account_password}
        self.put(test_account_url, data=data, expected=201)
        res = self.delete(test_account_url)
        self.assertEqual(res.text, u'"success"')
        accounts = self.get(ACCOUNTS_URL).json()
        found = False
        for account in accounts:
            if account['email'] == test_account_username:
                found = True
        self.assertFalse(found)

    def test_auth_ping(self):
        res = self.get(AUTH_PING_URL)
        self.assertRegexpMatches(res.text, u'"pong"')

    def test_ping(self):
        res = self.get(PING_URL, auth=False)
        self.assertRegexpMatches(res.text, u'"pong"')
