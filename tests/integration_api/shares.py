from common.utils import randomword
from integration_api import SHARED_LINKS_URL, LIBRARIES_URL, \
        DEFAULT_LIBRARY_URL, SHARED_LIBRARIES_URL, BESHARED_LIBRARIES_URL, \
        USERNAME, SHARED_FILES_URL, GROUPS_URL, F_URL, S_F_URL, \
        get_authed_instance, get_anonymous_instance
import unittest

class SharesApiTestCase(unittest.TestCase):

  def setUp(self):
    self.requests = get_authed_instance()
    self.arequests = get_anonymous_instance()
    self.assertIsNotNone(self.requests)
    res = self.requests.post(DEFAULT_LIBRARY_URL)
    self.rid = res.json()['repo_id']
    self.rurl = LIBRARIES_URL + str(self.rid) + u'/'
    self.furl = self.rurl + u'file/'
    self.durl = self.rurl + u'dir/'
    self.gname = randomword(16)
    data = { 'group_name': self.gname }
    res = self.requests.put(GROUPS_URL, data=data)
    self.gid = res.json()['group_id']

  def test_list_file_shared_links_api(self):
    res = self.requests.get(SHARED_LINKS_URL)
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)
    for fileshare in json['fileshares']:
      self.assertIsNotNone(fileshare['username'])
      self.assertIsNotNone(fileshare['repo_id'])
      #self.assertIsNotNone(fileshare['ctime'])
      self.assertIsNotNone(fileshare['s_type'])
      self.assertIsNotNone(fileshare['token'])
      self.assertIsNotNone(fileshare['view_cnt'])
      self.assertIsNotNone(fileshare['path'])

  def test_create_file_shared_link_api(self):
    data = { 'operation': 'create' }
    furl = self.furl + u'?p=/test_create_shared_link_f'
    self.requests.post(furl, data=data)
    fsurl = self.furl + u'shared-link/'
    data = { 'type': 'f', 'p': '/test_create_shared_link_f' }
    res = self.requests.put(fsurl, data=data)
    self.assertEqual(res.status_code, 201)
    self.assertRegexpMatches(res.headers['Location'], \
            r'http(.*)/f/(\w{10,10})/')

  def test_create_directory_shared_link_api(self):
    data = { 'operation': 'mkdir' }
    durl = self.durl + u'?p=/test_create_shared_link_d'
    self.requests.post(durl, data=data)
    self.requests.post(durl, data=data)
    fsurl = self.furl + u'shared-link/'
    data = { 'type': 'd', 'p': '/test_create_shared_link_d' }
    res = self.requests.put(fsurl, data=data)
    self.assertEqual(res.status_code, 201)
    self.assertRegexpMatches(res.headers['Location'], \
            r'http(.*)/d/(\w{10,10})/')

  def test_remove_shared_link_api(self):
    data = { 'operation': 'create' }
    furl = self.furl + u'?p=/test_remove_shared_link_f'
    self.requests.post(furl, data=data)
    fsurl = self.furl + u'shared-link/'
    data = { 'type': 'f', 'p': '/test_remove_shared_link_f' }
    res = self.requests.put(fsurl, data=data)
    import re
    t = re.match(r'http(.*)/f/(\w{10,10})/', res.headers['Location']).group(2)
    fturl = SHARED_LINKS_URL + u'?t=' + t
    res = self.requests.delete(fturl)
    self.assertEqual(res.status_code, 200)
    self.assertEqual(res.text, u'{}')

  def test_get_shared_file_url_api(self):
    data = { 'operation': 'create' }
    furl = self.furl + u'?p=/test_visit_shared_link_f'
    self.requests.post(furl, data=data)
    fsurl = self.furl + u'shared-link/'
    data = { 'type': 'f', 'p': '/test_visit_shared_link_f' }
    res = self.requests.put(fsurl, data=data)
    import re
    t = re.match(r'http(.*)/f/(\w{10,10})/', res.headers['Location']).group(2)
    fdurl = F_URL + t + u'/'
    res = self.requests.get(fdurl)
    self.assertEqual(res.status_code, 200)
    self.assertRegexpMatches(res.text, r'"http(.*)/files/\w{8,8}/(.*)"')

  def test_get_shared_file_detail_api(self):
    data = { 'operation': 'create' }
    furl = self.furl + u'?p=/test_visitd_shared_link_f'
    self.requests.post(furl, data=data)
    fsurl = self.furl + u'shared-link/'
    data = { 'type': 'f', 'p': '/test_visitd_shared_link_f' }
    res = self.requests.put(fsurl, data=data)
    import re
    t = re.match(r'http(.*)/f/(\w{10,10})/', res.headers['Location']).group(2)
    fdurl = F_URL + t + u'/detail/'
    res = self.requests.get(fdurl)
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)
    self.assertIsNotNone(json['repo_id'])
    self.assertIsNotNone(json['name'])
    self.assertIsNotNone(json['size'])
    self.assertIsNotNone(json['path'])
    self.assertIsNotNone(json['type'])
    self.assertIsNotNone(json['mtime'])
    self.assertIsNotNone(json['id'])

  def test_get_private_shared_file_url_api(self):
    if True: #todo: override this
      return
    data = { 'operation': 'create' }
    furl = self.furl + u'?p=/test_visit_shared_link_sf'
    self.requests.post(furl, data=data)
    fsurl = self.furl + u'shared-link/'
    data = { 'type': 'f', 'p': '/test_visit_shared_link_sf' }
    res = self.requests.put(fsurl, data=data)
    import re
    t = re.match(r'http(.*)/f/(\w{10,10})/', res.headers['Location']).group(2)
    fdurl = S_F_URL + t + u'/'
    res = self.requests.get(fdurl)
    self.assertEqual(res.status_code, 200)
    self.assertRegexpMatches(res.text, r'"http(.*)/files/\w{8,8}/(.*)"')

  def test_get_private_shared_file_detail_api(self):
    if True: #todo: override this
      return
    data = { 'operation': 'create' }
    furl = self.furl + u'?p=/test_visitd_shared_link_sf'
    self.requests.post(furl, data=data)
    fsurl = self.furl + u'shared-link/'
    data = { 'type': 'f', 'p': '/test_visitd_shared_link_sf' }
    res = self.requests.put(fsurl, data=data)
    import re
    t = re.match(r'http(.*)/f/(\w{10,10})/', res.headers['Location']).group(2)
    fdurl = S_F_URL + t + u'/detail/'
    res = self.requests.get(fdurl)
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)
    self.assertIsNotNone(json['repo_id'])
    self.assertIsNotNone(json['name'])
    self.assertIsNotNone(json['size'])
    self.assertIsNotNone(json['path'])
    self.assertIsNotNone(json['type'])
    self.assertIsNotNone(json['mtime'])
    self.assertIsNotNone(json['id'])

  def test_remove_shared_file_api(self):
    if True: #todo: override this
      return
    data = { 'operation': 'create' }
    furl = self.furl + u'?p=/test_remove_shared_file'
    self.requests.post(furl, data=data)
    fsurl = self.furl + u'shared-link/'
    data = { 'type': 'f', 'p': '/test_remove_shared_file' }
    res = self.requests.put(fsurl, data=data)
    import re
    t = re.match(r'http(.*)/f/(\w{10,10})/', res.headers['Location']).group(2)
    fturl = SHARED_FILES_URL + u'?t=' + t
    res = self.requests.delete(fturl)
    self.assertEqual(res.status_code, 200)
    self.assertEqual(res.text, u'{}')

  def test_list_shared_libraries_api(self):
    res = self.requests.get(SHARED_LIBRARIES_URL)
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)
    for repo in json:
      self.assertIsNotNone(repo['repo_id'])
      self.assertIsNotNone(repo['share_type'])
      self.assertIsNotNone(repo['permission'])
      self.assertIsNotNone(repo['encrypted'])
      self.assertIsNotNone(repo['user'])
      self.assertIsNotNone(repo['last_modified'])
      self.assertIsNotNone(repo['repo_desc'])
      self.assertIsNotNone(repo['group_id'])
      self.assertIsNotNone(repo['repo_name'])

  def test_list_beshared_libraries_api(self):
    res = self.requests.get(BESHARED_LIBRARIES_URL)
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)
    for repo in json:
      self.assertIsNotNone(repo['user'])
      self.assertIsNotNone(repo['repo_id'])
      self.assertIsNotNone(repo['share_type'])
      self.assertIsNotNone(repo['permission'])
      self.assertIsNotNone(repo['encrypted'])
      self.assertIsNotNone(repo['last_modified'])
      self.assertIsNotNone(repo['repo_desc'])
      self.assertIsNotNone(repo['group_id'])
      self.assertIsNotNone(repo['repo_name'])
      self.assertIsNotNone(repo['is_virtual'])

  def test_share_library_api(self):
    data = { 'share_type': 'group', 'user': USERNAME, 'group_id': self.gid , \
            'permission': 'rw' }
    slurl = SHARED_LIBRARIES_URL + str(self.rid) + u'/'
    res = self.requests.put(slurl, params=data)
    self.assertEqual(res.status_code, 200)
    self.assertEqual(res.text, u'"success"')

  def test_un_share_library_api(self):
    data = { 'share_type': 'group', 'user': USERNAME, 'group_id': self.gid , \
            'permission': 'rw' }
    slurl = SHARED_LIBRARIES_URL + str(self.rid) + u'/'
    data = { 'share_type': 'group', 'user': USERNAME, 'group_id': self.gid }
    self.requests.put(slurl, params=data)
    res = self.requests.delete(slurl, params=data)
    self.assertEqual(res.status_code, 200)
    self.assertEqual(res.text, u'"success"')

  def test_list_shared_files_api(self):
    res = self.requests.get(SHARED_FILES_URL)
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)
    self.assertIsNotNone(json['priv_share_in'])
    self.assertIsNotNone(json['priv_share_out'])

    for sfiles in zip(json['priv_share_in'], json['priv_share_out']):
      for sfile in sfiles:
        self.assertIsNotNone(sfile['s_type'])
        self.assertIsNotNone(sfile['repo_id'])
        self.assertIsNotNone(sfile['permission'])
        self.assertIsNotNone(sfile['to_user'])
        self.assertIsNotNone(sfile['token'])
        self.assertIsNotNone(sfile['from_user'])
        self.assertIsNotNone(sfile['path'])

if __name__ == '__main__':
  unittest.main(verbosity=2)
