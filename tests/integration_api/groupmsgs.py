from integration_api import GROUPS_URL, GROUPMSGS_URL, GROUPMSGS_NREPLY_URL
from integration_api import GROUP_URL, get_authed_instance
from common.utils import randomword
import unittest

class GroupMsgsApiTestCase(unittest.TestCase):

  def setUp(self):
    self.requests = get_authed_instance()
    self.assertIsNotNone(self.requests)
    self.gname = randomword(16)
    data = { 'group_name': self.gname }
    res = self.requests.put(GROUPS_URL, data=data)
    self.gid = res.json()['group_id']
    self.gmurl = GROUPMSGS_URL + str(self.gid) + u'/'
    self.gmurl_ = GROUP_URL + str(self.gid) + u'/msg/'

  def testListGroupMsgsApi(self):
    res = self.requests.get(self.gmurl)
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)
    self.assertIsNotNone(json['next_page'])
    self.assertIsNotNone(json['msgs'])

  def testPostGroupMsgApi(self):
    #repo_id and path is not tested
    data = { 'message': 'test message' }
    res = self.requests.post(self.gmurl, data=data)
    self.assertEqual(res.status_code, 200)
    self.assertIsNotNone(res.json()['msgid'])

  def testReplyGroupMsgApi(self):
    data = { 'message': 'test message' }
    res = self.requests.post(self.gmurl, data=data)
    msgid = res.json()['msgid']
    res = self.requests.post(self.gmurl_ + str(msgid) + u'/', data=data)
    self.assertEqual(res.status_code, 200)
    self.assertIsNotNone(res.json()['msgid'])

  def testGetGroupMsgDetailApi(self):
    data = { 'message': 'test message' }
    res = self.requests.post(self.gmurl, data=data)
    msgid = res.json()['msgid']
    res = self.requests.get(self.gmurl_ + str(msgid) + u'/')
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)
    self.assertIsNotNone(json['reply_cnt'])
    self.assertIsNotNone(json['timestamp'])
    self.assertIsNotNone(json['replies'])
    self.assertIsNotNone(json['from_email'])
    self.assertIsNotNone(json['msgid'])
    self.assertIsNotNone(json['msg'])
    self.assertIsNotNone(json['nickname'])

  def testNewRepliesGroupMsgApi(self):
    data = { 'message': 'test message' }
    res = self.requests.post(self.gmurl, data=data)
    res = self.requests.get(GROUPMSGS_NREPLY_URL)
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)
    for reply in json:
      self.assertIsNotNone(reply['reply_cnt'])
      self.assertIsNotNone(reply['timestamp'])
      self.assertIsNotNone(reply['replies'])
      self.assertIsNotNone(reply['from_email'])
      self.assertIsNotNone(reply['msgid'])
      self.assertIsNotNone(reply['msg'])
      self.assertIsNotNone(reply['nickname'])

if __name__ == '__main__':
  unittest.main(verbosity=2)
