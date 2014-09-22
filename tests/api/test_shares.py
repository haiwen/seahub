#coding: UTF-8

from tests.common.utils import urljoin
from tests.api.apitestbase import ApiTestBase
from tests.api.urls import SHARED_LINKS_URL, SHARED_LIBRARIES_URL, \
    BESHARED_LIBRARIES_URL, SHARED_FILES_URL, F_URL, S_F_URL

class SharesApiTest(ApiTestBase):
    def test_create_file_shared_link(self):
        with self.get_tmp_repo() as repo:
            fname, _ = self.create_file(repo)
            fsurl = urljoin(repo.file_url, 'shared-link')
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
