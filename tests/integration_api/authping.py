from integration_api import AUTH_PING_URL, get_authed_instance
import unittest

class AuthPingApiTestCase(unittest.TestCase):

  def setUp(self):
    self.requests = get_authed_instance()
    self.assertIsNotNone(self.requests)

  def test_auth_ping_api(self):
    res = self.requests.get(AUTH_PING_URL)
    self.assertEqual(res.status_code, 200)
    self.assertRegexpMatches(res.text, u'"pong"')

if __name__ == '__main__':
  unittest.main(verbosity=2)
