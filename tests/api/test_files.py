#coding: UTF-8
"""
Test file/dir operations.
"""

import random
import re
import pytest
import urllib
from urllib import urlencode, quote, quote

from tests.common.utils import randstring, urljoin
from tests.api.urls import DEFAULT_REPO_URL, REPOS_URL
from tests.api.apitestbase import ApiTestBase, USERNAME

class FilesApiTest(ApiTestBase):
    def test_rename_file(self):
        with self.get_tmp_repo() as repo:
            name, furl = self.create_file(repo)
            data = {
                'operation': 'rename',
                'newname': name + randstring(),
            }
            res = self.post(furl, data=data)
            self.assertRegexpMatches(res.text, r'"http(.*)"')

    def test_remove_file(self):
        with self.get_tmp_repo() as repo:
            _, furl = self.create_file(repo)
            res = self.delete(furl)
            self.assertEqual(res.text, '"success"')

    def test_move_file(self):
        with self.get_tmp_repo() as repo:
            _, furl = self.create_file(repo)
            # TODO: create another repo here, and use it as dst_repo
            data = {
                'operation': 'move',
                'dst_repo': repo.repo_id,
                'dst_dir': '/',
            }
            res = self.post(furl, data=data)
            self.assertEqual(res.text, '"success"')

    def test_copy_file(self):
        with self.get_tmp_repo() as repo:
            fname, _ = self.create_file(repo)
            # TODO: create another repo here, and use it as dst_repo
            dpath, _ = self.create_dir(repo)
            fopurl = urljoin(repo.repo_url, 'fileops/copy/') + '?p=/'
            data = {
                'file_names': fname,
                'dst_repo': repo.repo_id,
                'dst_dir': dpath,
            }
            res = self.post(fopurl, data=data)
            self.assertEqual(res.text, '"success"')

            # create tmp file in sub folder(dpath)
            tmp_file = 'tmp_file.txt'
            furl = repo.get_filepath_url(dpath + '/' + tmp_file)
            data = {'operation': 'create'}
            res = self.post(furl, data=data, expected=201)

            # copy tmp file(in dpath) to dst dir
            fopurl = urljoin(repo.repo_url, 'fileops/copy/') + '?p=' + quote(dpath)
            data = {
                'file_names': tmp_file,
                'dst_repo': repo.repo_id,
                'dst_dir': dpath,
            }
            res = self.post(fopurl, data=data)
            self.assertEqual(res.text, '"success"')

    def test_download_file(self):
        with self.get_tmp_repo() as repo:
            fname, furl = self.create_file(repo)
            res = self.get(furl)
            self.assertRegexpMatches(res.text, '"http(.*)/%s"' % quote(fname))

    def test_download_file_without_reuse_token(self):
        with self.get_tmp_repo() as repo:
            fname, furl = self.create_file(repo)
            res = self.get(furl)
            self.assertRegexpMatches(res.text, '"http(.*)/%s"' % quote(fname))

            # download for the first time
            url = urllib.urlopen(res.text.strip('"'))
            code = url.getcode()
            self.assertEqual(code, 200)

            # download for the second time
            url = urllib.urlopen(res.text.strip('"'))
            code = url.getcode()
            self.assertEqual(code, 400)

    def test_download_file_with_reuse_token(self):
        with self.get_tmp_repo() as repo:
            fname, furl = self.create_file(repo)
            res = self.get(furl + '&reuse=1')
            self.assertRegexpMatches(res.text, '"http(.*)/%s"' % quote(fname))

            # download for the first time
            url = urllib.urlopen(res.text.strip('"'))
            code = url.getcode()
            self.assertEqual(code, 200)

            # download for the second time
            url = urllib.urlopen(res.text.strip('"'))
            code = url.getcode()
            self.assertEqual(code, 200)

    def test_download_file_from_history(self):
        with self.get_tmp_repo() as repo:
            fname, _ = self.create_file(repo)
            file_history_url = urljoin(repo.repo_url, 'history/') + \
                               '?p=/%s' % quote(fname)
            res = self.get(file_history_url).json()
            commit_id = res['commits'][0]['id']
            self.assertEqual(len(commit_id), 40)
            data = {
                'p': fname,
                'commit_id': commit_id,
            }
            query = '?' + urlencode(data)
            res = self.get(repo.file_url + query)
            self.assertRegexpMatches(res.text, r'"http(.*)/%s"' % quote(fname))

    def test_get_file_detail(self):
        with self.get_tmp_repo() as repo:
            fname, _ = self.create_file(repo)
            fdurl = repo.file_url + u'detail/?p=/%s' % quote(fname)
            detail = self.get(fdurl).json()
            self.assertIsNotNone(detail)
            self.assertIsNotNone(detail['id'])
            self.assertIsNotNone(detail['mtime'])
            self.assertIsNotNone(detail['type'])
            self.assertIsNotNone(detail['name'])
            self.assertIsNotNone(detail['size'])

    def test_get_file_history(self):
        with self.get_tmp_repo() as repo:
            fname, _ = self.create_file(repo)
            fhurl = repo.file_url + u'history/?p=%s' % quote(fname)
            history = self.get(fhurl).json()
            for commit in history['commits']:
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

    def test_get_upload_link(self):
        with self.get_tmp_repo() as repo:
            upload_url = urljoin(repo.repo_url, 'upload-link')
            res = self.get(upload_url)
            self.assertRegexpMatches(res.text, r'"http(.*)/upload-api/[^/]+"')

    def test_get_update_link(self):
        with self.get_tmp_repo() as repo:
            update_url = urljoin(repo.repo_url, 'update-link')
            res = self.get(update_url)
            self.assertRegexpMatches(res.text, r'"http(.*)/update-api/[^/]+"')

    # def test_upload_file(self):
    #     # XXX: requests has problems when post a file whose name contains
    #     # non-ascii data
    #     fname = 'file-upload-test %s.txt' % randstring()
    #     furl = self.test_file_url + '?p=/%s' % quote(fname)
    #     self.delete(furl)
    #     upload_url = self.test_repo_url + u'upload-link/'
    #     res = self.get(upload_url)
    #     upload_api_url = re.match(r'"(.*)"', res.text).group(1)
    #     files = {
    #         'file': (fname, 'Some lines in this file'),
    #         'parent_dir': '/',
    #     }
    #     res = self.post(upload_api_url, files=files)
    #     self.assertRegexpMatches(res.text, r'\w{40,40}')

    # def test_update_file(self):
    #     fname = 'file-update-test %s.txt' % randstring()
    #     _, furl = self.create_file(fname=fname)
    #     update_url = self.test_repo_url + u'update-link/'
    #     res = self.get(update_url)
    #     update_api_url = re.match(r'"(.*)"', res.text).group(1)
    #     files = {
    #         'file': ('filename', 'Updated content of this file'),
    #         'target_file': '/test_update.c'
    #     }
    #     res = self.post(update_api_url, files=files)
    #     self.assertRegexpMatches(res.text, r'\w{40,40}')

    def test_get_upload_blocks_link(self):
        with self.get_tmp_repo() as repo:
            upload_blks_url = urljoin(repo.repo_url, 'upload-blks-link')
            res = self.get(upload_blks_url)
            self.assertRegexpMatches(res.text, r'"http(.*)/upload-blks-api/[^/]+"')

    def test_get_update_blocks_link(self):
        with self.get_tmp_repo() as repo:
            update_blks_url = urljoin(repo.repo_url, 'update-blks-link')
            res = self.get(update_blks_url)
            self.assertRegexpMatches(res.text, r'"http(.*)/update-blks-api/[^/]+"')

    def test_list_dir(self):
        with self.get_tmp_repo() as repo:
            self.create_file(repo)
            self.create_dir(repo)
            dirents = self.get(repo.dir_url).json()
            self.assertHasLen(dirents, 2)
            for dirent in dirents:
                self.assertIsNotNone(dirent['id'])
                self.assertIsNotNone(dirent['name'])
                self.assertIn(dirent['type'], ('file', 'dir'))
                if dirent['type'] == 'file':
                    self.assertIsNotNone(dirent['size'])

    def test_remove_dir(self):
        with self.get_tmp_repo() as repo:
            _, durl = self.create_dir(repo)
            res = self.delete(durl)
            self.assertEqual(res.text, u'"success"')
            self.get(durl, expected=404)

    def test_download_dir(self):
        with self.get_tmp_repo() as repo:
            dpath, _ = self.create_dir(repo)
            query = '?p=%s' % quote(dpath)
            ddurl = urljoin(repo.dir_url, 'download') + query
            res = self.get(ddurl)
            self.assertRegexpMatches(res.text,
                r'"http(.*)/files/[^/]+/%s"' % quote(dpath[1:]))

    def test_share_dir(self):
        with self.get_tmp_repo() as repo:
            dpath, _ = self.create_dir(repo)
            query = '?p=%s' % quote(dpath)
            share_dir_url = urljoin(repo.dir_url, 'share/') + query
            with self.get_tmp_user() as user:
                data = {
                    'emails': user.user_name,
                    's_type': 'd',
                    'path': '/',
                    'perm': 'r'
                }
                res = self.post(share_dir_url, data=data)
                self.assertEqual(res.text, u'{}')

    @pytest.mark.xfail
    def test_create_dir_with_parents(self):
        with self.get_tmp_repo() as repo:
            path = u'/level1/level 2/level_3/目录4'
            self.create_dir_with_parents(repo, path)

    def create_dir_with_parents(self, repo, path):
        data = {'operation': 'mkdir', 'create_parents': 'true'}
        durl = repo.get_dirpath_url(path.encode('utf-8'))
        self.post(durl, data=data, expected=201)
        curpath = ''
        # check the parents are created along the way
        parts = path.split('/')
        for i, name in enumerate(parts):
            curpath += '/' + name
            url = repo.get_dirpath_url(curpath.encode('utf-8'))
            if i < len(parts) - 1:
                assert self.get(url).json()[0]['name'] == parts[i+1]
            else:
                assert self.get(url).json() == []
