from integration_api import STARREDFILES_URL, get_authed_instance
from integration_api import DEFAULT_LIBRARY_URL, LIBRARIES_URL
import unittest

class StarredFilesApiTestCase(unittest.TestCase):

  def setUp(self):
    self.requests = get_authed_instance()
    self.assertIsNotNone(self.requests)
    res = self.requests.post(DEFAULT_LIBRARY_URL)
    self.rid = res.json()['repo_id']
    self.rurl = LIBRARIES_URL + str(self.rid) + u'/'
    self.furl = self.rurl + u'file/'

  def test_list_starred_files_api(self):
    res = self.requests.get(STARREDFILES_URL)
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)

  def test_star_file_api(self):
    data = { 'operation': 'create' }
    furl = self.furl + '?p=/test.c'
    self.requests.post(furl, data=data)
    data = { 'repo_id': self.rid, 'p': '/test.c' }
    res = self.requests.post(STARREDFILES_URL, data=data)
    self.assertEqual(res.status_code, 201)
    self.assertEqual(res.text, u'"success"')

  def test_un_star_file_api(self):
    data = { 'operation': 'create' }
    furl = self.furl + '?p=/test.c'
    self.requests.post(furl, data=data)
    data = { 'repo_id': self.rid, 'p': '/test.c' }
    res = self.requests.post(STARREDFILES_URL, data=data)
    res = self.requests.delete(STARREDFILES_URL, params=data)
    self.assertEqual(res.status_code, 200)
    self.assertEqual(res.text, u'"success"')

if __name__ == '__main__':
  unittest.main(verbosity=2)
