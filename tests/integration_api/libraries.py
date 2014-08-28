from integration_api import LIBRARIES_URL, DEFAULT_LIBRARY_URL
from integration_api import VIRTUAL_LIBRARIES_URL, get_authed_instance
import unittest

class LibrariesApiTestCase(unittest.TestCase):

  def setUp(self):
    self.requests = get_authed_instance()
    self.assertIsNotNone(self.requests)

  def testGetDefaultLibraryApi(self):
    res = self.requests.get(DEFAULT_LIBRARY_URL)
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)
    self.assertIsNotNone(json['repo_id'])
    self.assertIsNotNone(json['exists'])

  def testCreateDefaultLibraryApi(self):
    res = self.requests.post(DEFAULT_LIBRARY_URL)
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)
    self.assertIsNotNone(json['repo_id'])
    self.assertEqual(res.json()['exists'], True)
    res = self.requests.get(DEFAULT_LIBRARY_URL)
    self.assertEqual(res.json()['exists'], True)

  def testListLibrariesApi(self):
    res = self.requests.get(LIBRARIES_URL)
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertEqual(res.status_code, 200)
    self.assertIsNotNone(json)
    for repo in json:
      self.assertIsNotNone(repo['permission'])
      self.assertIsNotNone(repo['encrypted'])
      self.assertIsNotNone(repo['mtime'])
      self.assertIsNotNone(repo['owner'])
      self.assertIsNotNone(repo['id'])
      self.assertIsNotNone(repo['size'])
      self.assertIsNotNone(repo['name'])
      self.assertIsNotNone(repo['type'])
      # self.assertIsNotNone(repo['virtual']) #allow null for pub-repo
      self.assertIsNotNone(repo['desc'])
      self.assertIsNotNone(repo['root'])

  def testGetLibraryInfoApi(self):
    res = self.requests.post(DEFAULT_LIBRARY_URL)
    repo_id = res.json()['repo_id']
    repo_url = LIBRARIES_URL + repo_id + u'/'
    res = self.requests.get(repo_url)
    self.assertEqual(res.status_code, 200)
    repo = res.json()
    self.assertIsNotNone(repo)
    self.assertIsNotNone(repo['encrypted'])
    self.assertIsNotNone(repo['mtime'])
    self.assertIsNotNone(repo['owner'])
    self.assertIsNotNone(repo['id'])
    self.assertIsNotNone(repo['size'])
    self.assertIsNotNone(repo['name'])
    self.assertIsNotNone(repo['root'])
    self.assertIsNotNone(repo['desc'])
    self.assertIsNotNone(repo['type'])
    #self.assertIsNotNone(repo['password_need']) #allow null here

  def testGetLibraryOwnerApi(self):
    res = self.requests.post(DEFAULT_LIBRARY_URL)
    repo_id = res.json()['repo_id']
    repo_owner_url = LIBRARIES_URL + repo_id + u'/owner/'
    res = self.requests.get(repo_owner_url)
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)
    self.assertIsNotNone(json['owner'])

  def testGetLibraryHistoryApi(self):
    res = self.requests.post(DEFAULT_LIBRARY_URL)
    repo_id = res.json()['repo_id']
    repo_history_url = LIBRARIES_URL + repo_id + u'/history/'
    res = self.requests.get(repo_history_url)
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

  def testCreateLibraryApi(self):
    data = { 'name': 'test' }
    res = self.requests.post(LIBRARIES_URL, data=data)
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)
    self.assertIsNotNone(json['encrypted'])
    self.assertIsNotNone(json['enc_version'])
    self.assertIsNotNone(json['repo_id'])
    self.assertIsNotNone(json['magic'])
    self.assertIsNotNone(json['relay_id'])
    self.assertIsNotNone(json['repo_version'])
    self.assertIsNotNone(json['relay_addr'])
    self.assertIsNotNone(json['token'])
    self.assertIsNotNone(json['relay_port'])
    self.assertIsNotNone(json['random_key'])
    self.assertIsNotNone(json['email'])
    self.assertIsNotNone(json['repo_name'])

  def testRemoveLibraryApi(self):
    data = { 'name': 'test' }
    res = self.requests.post(LIBRARIES_URL, data=data)
    repo_id = res.json()['repo_id']
    repo_url = LIBRARIES_URL + repo_id + u'/'
    res = self.requests.delete(repo_url)
    self.assertEqual(res.status_code, 200)
    self.assertEqual(res.text, '"success"')

  def testCheckOrCreateSubLibraryApi(self):
    res = self.requests.post(DEFAULT_LIBRARY_URL)
    repo_id = res.json()['repo_id']
    params = { 'p': '/', 'name': 'sub_lib' }
    sub_repo_url = LIBRARIES_URL + repo_id + u'/dir/sub_repo/'
    res = self.requests.get(sub_repo_url, params=params)
    json = res.json()
    self.assertEqual(res.status_code, 200)
    self.assertIsNotNone(json)
    self.assertIsNotNone(json['sub_repo_id'])

  def testEncrptyOrDecrypyLibraryApi(self):
    res = self.requests.post(DEFAULT_LIBRARY_URL)
    repo_id = res.json()['repo_id']
    repo_url = LIBRARIES_URL + repo_id + u'/'
    data = { 'password': 'test' }
    res = self.requests.post(repo_url, data)
    self.assertEqual(res.status_code, 200)
    self.assertEqual(res.text, '"success"')

  def testPublicizeLibraryApi(self):
    res = self.requests.post(DEFAULT_LIBRARY_URL)
    repo_id = res.json()['repo_id']
    publicize_repo_url = LIBRARIES_URL + repo_id + u'/public/'
    res = self.requests.post(publicize_repo_url)
    self.assertEqual(res.status_code, 200)
    self.assertIsNotNone(res.json())
    self.assertEqual(res.json()['success'], True)

  def testDepublicizeLibraryApi(self):
    res = self.requests.post(DEFAULT_LIBRARY_URL)
    repo_id = res.json()['repo_id']
    publicize_repo_url = LIBRARIES_URL + repo_id + u'/public/'
    self.requests.post(publicize_repo_url)
    res = self.requests.delete(publicize_repo_url)
    self.assertEqual(res.status_code, 200)
    self.assertIsNotNone(res.json())
    self.assertEqual(res.json()['success'], True)

  def testFetchLibraryDownloadInfoApi(self):
    res = self.requests.post(DEFAULT_LIBRARY_URL)
    repo_id = res.json()['repo_id']
    download_info_repo_url = LIBRARIES_URL + repo_id + u'/download-info/'
    res = self.requests.get(download_info_repo_url)
    self.assertEqual(res.status_code, 200)
    json = res.json()
    self.assertIsNotNone(json)
    #self.assertIsNotNone(json['applet_root']) #does it exist?
    self.assertIsNotNone(json['relay_addr'])
    self.assertIsNotNone(json['token'])
    self.assertIsNotNone(json['repo_id'])
    self.assertIsNotNone(json['relay_port'])
    self.assertIsNotNone(json['encrypted'])
    self.assertIsNotNone(json['repo_name'])
    self.assertIsNotNone(json['relay_id'])
    self.assertIsNotNone(json['email'])

  def testListVirtualLibrariesApi(self):
    res = self.requests.get(VIRTUAL_LIBRARIES_URL)
    json = res.json()
    self.assertIsNotNone(json)
    self.assertIsNotNone(json['virtual-repos'])
    for repo in json['virtual-repos']:
      self.assertIsNotNone(repo['virtual_perm'])
      #self.assertIsNotNone(repo['store_id'])
      self.assertIsNotNone(repo['worktree_invalid'])
      self.assertIsNotNone(repo['encrypted'])
      self.assertIsNotNone(repo['origin_repo_name'])
      self.assertIsNotNone(repo['last_modify'])
      self.assertIsNotNone(repo['no_local_history'])
      #self.assertIsNotNone(repo['head_branch'])
      self.assertIsNotNone(repo['last_sync_time'])
      self.assertIsNotNone(repo['id'])
      self.assertIsNotNone(repo['size'])
      #self.assertIsNotNone(repo['share_permission'])
      self.assertIsNotNone(repo['worktree_changed'])
      self.assertIsNotNone(repo['worktree_checktime'])
      self.assertIsNotNone(repo['origin_path'])
      self.assertEqual(repo['is_virtual'], True)
      self.assertIsNotNone(repo['origin_repo_id'])
      self.assertIsNotNone(repo['version'])
      #self.assertIsNotNone(repo['random_key'])
      self.assertIsNotNone(repo['is_original_owner'])
      #self.assertIsNotNone(repo['shared_email'])
      self.assertIsNotNone(repo['enc_version'])
      self.assertIsNotNone(repo['head_cmmt_id'])
      #self.assertIsNotNone(repo['desc'])
      self.assertIsNotNone(repo['index_corrupted'])
      #self.assertIsNotNone(repo['magic'])
      self.assertIsNotNone(repo['name'])
      #self.assertIsNotNone(repo['worktree'])
      self.assertIsNotNone(repo['auto_sync'])
      #self.assertIsNotNone(repo['relay_id'])

if __name__ == '__main__':
  unittest.main(verbosity=2)
