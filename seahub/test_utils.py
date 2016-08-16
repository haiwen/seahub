# Copyright (c) 2012-2016 Seafile Ltd.
import os
from uuid import uuid4

from django.core.cache import cache
from django.core.urlresolvers import reverse
from django.conf import settings
from django.http import SimpleCookie
from django.test import RequestFactory
from django.test import TestCase
from django.utils.importlib import import_module
from exam.decorators import fixture
from exam.cases import Exam
import seaserv
from seaserv import seafile_api, ccnet_threaded_rpc, ccnet_api

from seahub.base.accounts import User
from seahub.utils import mkstemp


class Fixtures(Exam):
    user_password = 'secret'
    admin_password = 'secret'
    ip = '127.0.0.1'
    ip_v6 = '2001:0db8:85a3:0000:0000:8a2e:0370:7334'

    @fixture
    def fake_request(self):
        # Every test needs access to the request factory.
        factory = RequestFactory()

        # Create an instance of a GET request.
        fake_request = factory.get('/foo/')
        fake_request.user = self.user
        fake_request.cloud_mode = False

        return fake_request

    @fixture
    def user(self):
        return self.create_user('test@test.com')

    @fixture
    def admin(self):
        return self.create_user('admin@test.com', is_staff=True)

    @fixture
    def repo(self):
        r = seafile_api.get_repo(self.create_repo(name='test-repo', desc='',
                                                  username=self.user.username,
                                                  passwd=None))
        return r

    @fixture
    def file(self):
        return self.create_file(repo_id=self.repo.id,
                                parent_dir='/',
                                filename='test.txt',
                                username='test@test.com')

    @fixture
    def folder(self):
        return self.create_folder(repo_id=self.repo.id,
                                  parent_dir='/',
                                  dirname='folder',
                                  username='test@test.com')

    @fixture
    def group(self):
        return self.create_group(group_name='test_group',
                                 username=self.user.username)

    def create_user(self, email=None, **kwargs):
        if not email:
            email = uuid4().hex + '@test.com'

        kwargs.setdefault('email', email)
        kwargs.setdefault('is_staff', False)
        kwargs.setdefault('is_active', True)

        return User.objects.create_user(password='secret', **kwargs)

    def remove_user(self, email=None):
        if not email:
            email = self.user.username
        try:
            User.objects.get(email).delete()
        except User.DoesNotExist:
            pass
        for g in seaserv.get_personal_groups_by_user(email):
            ccnet_threaded_rpc.remove_group(g.id, email)

    def create_repo(self, **kwargs):
        repo_id = seafile_api.create_repo(**kwargs)
        return repo_id

    def remove_repo(self, repo_id=None):
        if not repo_id:
            repo_id = self.repo.id
        return seafile_api.remove_repo(repo_id)

    def create_file(self, **kwargs):
        seafile_api.post_empty_file(**kwargs)
        return kwargs['parent_dir'] + kwargs['filename']

    def create_file_with_content(self, file_name, parent_dir='/', content='abc',
                                 username=''):
        seafile_api.post_empty_file(self.repo.id, parent_dir, file_name, username)

        # first dump the file content to a tmp file, then update the file
        fd, tmp_file = mkstemp()

        try:
            bytesWritten = os.write(fd, 'junk content')
        except:
            bytesWritten = -1
        finally:
            os.close(fd)

        assert bytesWritten > 0

        seafile_api.put_file(self.repo.id, tmp_file, parent_dir, file_name,
                             '', None)
        return parent_dir + file_name

    def create_folder(self, **kwargs):
        seafile_api.post_dir(**kwargs)
        return kwargs['parent_dir'] + kwargs['dirname']

    def remove_folder(self):
        seafile_api.del_file(self.repo.id, os.path.dirname(self.folder),
                             os.path.basename(self.folder), self.user.username)

    def create_group(self, **kwargs):
        group_name = kwargs['group_name']
        username = kwargs['username']
        group_id = ccnet_threaded_rpc.create_group(group_name, username)
        return ccnet_threaded_rpc.get_group(group_id)

    def remove_group(self, group_id=None):
        if not group_id:
            group_id = self.group.id
        return ccnet_threaded_rpc.remove_group(group_id, self.user.username)

    def share_repo_to_admin_with_r_permission(self):
        # share user's repo to admin with 'r' permission
        seafile_api.share_repo(self.repo.id, self.user.username,
                self.admin.username, 'r')

    def share_repo_to_admin_with_rw_permission(self):
        # share user's repo to admin with 'rw' permission
        seafile_api.share_repo(self.repo.id, self.user.username,
                self.admin.username, 'rw')

    def set_user_folder_r_permission_to_admin(self):

        # share user's repo to admin with 'rw' permission
        seafile_api.share_repo(self.repo.id, self.user.username,
                self.admin.username, 'rw')

        # set user sub-folder 'r' permisson to admin
        seafile_api.add_folder_user_perm(self.repo.id,
                self.folder, 'r', self.admin.username)

        # admin can visit user sub-folder with 'r' permission
        assert seafile_api.check_permission_by_path(self.repo.id,
                self.folder, self.admin.username) == 'r'

    def set_user_folder_rw_permission_to_admin(self):

        # share user's repo to admin with 'r' permission
        seafile_api.share_repo(self.repo.id, self.user.username,
                self.admin.username, 'r')

        # set user sub-folder 'rw' permisson to admin
        seafile_api.add_folder_user_perm(self.repo.id,
                self.folder, 'rw', self.admin.username)

        # admin can visit user sub-folder with 'rw' permission
        assert seafile_api.check_permission_by_path(self.repo.id,
                self.folder, self.admin.username) == 'rw'

    def share_repo_to_group_with_r_permission(self):
        seafile_api.set_group_repo(
                self.repo.id, self.group.id, self.user.username, 'r')

    def share_repo_to_group_with_rw_permission(self):
        seafile_api.set_group_repo(
                self.repo.id, self.group.id, self.user.username, 'rw')

    def add_admin_to_group(self):
        ccnet_api.group_add_member(
                self.group.id, self.user.username, self.admin.username)

        assert ccnet_api.is_group_user(self.group.id, self.admin.username)


class BaseTestCase(TestCase, Fixtures):
    def tearDown(self):
        self.remove_repo(self.repo.id)

    def login_as(self, user):
        if isinstance(user, basestring):
            login = user
        elif isinstance(user, User):
            login = user.username
        else:
            assert False

        return self.client.post(
            reverse('auth_login'), {'login': login,
                                    'password': self.user_password}
        )

    def logout(self):
        """
        Removes the authenticated user's cookies and session object.

        Causes the authenticated user to be logged out.
        """
        session = import_module(settings.SESSION_ENGINE).SessionStore()
        session_cookie = self.client.cookies.get(settings.SESSION_COOKIE_NAME)

        if session_cookie:
            session.delete(session_key=session_cookie.value)
        self.client.cookies = SimpleCookie()

    def clear_cache(self):
        # clear cache between every test case to avoid config option cache
        # issue which cause test failed
        cache.clear()
