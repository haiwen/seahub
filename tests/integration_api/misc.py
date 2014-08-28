from integration_api import MISC_LIST_EVENTS_URL, MISC_LIST_GROUP_AND_CONTACTS_URL
from integration_api import get_authed_instance, IS_PRO
import unittest

class MiscApiTestCase(unittest.TestCase):

  def setUp(self):
    self.requests = get_authed_instance()
    self.assertIsNotNone(self.requests)

  def testListGroupAndContactsApi(self):
    res = self.requests.get(MISC_LIST_GROUP_AND_CONTACTS_URL)
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)
    self.assertIsNotNone(json['contacts'])
    self.assertIsNotNone(json['umsgnum'])
    self.assertIsNotNone(json['replynum'])
    self.assertIsNotNone(json['groups'])
    self.assertIsNotNone(json['gmsgnum'])
    self.assertIsNotNone(json['newreplies'])

  def testListEventsApi(self):
    # if not pro, skip this
    if (IS_PRO == False):
      return
    res = self.requests.get(MISC_LIST_EVENTS_URL)
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)
    self.assertIsNotNone(json['more_offset'])
    self.assertIsNotNone(json['events'])
    self.assertIsNotNone(json['more'])
    for repo in json['events']:
      self.assertIsNotNone(repo['repo_id'])
      self.assertIsNotNone(repo['author'])
      self.assertIsNotNone(repo['nick'])
      self.assertIsNotNone(repo['time'])
      self.assertIsNotNone(repo['etype'])
      self.assertIsNotNone(repo['repo_name'])
      self.assertIsNotNone(repo['desc'])

if __name__ == '__main__':
  unittest.main(verbosity=2)
