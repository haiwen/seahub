import integration_api as common
import requests
import unittest

class PingApiTestCase(unittest.TestCase):

  def setUp(self):
    self.res = requests.get(common.PING_URL)

  def testPingApi(self):
    self.assertEqual(self.res.status_code, 200)
    self.assertRegexpMatches(self.res.text, u'"pong"')

if __name__ == '__main__':
  unittest.main(verbosity=2)
