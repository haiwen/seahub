#coding: UTF-8

import re
import requests
import unittest
from nose.tools import assert_equal, assert_in # pylint: disable=E0611

from tests.common.common import USERNAME, PASSWORD, IS_PRO, \
    ADMIN_USERNAME, ADMIN_PASSWORD

from tests.common.utils import apiurl, urljoin, randstring
from tests.api.urls import TOKEN_URL, GROUPS_URL, ACCOUNTS_URL, REPOS_URL

class ApiTestBase(unittest.TestCase):
    _token = None
    _admin_token = None

    use_test_user = False
    use_test_group = False
    use_test_repo = False

    test_user_name = None
    test_user_url = None

    test_group_name = None
    test_group_id = None
    test_group_url = None

    test_repo_id = None
    test_repo_url = None
    test_file_url = None
    test_dir_url = None

    def setUp(self):
        if self.use_test_user:
            self.create_tmp_user()
        if self.use_test_group:
            self.create_tmp_group()
        if self.use_test_repo:
            self.create_tmp_repo()

    def tearDown(self):
        if self.use_test_user:
            self.remove_tmp_user()
        if self.use_test_group:
            self.remove_tmp_group()
        if self.use_test_repo:
            self.remove_tmp_repo()

    def create_tmp_repo(self):
        repo_name = '测试-test-repo-%s' % randstring(6)
        data = {
            'name': repo_name,
            'desc': 'just for test - 测试用资料库',
        }
        repo = self.post(REPOS_URL, data=data).json()
        self.test_repo_id = repo['repo_id']
        self.test_repo_url = urljoin(REPOS_URL, self.test_repo_id)
        self.test_file_url = urljoin(self.test_repo_url, 'file')
        self.test_dir_url = urljoin(self.test_repo_url, 'dir')

    def remove_tmp_repo(self):
        if self.test_repo_id:
            self.delete(self.test_repo_url)

    def create_tmp_group(self):
        self.test_group_name = '测试群组-%s' % randstring(16)
        data = {'group_name': self.test_group_name}
        self.test_group_id = self.put(GROUPS_URL, data=data).json()['group_id']
        self.test_group_url = urljoin(GROUPS_URL, str(self.test_group_id))

    def remove_tmp_group(self):
        if self.test_group_id:
            self.delete(self.test_group_url)

    def create_tmp_user(self):
        data = {'password': 'testtest'}
        username = '%s@test.com' % randstring(20)
        self.put(urljoin(ACCOUNTS_URL, username), data=data, expected=201)
        self.test_user_name = username
        self.test_user_url = urljoin(ACCOUNTS_URL, username)

    def remove_tmp_user(self):
        if self.test_user_name:
            self.delete(self.test_user_url)

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

def get_auth_token(username, password):
    res = requests.post(TOKEN_URL,
        data=dict(username=username, password=password))
    assert_equal(res.status_code, 200)
    token = res.json()['token']
    assert_equal(len(token), 40)
    return token
