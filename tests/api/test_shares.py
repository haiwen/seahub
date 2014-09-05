#coding: UTF-8

import unittest
from urllib import urlencode, quote
from tests.common.utils import apiurl, randstring, urljoin
from tests.api.apitestbase import ApiTestBase
from tests.api.urls import SHARED_LINKS_URL, SHARED_LIBRARIES_URL, \
    BESHARED_LIBRARIES_URL, SHARED_FILES_URL, F_URL, S_F_URL

class SharesApiTest(ApiTestBase):
    use_test_group = True
    use_test_repo = True

    def create_file(self, fname=None):
        data = {'operation': 'create'}
        fname = fname or ('文件 %s.txt' % randstring(10))
        fpath = '/' + fname
        query = urlencode(dict(p=fpath))
        furl = self.test_file_url + '?' + query
        res = self.post(furl, data=data, expected=201)
        self.assertEqual(res.text, '"success"')
        return fname, furl

    def test_create_file_shared_link(self):
        fname, _ = self.create_file()
        fsurl = urljoin(self.test_file_url, 'shared-link')
        data = {
            'type': 'f',
            'p': '/' + fname,
        }
        res = self.put(fsurl, data=data, expected=201)
        self.assertRegexpMatches(res.headers['Location'], \
                        r'http(.*)/f/(\w{10,10})/')

        res = self.get(SHARED_LINKS_URL).json()
        self.assertNotEmpty(res)
        for fileshare in res['fileshares']:
            self.assertIsNotNone(fileshare['username'])
            self.assertIsNotNone(fileshare['repo_id'])
            #self.assertIsNotNone(fileshare['ctime'])
            self.assertIsNotNone(fileshare['s_type'])
            self.assertIsNotNone(fileshare['token'])
            self.assertIsNotNone(fileshare['view_cnt'])
            self.assertIsNotNone(fileshare['path'])


    # def test_create_directory_shared_link(self):
    #     data = { 'operation': 'mkdir' }
    #     durl = self.test_dir_url + u'?p=/test_create_shared_link_d'
    #     self.post(durl, data=data)
    #     self.post(durl, data=data)
    #     fsurl = self.test_file_url + u'shared-link/'
    #     data = { 'type': 'd', 'p': '/test_create_shared_link_d' }
    #     res = self.put(fsurl, data=data)
    #     self.assertEqual(res.status_code, 201)
    #     self.assertRegexpMatches(res.headers['Location'], \
    #                     r'http(.*)/d/(\w{10,10})/')

    # def test_remove_shared_link(self):
    #     data = { 'operation': 'create' }
    #     furl = self.test_file_url + u'?p=/test_remove_shared_link_f'
    #     self.post(furl, data=data)
    #     fsurl = self.test_file_url + u'shared-link/'
    #     data = { 'type': 'f', 'p': '/test_remove_shared_link_f' }
    #     res = self.put(fsurl, data=data)
    #     import re
    #     t = re.match(r'http(.*)/f/(\w{10,10})/', res.headers['Location']).group(2)
    #     fturl = SHARED_LINKS_URL + u'?t=' + t
    #     res = self.delete(fturl)
    #     self.assertEqual(res.status_code, 200)
    #     self.assertEqual(res.text, u'{}')

    # def test_get_shared_file_url(self):
    #     data = { 'operation': 'create' }
    #     furl = self.test_file_url + u'?p=/test_visit_shared_link_f'
    #     self.post(furl, data=data)
    #     fsurl = self.test_file_url + u'shared-link/'
    #     data = { 'type': 'f', 'p': '/test_visit_shared_link_f' }
    #     res = self.put(fsurl, data=data)
    #     import re
    #     t = re.match(r'http(.*)/f/(\w{10,10})/', res.headers['Location']).group(2)
    #     fdurl = F_URL + t + u'/'
    #     res = self.get(fdurl)
    #     self.assertEqual(res.status_code, 200)
    #     self.assertRegexpMatches(res.text, r'"http(.*)/files/\w{8,8}/(.*)"')

    # def test_get_shared_file_detail(self):
    #     data = { 'operation': 'create' }
    #     furl = self.test_file_url + u'?p=/test_visitd_shared_link_f'
    #     self.post(furl, data=data)
    #     fsurl = self.test_file_url + u'shared-link/'
    #     data = { 'type': 'f', 'p': '/test_visitd_shared_link_f' }
    #     res = self.put(fsurl, data=data)
    #     import re
    #     t = re.match(r'http(.*)/f/(\w{10,10})/', res.headers['Location']).group(2)
    #     fdurl = F_URL + t + u'/detail/'
    #     res = self.get(fdurl)
    #     self.assertEqual(res.status_code, 200)
    #     json = res.json()
    #     self.assertIsNotNone(json)
    #     self.assertIsNotNone(json['repo_id'])
    #     self.assertIsNotNone(json['name'])
    #     self.assertIsNotNone(json['size'])
    #     self.assertIsNotNone(json['path'])
    #     self.assertIsNotNone(json['type'])
    #     self.assertIsNotNone(json['mtime'])
    #     self.assertIsNotNone(json['id'])

    # def test_get_private_shared_file_url(self):
    #     if True: #todo: override this
    #         return
    #     data = { 'operation': 'create' }
    #     furl = self.test_file_url + u'?p=/test_visit_shared_link_sf'
    #     self.post(furl, data=data)
    #     fsurl = self.test_file_url + u'shared-link/'
    #     data = { 'type': 'f', 'p': '/test_visit_shared_link_sf' }
    #     res = self.put(fsurl, data=data)
    #     import re
    #     t = re.match(r'http(.*)/f/(\w{10,10})/', res.headers['Location']).group(2)
    #     fdurl = S_F_URL + t + u'/'
    #     res = self.get(fdurl)
    #     self.assertEqual(res.status_code, 200)
    #     self.assertRegexpMatches(res.text, r'"http(.*)/files/\w{8,8}/(.*)"')

    # def test_get_private_shared_file_detail(self):
    #     if True: #todo: override this
    #         return
    #     data = { 'operation': 'create' }
    #     furl = self.test_file_url + u'?p=/test_visitd_shared_link_sf'
    #     self.post(furl, data=data)
    #     fsurl = self.test_file_url + u'shared-link/'
    #     data = { 'type': 'f', 'p': '/test_visitd_shared_link_sf' }
    #     res = self.put(fsurl, data=data)
    #     import re
    #     t = re.match(r'http(.*)/f/(\w{10,10})/', res.headers['Location']).group(2)
    #     fdurl = S_F_URL + t + u'/detail/'
    #     res = self.get(fdurl)
    #     self.assertEqual(res.status_code, 200)
    #     json = res.json()
    #     self.assertIsNotNone(json)
    #     self.assertIsNotNone(json['repo_id'])
    #     self.assertIsNotNone(json['name'])
    #     self.assertIsNotNone(json['size'])
    #     self.assertIsNotNone(json['path'])
    #     self.assertIsNotNone(json['type'])
    #     self.assertIsNotNone(json['mtime'])
    #     self.assertIsNotNone(json['id'])

    # def test_remove_shared_file(self):
    #     if True: #todo: override this
    #         return
    #     data = { 'operation': 'create' }
    #     furl = self.test_file_url + u'?p=/test_remove_shared_file'
    #     self.post(furl, data=data)
    #     fsurl = self.test_file_url + u'shared-link/'
    #     data = { 'type': 'f', 'p': '/test_remove_shared_file' }
    #     res = self.put(fsurl, data=data)
    #     import re
    #     t = re.match(r'http(.*)/f/(\w{10,10})/', res.headers['Location']).group(2)
    #     fturl = SHARED_FILES_URL + u'?t=' + t
    #     res = self.delete(fturl)
    #     self.assertEqual(res.status_code, 200)
    #     self.assertEqual(res.text, u'{}')

    # def test_list_shared_libraries(self):
    #     res = self.get(SHARED_LIBRARIES_URL)
    #     self.assertEqual(res.status_code, 200)
    #     json = res.json()
    #     self.assertIsNotNone(json)
    #     for repo in json:
    #         self.assertIsNotNone(repo['repo_id'])
    #         self.assertIsNotNone(repo['share_type'])
    #         self.assertIsNotNone(repo['permission'])
    #         self.assertIsNotNone(repo['encrypted'])
    #         self.assertIsNotNone(repo['user'])
    #         self.assertIsNotNone(repo['last_modified'])
    #         self.assertIsNotNone(repo['repo_desc'])
    #         self.assertIsNotNone(repo['group_id'])
    #         self.assertIsNotNone(repo['repo_name'])

    # def test_list_beshared_libraries(self):
    #     res = self.get(BESHARED_LIBRARIES_URL)
    #     self.assertEqual(res.status_code, 200)
    #     json = res.json()
    #     self.assertIsNotNone(json)
    #     for repo in json:
    #         self.assertIsNotNone(repo['user'])
    #         self.assertIsNotNone(repo['repo_id'])
    #         self.assertIsNotNone(repo['share_type'])
    #         self.assertIsNotNone(repo['permission'])
    #         self.assertIsNotNone(repo['encrypted'])
    #         self.assertIsNotNone(repo['last_modified'])
    #         self.assertIsNotNone(repo['repo_desc'])
    #         self.assertIsNotNone(repo['group_id'])
    #         self.assertIsNotNone(repo['repo_name'])
    #         self.assertIsNotNone(repo['is_virtual'])

    # def test_share_library(self):
    #     data = { 'share_type': 'group', 'user': USERNAME, 'group_id': self.gid , \
    #                     'permission': 'rw' }
    #     slurl = SHARED_LIBRARIES_URL + str(self.test_repo_id) + u'/'
    #     res = self.put(slurl, params=data)
    #     self.assertEqual(res.status_code, 200)
    #     self.assertEqual(res.text, u'"success"')

    # def test_un_share_library(self):
    #     data = { 'share_type': 'group', 'user': USERNAME, 'group_id': self.gid , \
    #                     'permission': 'rw' }
    #     slurl = SHARED_LIBRARIES_URL + str(self.test_repo_id) + u'/'
    #     data = { 'share_type': 'group', 'user': USERNAME, 'group_id': self.gid }
    #     self.put(slurl, params=data)
    #     res = self.delete(slurl, params=data)
    #     self.assertEqual(res.status_code, 200)
    #     self.assertEqual(res.text, u'"success"')

    # def test_list_shared_files(self):
    #     res = self.get(SHARED_FILES_URL)
    #     self.assertEqual(res.status_code, 200)
    #     json = res.json()
    #     self.assertIsNotNone(json)
    #     self.assertIsNotNone(json['priv_share_in'])
    #     self.assertIsNotNone(json['priv_share_out'])

    #     for sfiles in zip(json['priv_share_in'], json['priv_share_out']):
    #         for sfile in sfiles:
    #             self.assertIsNotNone(sfile['s_type'])
    #             self.assertIsNotNone(sfile['repo_id'])
    #             self.assertIsNotNone(sfile['permission'])
    #             self.assertIsNotNone(sfile['to_user'])
    #             self.assertIsNotNone(sfile['token'])
    #             self.assertIsNotNone(sfile['from_user'])
    #             self.assertIsNotNone(sfile['path'])
