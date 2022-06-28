#coding: UTF-8
"""
Test file/dir operations.
"""

import posixpath
import pytest
import urllib.request, urllib.parse, urllib.error
from urllib.parse import urlencode, quote
import urllib.parse
from nose.tools import assert_in

from tests.common.utils import randstring, urljoin
from tests.api.apitestbase import ApiTestBase
from tests.api.urls import REPOS_URL

class FilesApiTest(ApiTestBase):
    def test_rename_file(self):
        with self.get_tmp_repo() as repo:
            name, furl = self.create_file(repo)
            data = {
                'operation': 'rename',
                'newname': name + randstring(),
            }
            res = self.post(furl, data=data)
            self.assertRegex(res.text, r'"http(.*)"')

    def test_remove_file(self):
        with self.get_tmp_repo() as repo:
            _, furl = self.create_file(repo)
            res = self.delete(furl)
            self.assertEqual(res.text, '"success"')

    def test_move_file(self):
        with self.get_tmp_repo() as repo:
            # TODO: create another repo here, and use it as dst_repo

            # create sub folder(dpath)
            dpath, _ = self.create_dir(repo)

            # create tmp file in sub folder(dpath)
            tmp_file = 'tmp_file.txt'
            file_path = dpath + '/' + tmp_file
            furl = repo.get_filepath_url(file_path)
            data = {'operation': 'create'}
            res = self.post(furl, data=data, expected=201)

            # copy tmp file from sub folder(dpath) to dst dir('/')
            data = {
                'dst_repo': repo.repo_id,
                'dst_dir': '/',
                'operation': 'copy',
            }
            u = urllib.parse.urlparse(furl)
            parsed_furl = urllib.parse.urlunparse((u.scheme, u.netloc, u.path, '', '', ''))
            res = self.post(parsed_furl+ '?p=' + quote(file_path), data=data)
            assert_in(tmp_file, res.text)

            # get info of copied file in dst dir('/')
            fdurl = repo.file_url + 'detail/?p=/%s' % quote(tmp_file)
            detail = self.get(fdurl).json()
            self.assertIsNotNone(detail)
            self.assertIsNotNone(detail['id'])

            # copy tmp file from sub folder(dpath) to dst dir('/') again
            # for test can rename file if a file with the same name is dst dir
            data = {
                'dst_repo': repo.repo_id,
                'dst_dir': '/',
                'operation': 'copy',
            }
            u = urllib.parse.urlparse(furl)
            parsed_furl = urllib.parse.urlunparse((u.scheme, u.netloc, u.path, '', '', ''))
            res = self.post(parsed_furl+ '?p=' + quote(file_path), data=data)
            assert_in('tmp_file (1).txt', res.text)

            # copy tmp file from sub folder(dpath) to dst dir('/') again
            # for test can rename file if a file with the same name is dst dir
            data = {
                'dst_repo': repo.repo_id,
                'dst_dir': '/',
                'operation': 'copy',
            }
            u = urllib.parse.urlparse(furl)
            parsed_furl = urllib.parse.urlunparse((u.scheme, u.netloc, u.path, '', '', ''))
            res = self.post(parsed_furl+ '?p=' + quote(file_path), data=data)
            assert_in('tmp_file (2).txt', res.text)

            # then move file to dst dir
            data = {
                'dst_repo': repo.repo_id,
                'dst_dir': '/',
                'operation': 'move',
            }
            u = urllib.parse.urlparse(furl)
            parsed_furl = urllib.parse.urlunparse((u.scheme, u.netloc, u.path, '', '', ''))
            res = self.post(parsed_furl+ '?p=' + quote(file_path), data=data)
            assert_in('tmp_file%20%283%29.txt', res.text)


    def test_copy_file(self):
        with self.get_tmp_repo() as repo:
            # TODO: create another repo here, and use it as dst_repo

            # create sub folder(dpath)
            dpath, _ = self.create_dir(repo)

            # create tmp file in sub folder(dpath)
            tmp_file = 'tmp_file.txt'
            file_path = dpath + '/' + tmp_file
            furl = repo.get_filepath_url(file_path)
            data = {'operation': 'create'}
            res = self.post(furl, data=data, expected=201)

            # copy tmp file from sub folder(dpath) to dst dir('/')
            data = {
                'dst_repo': repo.repo_id,
                'dst_dir': '/',
                'operation': 'copy',
            }
            u = urllib.parse.urlparse(furl)
            parsed_furl = urllib.parse.urlunparse((u.scheme, u.netloc, u.path, '', '', ''))
            res = self.post(parsed_furl+ '?p=' + quote(file_path), data=data)
            assert_in(tmp_file, res.text)

            # get info of copied file in dst dir('/')
            fdurl = repo.file_url + 'detail/?p=/%s' % quote(tmp_file)
            detail = self.get(fdurl).json()
            self.assertIsNotNone(detail)
            self.assertIsNotNone(detail['id'])

            # copy tmp file from sub folder(dpath) to dst dir('/') again
            # for test can rename file if a file with the same name is dst dir
            data = {
                'dst_repo': repo.repo_id,
                'dst_dir': '/',
                'operation': 'copy',
            }
            u = urllib.parse.urlparse(furl)
            parsed_furl = urllib.parse.urlunparse((u.scheme, u.netloc, u.path, '', '', ''))
            res = self.post(parsed_furl+ '?p=' + quote(file_path), data=data)
            assert_in('tmp_file (1).txt', res.text)

            # copy tmp file from sub folder(dpath) to dst dir('/') again
            # for test can rename file if a file with the same name is dst dir
            data = {
                'dst_repo': repo.repo_id,
                'dst_dir': '/',
                'operation': 'copy',
            }
            u = urllib.parse.urlparse(furl)
            parsed_furl = urllib.parse.urlunparse((u.scheme, u.netloc, u.path, '', '', ''))
            res = self.post(parsed_furl+ '?p=' + quote(file_path), data=data)
            assert_in('tmp_file (2).txt', res.text)

    def test_download_file(self):
        with self.get_tmp_repo() as repo:
            fname, furl = self.create_file(repo)
            res = self.get(furl)
            self.assertRegex(res.text, '"http(.*)/%s"' % quote(fname))

    def test_download_file_without_reuse_token(self):
        with self.get_tmp_repo() as repo:
            fname, furl = self.create_file(repo)
            res = self.get(furl)
            self.assertRegex(res.text, '"http(.*)/%s"' % quote(fname))

            # download for the first time
            url = urllib.request.urlopen(res.text.strip('"'))
            code = url.getcode()
            self.assertEqual(code, 200)

            # download for the second time
            try:
                url = urllib.request.urlopen(res.text.strip('"'))
            except Exception as e:
                assert 'HTTP Error 403: Forbidden' in str(e)

            # url = urllib.request.urlopen(res.text.strip('"'))
            # code = url.getcode()
            # self.assertEqual(code, 400)


    def test_download_file_with_reuse_token(self):
        with self.get_tmp_repo() as repo:
            fname, furl = self.create_file(repo)
            res = self.get(furl + '&reuse=1')
            self.assertRegex(res.text, '"http(.*)/%s"' % quote(fname))

            # download for the first time
            url = urllib.request.urlopen(res.text.strip('"'))
            code = url.getcode()
            self.assertEqual(code, 200)

            # download for the second time
            url = urllib.request.urlopen(res.text.strip('"'))
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
            self.assertRegex(res.text, r'"http(.*)/%s"' % quote(fname))

    def test_get_file_detail(self):
        with self.get_tmp_repo() as repo:
            fname, _ = self.create_file(repo)
            fdurl = repo.file_url + 'detail/?p=/%s' % quote(fname)
            detail = self.get(fdurl).json()
            self.assertIsNotNone(detail)
            self.assertIsNotNone(detail['id'])
            self.assertIsNotNone(detail['mtime'])
            self.assertIsNotNone(detail['type'])
            self.assertIsNotNone(detail['name'])
            self.assertIsNotNone(detail['size'])
            self.assertIsNotNone(detail['starred'])
            self.assertIsNotNone(detail['last_modifier_email'])
            self.assertIsNotNone(detail['last_modifier_name'])
            self.assertIsNotNone(detail['last_modifier_contact_email'])

    def test_get_file_history(self):
        with self.get_tmp_repo() as repo:
            fname, _ = self.create_file(repo)
            fhurl = repo.file_url + 'history/?p=%s' % quote(fname)
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

                assert commit['user_info']['email'] == commit['creator_name']
                self.assertIsNotNone(commit['user_info']['name'])
                self.assertIsNotNone(commit['user_info']['contact_email'])
                #self.assertIsNotNone(commit['second_parent_id']) #allow null

    def test_get_upload_link(self):
        with self.get_tmp_repo() as repo:
            upload_url = urljoin(repo.repo_url, 'upload-link')
            res = self.get(upload_url)
            self.assertRegex(res.text, r'"http(.*)/upload-api/[^/]+"')

    def test_get_upload_link_with_invalid_repo_id(self):
        repo_url = urljoin(REPOS_URL, '12345678-1234-1234-1234-12345678901b')
        upload_url = urljoin(repo_url, 'upload-link')
        self.get(upload_url, expected=404)

    def test_get_update_link(self):
        with self.get_tmp_repo() as repo:
            update_url = urljoin(repo.repo_url, 'update-link')
            res = self.get(update_url)
            self.assertRegex(res.text, r'"http(.*)/update-api/[^/]+"')

    def test_get_update_link_with_invalid_repo_id(self):
        repo_url = urljoin(REPOS_URL, '12345678-1234-1234-1234-12345678901b')
        update_url = urljoin(repo_url, 'update-link')
        self.get(update_url, expected=404)

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
            self.assertRegex(res.text, r'"http(.*)/upload-blks-api/[^/]+"')

    def test_get_upload_blocks_link_with_invalid_repo_id(self):
        repo_url = urljoin(REPOS_URL, '12345678-1234-1234-1234-12345678901b')
        upload_blks_url = urljoin(repo_url, 'upload-blks-link')
        self.get(upload_blks_url, expected=404)

    def test_get_update_blocks_link(self):
        with self.get_tmp_repo() as repo:
            update_blks_url = urljoin(repo.repo_url, 'update-blks-link')
            res = self.get(update_blks_url)
            self.assertRegex(res.text, r'"http(.*)/update-blks-api/[^/]+"')

    def test_get_update_blocks_link_with_invalid_repo_id(self):
        repo_url = urljoin(REPOS_URL, '12345678-1234-1234-1234-12345678901b')
        update_blks_url = urljoin(repo_url, 'update-blks-link')
        self.get(update_blks_url, expected=404)

    def test_only_list_dir(self):
        with self.get_tmp_repo() as repo:
            self.create_file(repo)
            self.create_dir(repo)
            dirents = self.get(repo.dir_url + '?t=d').json()
            self.assertHasLen(dirents, 1)
            for dirent in dirents:
                self.assertIsNotNone(dirent['id'])
                self.assertIsNotNone(dirent['name'])
                self.assertEqual(dirent['type'], 'dir')

    def test_only_list_file(self):
        with self.get_tmp_repo() as repo:
            self.create_file(repo)
            self.create_dir(repo)
            dirents = self.get(repo.dir_url + '?t=f').json()
            self.assertHasLen(dirents, 1)
            for dirent in dirents:
                self.assertIsNotNone(dirent['id'])
                self.assertIsNotNone(dirent['name'])
                self.assertIsNotNone(dirent['size'])
                self.assertEqual(dirent['type'], 'file')

    def test_list_dir_and_file(self):
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

    def test_list_recursive_dir(self):
        with self.get_tmp_repo() as repo:
            # create test dir
            data = {'operation': 'mkdir'}
            dir_list = ['/1/', '/1/2/', '/1/2/3/', '/4/', '/4/5/', '/6/']
            for dpath in dir_list:
                durl = repo.get_dirpath_url(dpath)
                self.post(durl, data=data, expected=201)

            # get recursive dir
            dirents = self.get(repo.dir_url + '?t=d&recursive=1').json()
            self.assertHasLen(dirents, len(dir_list))
            for dirent in dirents:
                self.assertIsNotNone(dirent['id'])
                self.assertEqual(dirent['type'], 'dir')
                full_path = posixpath.join(dirent['parent_dir'], dirent['name']) + '/'
                self.assertIn(full_path, dir_list)

            # get recursive dir with files info
            # create test file
            tmp_file_name = '%s.txt' % randstring()
            self.create_file(repo, fname=tmp_file_name)

            dirents = self.get(repo.dir_url + '?recursive=1').json()
            self.assertHasLen(dirents, len(dir_list) + 1)
            for dirent in dirents:
                self.assertIsNotNone(dirent['id'])
                if dirent['type'] == 'dir':
                    full_dir_path = posixpath.join(dirent['parent_dir'], dirent['name']) + '/'
                    self.assertIn(full_dir_path, dir_list)
                else:
                    full_file_path = posixpath.join(dirent['parent_dir'], dirent['name'])
                    self.assertEqual('/' + tmp_file_name, full_file_path)

    def test_remove_dir(self):
        with self.get_tmp_repo() as repo:
            _, durl = self.create_dir(repo)
            res = self.delete(durl)
            self.assertEqual(res.text, '"success"')
            self.get(durl, expected=404)

    @pytest.mark.xfail
    def test_create_dir_with_parents(self):
        with self.get_tmp_repo() as repo:
            path = '/level1/level 2/level_3/目录4'
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
