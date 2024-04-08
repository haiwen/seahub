#coding: UTF-8

import requests
import unittest
from contextlib import contextmanager
from nose.tools import assert_equal, assert_in # pylint: disable=E0611
from urllib.parse import quote

from tests.common.common import USERNAME, PASSWORD, \
    ADMIN_USERNAME, ADMIN_PASSWORD

from tests.common.utils import apiurl, urljoin, randstring
from tests.api.urls import TOKEN_URL, GROUPS_URL, ACCOUNTS_URL, REPOS_URL
from seahub.base.accounts import User

class ApiTestBase(unittest.TestCase):
    _token = None
    _admin_token = None

    username = USERNAME
    password = PASSWORD
    admin_username = ADMIN_USERNAME
    admin_password = ADMIN_PASSWORD

    @classmethod
    def get(cls, *args, **kwargs):
        return cls._req('GET', *args, **kwargs)

    @classmethod
    def post(cls, *args, **kwargs):
        return cls._req('POST', *args, **kwargs)

    @classmethod
    def put(cls, *args, **kwargs):
        return cls._req('PUT', *args, **kwargs)

    @classmethod
    def delete(cls, *args, **kwargs):
        return cls._req('DELETE', *args, **kwargs)

    @classmethod
    def admin_get(cls, *args, **kwargs):
        kwargs['admin'] = True
        return cls.get(*args, **kwargs)

    @classmethod
    def admin_post(cls, *args, **kwargs):
        kwargs['admin'] = True
        return cls.post(*args, **kwargs)

    @classmethod
    def admin_put(cls, *args, **kwargs):
        kwargs['admin'] = True
        return cls.put(*args, **kwargs)

    @classmethod
    def admin_delete(cls, *args, **kwargs):
        kwargs['admin'] = True
        return cls.delete(*args, **kwargs)

    @classmethod
    def _req(cls, method, *args, **kwargs):
        use_token = kwargs.pop('use_token', True)
        token = kwargs.pop('token', None)
        if use_token and token is None:
            admin = kwargs.pop('admin', False)
            if admin:
                if cls._admin_token is None:
                    cls._admin_token = get_auth_token(ADMIN_USERNAME,
                        ADMIN_PASSWORD)
                token = cls._admin_token
            else:
                if cls._token is None:
                    cls._token = get_auth_token(USERNAME, PASSWORD)
                token = cls._token

        if use_token:
            headers = kwargs.get('headers', {})
            headers.setdefault('Authorization', 'Token ' + token)
            kwargs['headers'] = headers

        expected = kwargs.pop('expected', 200)
        resp = requests.request(method, *args, **kwargs)
        if expected is not None:
            if hasattr(expected, '__iter__'):
                assert_in(resp.status_code, expected,
                    "Expected http status in %s, received %s" % (expected,
                        resp.status_code))
            else:
                assert_equal(resp.status_code, expected,
                    "Expected http status %s, received %s" % (expected,
                        resp.status_code))
        return resp

    def assertHasLen(self, lst, length):
        """
        Assert a list/tuple/string has exact `length`
        """
        msg = 'Expected to have length %s, but length is %s' \
              % (length, len(lst))
        self.assertEqual(len(lst), length, msg)

    def assertNotEmpty(self, lst):
        """
        Assert a list/tuple/string is not empty
        """
        msg = 'Expected not empty, but it is'
        self.assertGreater(len(lst), 0, msg)

    @contextmanager
    def get_tmp_repo(self):
        """
        Context manager to create a tmp repo, and automatically delete it after use

        with self.tmp_repo() as repo:
            self.get(repo.file_url + '?p=/')
        """
        repo = self.create_repo()
        try:
            yield repo
        finally:
            self.remove_repo(repo.repo_id)

    @contextmanager
    def get_tmp_group(self):
        """
        Context manager to create a tmp group, and automatically delete it after use

        with self.tmp_repo() as repo:
            self.get(repo.file_url + '?p=/')
        """
        group = self.create_group()
        try:
            yield group
        finally:
            self.remove_group(group.group_id)

    @contextmanager
    def get_tmp_user(self):
        """
        Context manager to create a tmp user, and automatically delete it after use

        with self.get_tmp_user() as user:
            ...
        """
        user = self.create_user()
        try:
            yield user
        finally:
            self.remove_user(user.user_name)

    def create_repo(self):
        repo_name = '测试-test-repo-%s' % randstring(6)
        data = {
            'name': repo_name,
            'desc': 'just for test - 测试用资料库',
        }
        repo = self.post(REPOS_URL, data=data).json()
        repo_id = repo['repo_id']
        return _Repo(repo_id)

    def remove_repo(self, repo_id):
        repo_url = urljoin(REPOS_URL, repo_id)
        self.delete(repo_url)

    def create_group(self):
        group_name = '测试群组-%s' % randstring(16)
        data = {'group_name': group_name}
        group_id = self.put(GROUPS_URL, data=data).json()['group_id']
        return _Group(group_name, group_id)

    def remove_group(self, group_id):
        group_url = urljoin(GROUPS_URL, str(group_id))
        self.delete(group_url)

    def create_user(self):
        username = '%s@test.com' % randstring(20)
        password = randstring(20)
        user = User(email=username)
        user.is_staff = False
        user.is_active = True
        user.set_password(password)
        user.save()
        return _User(username, password)

    def remove_user(self, username):
        user_url = urljoin(ACCOUNTS_URL, username)
        self.admin_delete(user_url)

    def create_file(self, repo, fname=None):
        if isinstance(repo, str):
            repo = _Repo(repo)
        fname = fname or ('文件 %s.txt' % randstring())
        furl = repo.get_filepath_url('/' + fname)
        data = {'operation': 'create'}
        res = self.post(furl, data=data, expected=201)
        self.assertEqual(res.text, '"success"')
        return fname, furl

    def create_dir(self, repo):
        data = {'operation': 'mkdir'}
        dpath = '/目录 %s' % randstring()
        durl = repo.get_dirpath_url(dpath)
        res = self.post(durl, data=data, expected=201)
        self.assertEqual(res.text, '"success"')
        return dpath, durl


def get_auth_token(username, password):
    data = {
        'username': username,
        'password': password,
        'platform': 'linux',
        'device_id': '701143c1238e6736b61c20e73de82fc95989c413',
        'device_name': 'test',
    }
    res = requests.post(TOKEN_URL, data=data)
    assert_equal(res.status_code, 200)
    token = res.json()['token']
    assert_equal(len(token), 40)
    return token

class _Repo(object):
    def __init__(self, repo_id):
        self.repo_id = repo_id
        self.repo_url = urljoin(REPOS_URL, self.repo_id)
        self.file_url = urljoin(self.repo_url, 'file')
        self.dir_url = urljoin(self.repo_url, 'dir')

    def get_filepath_url(self, path):
        query = '?p=%s' % quote(path)
        return self.file_url + query

    def get_dirpath_url(self, path):
        query = '?p=%s' % quote(path)
        return self.dir_url + query

class _Group(object):
    def __init__(self, group_name, group_id):
        self.group_name = group_name
        self.group_id = group_id
        self.group_url = urljoin(GROUPS_URL, str(self.group_id))

class _User(object):
    def __init__(self, username, password):
        self.user_name = username
        self.password = password
        self.user_url = urljoin(ACCOUNTS_URL, username)
