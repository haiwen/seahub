from integration_api import STARREDFILES_URL, get_authed_instance
import unittest

class StarredFilesApiTestCase(unittest.TestCase):

  def setUp(self):
    self.requests = get_authed_instance()
    self.assertIsNotNone(self.requests)
    #todo upload file and star a file here

  def testListStarredFilesApi(self):
    res = self.requests.get(STARREDFILES_URL)
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)
    self.assertEqual(len(json), 0)

  def testStarFileApi(self):
    data = { 'repo_id': '', 'p': '' }
    res = self.requests.post(STARREDFILES_URL, data=data)
    self.assertEqual(res.status_code, 201)
    self.assertEqual(res.text, u'"success"')

  def testUnStarFileApi(self):
    data = { 'repo_id': '', 'p': '' }
    res = self.requests.delete(STARREDFILES_URL, data=data)
    self.assertEqual(res.status_code, 200)
    self.assertEqual(res.text, u'"success"')


if __name__ == '__main__':
  unittest.main(verbosity=2)
