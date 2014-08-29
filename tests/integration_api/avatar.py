from integration_api import AVATAR_BASE_URL, get_authed_instance
from integration_api import GROUPS_URL, USERNAME
from common.utils import randomword
import unittest

class AvatarApiTestCase(unittest.TestCase):

  def setUp(self):
    self.requests = get_authed_instance()
    self.assertIsNotNone(self.requests)

  def test_user_avatar_api(self):
    res = self.requests.get(AVATAR_BASE_URL + u'user/' + USERNAME + u'/resized/80/')
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)
    self.assertIsNotNone(json['url'])
    self.assertIsNotNone(json['is_default'])
    self.assertIsNotNone(json['mtime'])

  def test_group_avatar_api(self):
    gname = randomword(16)
    data = { 'group_name': gname }
    res = self.requests.put(GROUPS_URL, data=data)
    gid = res.json()['group_id']
    res = self.requests.get(AVATAR_BASE_URL + u'group/' + str(gid) + u'/resized/80/')
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)
    self.assertIsNotNone(json['url'])
    self.assertIsNotNone(json['is_default'])
    self.assertIsNotNone(json['mtime'])

if __name__ == '__main__':
  unittest.main(verbosity=2)
