import integration_api as common
import unittest

class AuthPingApiTestCase(unittest.TestCase):

  def setUp(self):
    self.requests = common.getAuthedInstance()
    self.assertIsNotNone(self.requests)

  def testAuthPingApi(self):
    res = self.requests.get(common.AUTH_PING_URL)
    self.assertEqual(res.status_code, 200)
    self.assertRegexpMatches(res.text, u'"pong"')

if __name__ == '__main__':
  unittest.main(verbosity=2)
