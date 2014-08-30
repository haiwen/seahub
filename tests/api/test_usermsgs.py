from apitestbase import USERNAME, get_authed_instance
from apitestbase import USERMSGS_URL, USERMSGS_COUNT_URL
import unittest

class UserMsgsApiTestCase(unittest.TestCase):

  def setUp(self):
    self.requests = get_authed_instance()
    self.assertIsNotNone(self.requests)

  def test_list_user_msgs_api(self):
    res = self.requests.get(USERMSGS_URL)
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)
    self.assertEqual(json['to_email'], USERNAME)
    self.assertIsNotNone(json['next_page'])
    self.assertIsNotNone(json['msgs'])

  def test_reply_user_msg_api(self):
    data = { 'id': '0', 'message': 'test' }
    res = self.requests.post(USERMSGS_URL, data=data)
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)
    self.assertIsNotNone(json['msgid'])

  def test_count_unseen_msgs_api(self):
    data = { 'id': '0', 'message': 'test' }
    self.requests.post(USERMSGS_URL, data=data)
    res = self.requests.get(USERMSGS_COUNT_URL, data=data)
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)
    self.assertGreater(json['count'], 0)

if __name__ == '__main__':
  unittest.main(verbosity=2)
