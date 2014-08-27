from integration_api import ACCOUNTS_URL, GROUPS_URL, get_authed_instance
from common.utils import randomword
import unittest

class GroupMemeberApiTestCase(unittest.TestCase):

  def setUp(self):
    self.requests = get_authed_instance()
    self.assertIsNotNone(self.requests)
    self.name = randomword(4) + u'@test.com'
    data = {'password': 'testtest'}
    self.requests.put(ACCOUNTS_URL + self.name + u'/', data=data)
    self.gname = randomword(16)
    data = { 'group_name': self.gname }
    res = self.requests.put(GROUPS_URL, data=data)
    self.gid = res.json()['group_id']
    self.gurl = GROUPS_URL + str(self.gid) + u'/members/'

  def tearDown(self):
    self.requests.delete(ACCOUNTS_URL + self.name + u'/')

  def testAddGroupMemberApi(self):
    data = { 'user_name': self.name }
    res = self.requests.put(self.gurl, data=data)
    self.assertEqual(res.status_code, 200)
    self.assertEqual(res.json()['success'], True)
    self.requests.delete(self.gurl, data=data)

  def testRemoveGroupMemberApi(self):
    data = { 'user_name': self.name }
    self.requests.put(self.gurl, data=data)
    res = self.requests.delete(self.gurl, data=data)
    self.assertEqual(res.status_code, 200)
    self.assertEqual(res.json()['success'], True)

if __name__ == '__main__':
  unittest.main(verbosity=2)
