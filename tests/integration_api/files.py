from integration_api import DEFAULT_LIBRARY_URL, get_authed_instance
from integration_api import LIBRARIES_URL
import unittest

class FilesApiTestCase(unittest.TestCase):

  def setUp(self):
    self.requests = get_authed_instance()
    self.assertIsNotNone(self.requests)
    res = self.requests.post(DEFAULT_LIBRARY_URL)
    self.rid = res.json()['repo_id']
    self.rurl = LIBRARIES_URL + str(self.rid) + u'/'
    self.furl = self.rurl + u'file/'

  def test_create_file_api(self):
    data = { 'operation': 'create' }
    furl = self.furl + u'?p=/test.c'
    res = self.requests.post(furl, data=data)
    self.assertEqual(res.status_code, 201)
    self.assertEqual(res.text, '"success"')

  def test_rename_file_api(self):
    data = { 'operation': 'create' }
    furl = self.furl + u'?p=/test2.c'
    res = self.requests.post(furl, data=data)
    data = { 'operation': 'rename', 'newname': 'test.c' }
    res = self.requests.post(furl, data=data)
    self.assertEqual(res.status_code, 200)
    self.assertRegexpMatches(res.text, r'"http(.*)"')

  def test_remove_file_api(self):
    data = { 'operation': 'create' }
    furl = self.furl + u'?p=/test2.c'
    res = self.requests.post(furl, data=data)
    res = self.requests.delete(furl)
    self.assertEqual(res.status_code, 200)
    self.assertEqual(res.text, '"success"')

  def test_move_file_api(self):
    data = { 'operation': 'create' }
    furl = self.furl + u'?p=/test2.c'
    res = self.requests.post(furl, data=data)
    #todo: create another repo here, and use is as dst_repo
    data = { 'operation': 'move', 'dst_repo': self.rid, 'dst_dir': '/'}
    res = self.requests.post(furl, data=data)
    self.assertEqual(res.status_code, 200)
    self.assertEqual(res.text, '"success"')

  def test_copy_file_api(self):
    data = { 'operation': 'create' }
    furl = self.furl + u'?p=/test2.c'
    res = self.requests.post(furl, data=data)
    #todo: create another repo here, and use is as dst_repo
    fopurl = self.rurl + u'fileops/copy/?p=/'
    data = { 'file_names': 'test2.c', 'dst_repo': self.rid, 'dst_dir': '/'}
    res = self.requests.post(fopurl, data=data)
    self.assertEqual(res.text, '"success"')
    self.assertEqual(res.status_code, 200)
    self.assertEqual(res.text, '"success"')

  def test_download_file_api(self):
    data = { 'operation': 'create' }
    furl = self.furl + u'?p=/test.c'
    self.requests.post(furl, data=data)
    res = self.requests.get(furl)
    self.assertEqual(res.status_code, 200)
    self.assertRegexpMatches(res.text, r'"http(.*)/test.c"')

  def test_download_file_from_history_api(self):
    data = { 'operation': 'create' }
    furl = self.furl + '?p=/test.c'
    self.requests.post(furl, data=data)
    fhurl = self.furl + u'history/?p=/test.c'
    res = self.requests.get(fhurl)
    self.assertEqual(res.status_code, 200)
    json = res.json()
    commit_id = json['commits'][0]['id']
    self.assertIsNotNone(commit_id)
    fcurl = self.furl + u'revision/?p=/test.c&commit_id=' + commit_id
    res = self.requests.get(fcurl)
    self.assertEqual(res.status_code, 200)
    self.assertRegexpMatches(res.text, r'"http(.*)/test.c"')

  def test_get_file_detail_api(self):
    data = { 'operation': 'create' }
    furl = self.furl + '?p=/test.c'
    self.requests.post(furl, data=data)
    fdurl = self.furl + u'detail/?p=/test.c'
    res = self.requests.get(fdurl)
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)
    self.assertIsNotNone(json['id'])
    self.assertIsNotNone(json['mtime'])
    self.assertIsNotNone(json['type'])
    self.assertIsNotNone(json['name'])
    self.assertIsNotNone(json['size'])

  def test_get_file_history_api(self):
    data = { 'operation': 'create' }
    furl = self.furl + '?p=/test.c'
    self.requests.post(furl, data=data)
    fhurl = self.furl + u'history/?p=/test.c'
    res = self.requests.get(fhurl)
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)
    self.assertIsNotNone(json['commits'])
    for commit in json['commits']:
      self.assertIsNotNone(commit['rev_file_size'])
      #self.assertIsNotNone(commit['rev_file_id']) #allow null
      self.assertIsNotNone(commit['ctime'])
      self.assertIsNotNone(commit['creator_name'])
      self.assertIsNotNone(commit['creator'])
      self.assertIsNotNone(commit['root_id'])
      #self.assertIsNotNone(commit['rev_renamed_old_path']) #allow null
      #self.assertIsNotNone(commit['parent_id']) #allow null
      self.assertIsNotNone(commit['new_merge'])
      self.assertIsNotNone(commit['repo_id'])
      self.assertIsNotNone(commit['desc'])
      self.assertIsNotNone(commit['id'])
      self.assertIsNotNone(commit['conflict'])
      #self.assertIsNotNone(commit['second_parent_id']) #allow null

  def test_get_upload_link_api(self):
    upload_url = self.rurl + u'upload-link/'
    res = self.requests.get(upload_url)
    self.assertEqual(res.status_code, 200)
    self.assertRegexpMatches(res.text, r'"http(.*)/upload-api/\w{8,8}"')

  def test_get_updataink_api(self):
    update_url = self.rurl + u'update-link/'
    res = self.requests.get(update_url)
    self.assertEqual(res.status_code, 200)
    self.assertRegexpMatches(res.text, r'"http(.*)/update-api/\w{8,8}"')

  def test_upload_api(self):
    furl = self.furl + u'?p=/test_upload.c'
    res = self.requests.delete(furl)
    upload_url = self.rurl + u'upload-link/'
    res = self.requests.get(upload_url)
    import re
    upload_api_url = re.match(r'"(.*)"', res.text).group(1)
    #target_file must contains its parent dir path
    files = { 'file': ('test_upload'+'.c', 'int main(){return0;}\n'), \
            'parent_dir': '/' }
    res = self.requests.post(upload_api_url, files=files)
    self.assertEqual(res.status_code, 200)
    self.assertRegexpMatches(res.text, r'\w{40,40}')

  def test_update_api(self):
    data = { 'operation': 'create' }
    furl = self.furl + u'?p=/test_update.c'
    res = self.requests.post(furl, data=data)
    # call update-link
    update_url = self.rurl + u'update-link/'
    res = self.requests.get(update_url)
    import re
    update_api_url = re.match(r'"(.*)"', res.text).group(1)
    #target_file must contains its parent dir path
    files = { 'file': ('test_update.c', 'int main(){return0;}\n'), \
            'target_file': '/test_update.c' }
    res = self.requests.post(update_api_url, files=files)
    self.assertEqual(res.status_code, 200)
    self.assertRegexpMatches(res.text, r'\w{40,40}')

  def test_get_upload_blocks_link_api(self):
    upload_blks_url = self.rurl + u'upload-blks-link/'
    res = self.requests.get(upload_blks_url)
    self.assertEqual(res.status_code, 200)
    self.assertRegexpMatches(res.text, r'"http(.*)/upload-blks-api/\w{8,8}"')

  def test_get_update_blocks_link_api(self):
    update_blks_url = self.rurl + u'update-blks-link/'
    res = self.requests.get(update_blks_url)
    self.assertEqual(res.status_code, 200)
    self.assertRegexpMatches(res.text, r'"http(.*)/update-blks-api/\w{8,8}"')

if __name__ == '__main__':
  unittest.main(verbosity=2)
