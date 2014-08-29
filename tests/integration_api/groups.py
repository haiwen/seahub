from integration_api import GROUPS_URL, get_authed_instance
from common.utils import randomword
import unittest

class GroupsApiTestCase(unittest.TestCase):

  def setUp(self):
    self.requests = get_authed_instance()
    self.assertIsNotNone(self.requests)

  def test_list_groups_api(self):
    data = { 'group_name': 'demo group' }
    self.requests.put(GROUPS_URL, data=data)
    res = self.requests.get(GROUPS_URL)
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)
    self.assertIsNotNone(json['replynum'])
    self.assertIsNotNone(json['groups'])
    self.assertGreater(len(json['groups']), 0)
    for group in json['groups']:
      self.assertIsNotNone(group['ctime'])
      self.assertIsNotNone(group['creator'])
      self.assertIsNotNone(group['msgnum'])
      self.assertIsNotNone(group['mtime'])
      self.assertIsNotNone(group['id'])
      self.assertIsNotNone(group['name'])

  def test_add_group_api(self):
    # We cannot create two groups which have the same group name or delete group
    # Hack it by creating group with a random name, hope it won't break ci
    data = { 'group_name': randomword(16) }
    res = self.requests.put(GROUPS_URL, data=data)
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)
    self.assertIsNotNone(json['group_id'])
    self.assertEqual(json['success'], True)

if __name__ == '__main__':
  unittest.main(verbosity=2)
