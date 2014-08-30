from apitestbase import MISC_LIST_EVENTS_URL, MISC_LIST_GROUP_AND_CONTACTS_URL
from apitestbase import get_authed_instance, IS_PRO, MISC_SEARCH_URL
import unittest

class MiscApiTestCase(unittest.TestCase):

  def setUp(self):
    self.requests = get_authed_instance()
    self.assertIsNotNone(self.requests)

  def test_list_group_and_contacts_api(self):
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

  def test_search_api(self):
    # if not pro, skip this
    if (IS_PRO == False):
      return
    res = self.requests.get(MISC_SEARCH_URL + u'?q=*')
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)
    self.assertIsNotNone(json['has_more'])
    self.assertIsNotNone(json['total'])
    self.assertIsNotNone(json['results'])
    for result in json['results']:
      self.assertIsNotNone(result['repo_id'])
      self.assertIsNotNone(result['name'])
      self.assertIsNotNone(result['old'])
      self.assertIsNotNone(result['last_modified'])
      self.assertIsNotNone(result['fullpath'])
      self.assertIsNotNone(result['size'])

  def test_list_events_api(self):
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
