#coding: UTF-8

import random
import re
from urllib import urlencode, quote

from apitestbase import ApiTestCase, DEFAULT_LIBRARY_URL, apiurl

DEFAULT_REPO_URL = '/api2/default-repo/'
REPO_URL = '/api2/repos/%s/'

class FilesApiTestCase(ApiTestCase):
    def setUp(self):
        res = self.post(apiurl(DEFAULT_REPO_URL)).json()
        self.repo_id = res['repo_id']
        self.repo_url = apiurl(REPO_URL % self.repo_id)
        self.file_url = self.repo_url + u'file/'

    def create_file(self):
        data = {'operation': 'create'}
        name = '文件%s.txt' % random.randint(1, 10000)
        query = '?p=/%s' % quote(name)
        furl = self.file_url + query
        res = self.post(furl, data=data, expected=201)
        self.assertEqual(res.text, '"success"')
        return name, furl

    def test_create_file(self):
        self.create_file()

    # def test_rename_file(self):
    #     name, furl = self.create_file()
    #     data = {
    #         'operation': 'rename',
    #         'newname': name + str(random.randint(1, 10000)),
    #     }
    #     res = self.post(furl, data=data)
    #     self.assertRegexpMatches(res.text, r'"http(.*)"')

    # def test_remove_file(self):
    #     _, furl = self.create_file()
    #     res = self.delete(furl)
    #     self.assertEqual(res.text, '"success"')

    # def test_move_file(self):
    #     _, furl = self.create_file()
    #     # TODO: create another repo here, and use it as dst_repo
    #     data = {
    #         'operation': 'move',
    #         'dst_repo': self.repo_id,
    #         'dst_dir': '/'
    #     }
    #     res = self.post(furl, data=data)
    #     self.assertEqual(res.text, '"success"')

    # def test_copy_file(self):
    #     fname, _ = self.create_file()
    #     # TODO: create another repo here, and use it as dst_repo
    #     fopurl = self.repo_url + u'fileops/copy/?p=/'
    #     data = {
    #         'file_names': fname,
    #         'dst_repo': self.repo_id,
    #         'dst_dir': '/'
    #     }
    #     res = self.post(fopurl, data=data)
    #     self.assertEqual(res.text, '"success"')

    # def test_download_file(self):
    #     fname, furl = self.create_file()
    #     res = self.get(furl)
    #     self.assertRegexpMatches(res.text, '"http(.*)/%s"' % quote(fname))

    # def test_download_file_from_history(self):
    #     fname, _ = self.create_file()
    #     file_history_url = self.file_url + u'history/?p=/%s' % quote(fname)
    #     res = self.get(file_history_url).json()
    #     commit_id = res['commits'][0]['id']
    #     self.assertEqual(len(commit_id), 40)
    #     data = {
    #         'p': fname,
    #         'commit_id': commit_id,
    #     }
    #     query = '?' + urlencode(data)
    #     res = self.get(self.file_url + query)
    #     self.assertEqual(res.status_code, 200)
    #     self.assertRegexpMatches(res.text, r'"http(.*)/%s"' % quote(fname))

    # def test_get_file_detail(self):
    #     fname, _ = self.create_file()
    #     fdurl = self.file_url + u'detail/?p=/%s' % quote(fname)
    #     detail = self.get(fdurl).json()
    #     self.assertIsNotNone(detail)
    #     self.assertIsNotNone(detail['id'])
    #     self.assertIsNotNone(detail['mtime'])
    #     self.assertIsNotNone(detail['type'])
    #     self.assertIsNotNone(detail['name'])
    #     self.assertIsNotNone(detail['size'])

    # def test_get_file_history(self):
    #     self.create_file()
    #     fhurl = self.file_url + u'history/?p=/test.c'
    #     history = self.get(fhurl).json()
    #     for commit in history['commits']:
    #         self.assertIsNotNone(commit['rev_file_size'])
    #         #self.assertIsNotNone(commit['rev_file_id']) #allow null
    #         self.assertIsNotNone(commit['ctime'])
    #         self.assertIsNotNone(commit['creator_name'])
    #         self.assertIsNotNone(commit['creator'])
    #         self.assertIsNotNone(commit['root_id'])
    #         #self.assertIsNotNone(commit['rev_renamed_old_path']) #allow null
    #         #self.assertIsNotNone(commit['parent_id']) #allow null
    #         self.assertIsNotNone(commit['new_merge'])
    #         self.assertIsNotNone(commit['repo_id'])
    #         self.assertIsNotNone(commit['desc'])
    #         self.assertIsNotNone(commit['id'])
    #         self.assertIsNotNone(commit['conflict'])
    #         #self.assertIsNotNone(commit['second_parent_id']) #allow null

    # def test_get_upload_link(self):
    #     upload_url = self.repo_url + u'upload-link/'
    #     res = self.get(upload_url)
    #     self.assertRegexpMatches(res.text, r'"http(.*)/upload-api/\w{8,8}"')

    # def test_get_update_link(self):
    #     update_url = self.repo_url + u'update-link/'
    #     res = self.get(update_url)
    #     self.assertEqual(res.status_code, 200)
    #     self.assertRegexpMatches(res.text, r'"http(.*)/update-api/\w{8,8}"')

    # def test_upload(self):
    #     furl = self.file_url + u'?p=/test_upload.c'
    #     res = self.delete(furl)
    #     upload_url = self.repo_url + u'upload-link/'
    #     res = self.get(upload_url)
    #     upload_api_url = re.match(r'"(.*)"', res.text).group(1)
    #     #target_file must contains its parent dir path
    #     files = { 'file': ('test_upload'+'.c', 'int main(){return0;}\n'), \
    #                     'parent_dir': '/' }
    #     res = self.post(upload_api_url, files=files)
    #     self.assertEqual(res.status_code, 200)
    #     self.assertRegexpMatches(res.text, r'\w{40,40}')

    # def test_update(self):
    #     data = { 'operation': 'create' }
    #     furl = self.file_url + u'?p=/test_update.c'
    #     res = self.post(furl, data=data)
    #     # call update-link
    #     update_url = self.repo_url + u'update-link/'
    #     res = self.get(update_url)
    #     update_api_url = re.match(r'"(.*)"', res.text).group(1)
    #     #target_file must contains its parent dir path
    #     files = { 'file': ('test_update.c', 'int main(){return0;}\n'), \
    #                     'target_file': '/test_update.c' }
    #     res = self.post(update_api_url, files=files)
    #     self.assertEqual(res.status_code, 200)
    #     self.assertRegexpMatches(res.text, r'\w{40,40}')

    # def test_get_upload_blocks_link(self):
    #     upload_blks_url = self.repo_url + u'upload-blks-link/'
    #     res = self.get(upload_blks_url)
    #     self.assertEqual(res.status_code, 200)
    #     self.assertRegexpMatches(res.text, r'"http(.*)/upload-blks-api/\w{8,8}"')

    # def test_get_update_blocks_link(self):
    #     update_blks_url = self.repo_url + u'update-blks-link/'
    #     res = self.get(update_blks_url)
    #     self.assertEqual(res.status_code, 200)
    #     self.assertRegexpMatches(res.text, r'"http(.*)/update-blks-api/\w{8,8}"')
