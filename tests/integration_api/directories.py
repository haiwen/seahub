from integration_api import DEFAULT_LIBRARY_URL, get_authed_instance, \
        LIBRARIES_URL, USERNAME
import unittest

class DirectoriesApiTestCase(unittest.TestCase):

  def setUp(self):
    self.requests = get_authed_instance()
    self.assertIsNotNone(self.requests)
    res = self.requests.post(DEFAULT_LIBRARY_URL)
    self.rid = res.json()['repo_id']
    self.rurl = LIBRARIES_URL + str(self.rid) + u'/'
    self.durl = self.rurl + u'dir/'

  def testListDirectoryApi(self):
    res = self.requests.get(self.durl)
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)
    for directory in json:
      self.assertIsNotNone(directory['id'])
      self.assertIsNotNone(directory['type'])
      self.assertIsNotNone(directory['name'])
      #self.assertIsNotNone(directory['size']) #allow null

  def testCreateDirectoryApi(self):
    data = { 'operation': 'mkdir' }
    durl = self.durl + u'?p=/test'
    res = self.requests.post(durl, data=data)
    self.assertEqual(res.status_code, 201)
    self.assertEqual(res.text, u'"success"')

  def testRemoveDirectoryApi(self):
    data = { 'operation': 'mkdir' }
    durl = self.durl + u'?p=/test_dir_remove'
    res = self.requests.post(durl, data=data)
    res = self.requests.delete(durl)
    self.assertEqual(res.status_code, 200)
    self.assertEqual(res.text, u'"success"')

  def testDownloadDirectoryApi(self):
    data = { 'operation': 'mkdir' }
    durl = self.durl + u'?p=/test_dir_download'
    self.requests.post(durl, data=data)
    ddurl = self.durl + u'download/?p=/test_dir_download'
    res = self.requests.get(ddurl)
    self.assertEqual(res.status_code, 200)
    self.assertRegexpMatches(res.text,  \
            r'"http(.*)/files/\w{8,8}/test_dir_download"')

  def testShareDirectoryApi(self):
    data = { 'operation': 'mkdir' }
    durl = self.durl + u'?p=/test_dir_share'
    self.requests.post(durl, data=data)
    dsurl = self.durl + u'share/?p=/test_dir_share'
    data = { 'emails': USERNAME, 's_type': 'd', 'path': '/', 'perm': 'r' }
    res = self.requests.post(dsurl, data=data)
    self.assertEqual(res.status_code, 200)
    self.assertEqual(res.text, u'{}')

if __name__ == '__main__':
  unittest.main(verbosity=2)
