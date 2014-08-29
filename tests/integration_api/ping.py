from integration_api import PING_URL
import requests, unittest

class PingApiTestCase(unittest.TestCase):

  def setUp(self):
    self.res = requests.get(PING_URL)

  def test_ping_api(self):
    self.assertEqual(self.res.status_code, 200)
    self.assertRegexpMatches(self.res.text, u'"pong"')

if __name__ == '__main__':
  unittest.main(verbosity=2)
