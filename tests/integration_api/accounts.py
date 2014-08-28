from integration_api import ACCOUNTS_URL, ACCOUNT_INFO_URL, get_authed_instance
from integration_api import USERNAME
import unittest

ACCOUNT_USERNAME = u'test_tmp@test.com'
ACCOUNT_PASSWORD = r'test_test'
ACCOUNT_PASSWORD2 = r'test_test2'
ACCOUNT_URL = ACCOUNTS_URL + ACCOUNT_USERNAME + u'/'

class AccountsApiTestCase(unittest.TestCase):

  def setUp(self):
    self.requests = get_authed_instance()
    self.assertIsNotNone(self.requests)

  def testCheckAccountInfoApi(self):
    res = self.requests.get(ACCOUNT_INFO_URL)
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)
    self.assertEqual(json['email'], USERNAME)
    self.assertIsNotNone(json['total'])
    self.assertIsNotNone(json['usage'])

  def testListAccountsApi(self):
    res = self.requests.get(ACCOUNTS_URL)
    self.assertEqual(res.status_code, 200)
    self.assertIsNotNone(res.json())
    found = False
    for i in res.json():
      if (i['email'] == USERNAME):
        found = True
    self.assertEqual(found, True)

  def testCreateAccountApi(self):
    data = { 'password': ACCOUNT_PASSWORD }
    res = self.requests.put(ACCOUNT_URL, data=data)
    self.assertEqual(res.status_code, 201)
    self.assertEqual(res.text, u'"success"')
    self.requests.delete(ACCOUNT_URL)

  def testUpdateAccountApi(self):
    data = { 'password': ACCOUNT_PASSWORD }
    self.requests.put(ACCOUNT_URL, data=data)
    data = { 'password': ACCOUNT_PASSWORD2, 'is_staff': 1,
              'is_active': 1 }
    res = self.requests.put(ACCOUNT_URL, data=data)
    self.assertEqual(res.status_code, 200)
    self.assertEqual(res.text, u'"success"')
    self.requests.delete(ACCOUNT_URL)
    #TODO: verify updated account

  def testDeleteAccountApi(self):
    data = { 'password': ACCOUNT_PASSWORD }
    res = self.requests.put(ACCOUNT_URL, data=data)
    res = self.requests.delete(ACCOUNT_URL)
    self.assertEqual(res.status_code, 200)
    self.assertEqual(res.text, u'"success"')
    res = self.requests.get(ACCOUNTS_URL)
    found = False
    for i in res.json():
      if (i['email'] == ACCOUNT_USERNAME):
        found = True
    self.assertEqual(found, False)

if __name__ == '__main__':
  unittest.main(verbosity=2)
