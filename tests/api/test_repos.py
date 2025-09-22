#coding: UTF-8
"""
Test repos api.
"""
import json
import time
import pytest
import uuid
import pytest
pytestmark = pytest.mark.django_db

from django.urls import reverse
from seaserv import seafile_api

from tests.api.apitestbase import ApiTestBase
from tests.api.urls import (
    REPOS_URL, GET_REPO_TOKENS_URL
)
from tests.common.utils import apiurl, urljoin, randstring
from tests.common.common import SEAFILE_BASE_URL

from seahub.test_utils import BaseTestCase

# TODO: all tests should be run on an encrypted repo
class ReposApiTest(ApiTestBase):
    def test_list_repos(self):
        repos = self.get(REPOS_URL).json()
        # self.assertHasLen(repos, 1)

        for repo in repos:
            self.assertIsNotNone(repo['permission'])
            self.assertIsNotNone(repo['encrypted'])
            self.assertGreater(repo['mtime'], 0)
            self.assertIsNotNone(repo['mtime_relative'])
            self.assertIsNotNone(repo['owner'])
            self.assertIsNotNone(repo['id'])
            self.assertIsNotNone(repo['size'])
            self.assertIsNotNone(repo['name'])
            self.assertIsNotNone(repo['type'])
            self.assertIsNotNone(repo['head_commit_id'])
            assert len(repo['modifier_email']) > 0
            assert len(repo['modifier_name']) > 0
            assert len(repo['modifier_contact_email']) > 0

    def test_get_repo_info(self):
        with self.get_tmp_repo() as repo:
            rinfo = self.get(repo.repo_url).json()
            self.assertFalse(rinfo['encrypted'])
            self.assertIsNotNone(rinfo['mtime'])
            self.assertIsNotNone(rinfo['owner'])
            self.assertIsNotNone(rinfo['id'])
            self.assertIsNotNone(rinfo['size'])
            self.assertIsNotNone(rinfo['name'])
            self.assertIsNotNone(rinfo['root'])
            self.assertIsNotNone(rinfo['type'])
            assert len(rinfo['modifier_email']) > 0
            assert len(rinfo['modifier_name']) > 0
            assert len(rinfo['modifier_contact_email']) > 0

    def test_get_repo_history(self):
        with self.get_tmp_repo() as repo:
            self.create_file(repo)
            self.create_dir(repo)
            repo_history_url = urljoin(repo.repo_url, '/history/')
            history = self.get(repo_history_url).json()
            commits = history['commits']
            self.assertHasLen(commits, 3)
            for commit in commits:
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
                self.assertIsNotNone(commit['id'])
                self.assertIsNotNone(commit['conflict'])
                #self.assertIsNotNone(commit['second_parent_id']) #allow null

    def test_create_repo(self):
        data = {'name': 'test'}
        res = self.post(REPOS_URL, data=data)
        repo = res.json()
        repo_id = repo['repo_id']
        try:
            self.assertIsNotNone(repo['encrypted'])
            self.assertIsNotNone(repo['enc_version'])
            self.assertIsNotNone(repo['repo_id'])
            self.assertIsNotNone(repo['magic'])
            self.assertIsNotNone(repo['relay_id'])
            self.assertIsNotNone(repo['repo_version'])
            self.assertIsNotNone(repo['relay_addr'])
            self.assertIsNotNone(repo['token'])
            self.assertIsNotNone(repo['relay_port'])
            self.assertIsNotNone(repo['random_key'])
            self.assertIsNotNone(repo['email'])
            self.assertIsNotNone(repo['repo_name'])
        finally:
            self.remove_repo(repo_id)
            # Check the repo is really removed
            self.get(urljoin(REPOS_URL, repo_id), expected=404)

    def test_create_repo_with_invalid_name(self):
        data = {'name': 'test/test'}
        self.post(REPOS_URL, data=data, expected=400)

    def test_check_or_create_sub_repo(self):
        # TODO: create a sub folder and use it as a sub repo
        pass

    @pytest.mark.xfail
    def test_generate_repo_tokens(self):
        with self.get_tmp_repo() as ra:
            with self.get_tmp_repo() as rb:
                fake_repo_id = str(uuid.uuid4())
                repo_ids = ','.join([ra.repo_id, rb.repo_id, fake_repo_id])
                tokens = self.get(GET_REPO_TOKENS_URL + '?repos=%s' % repo_ids).json()
                assert ra.repo_id in tokens
                assert rb.repo_id in tokens
                assert fake_repo_id not in tokens
                for repo_id, token in tokens.items():
                    self._get_repo_info(token, repo_id)

    def test_generate_repo_tokens_reject_invalid_params(self):
        self.get(GET_REPO_TOKENS_URL, expected=400)
        self.get(GET_REPO_TOKENS_URL + '?repos=badxxx', expected=400)

    def _get_repo_info(self, sync_token, repo_id, **kwargs):
        headers = {
            'Seafile-Repo-Token': sync_token
        }
        url = urljoin(SEAFILE_BASE_URL,
                      'repo/%s/permission-check/?op=upload' % repo_id)
        self.get(url, use_token=False, headers=headers, **kwargs)


class NewReposApiTest(BaseTestCase):
    # @pytest.mark.xfail
    def setUp(self):
        self.clear_cache()
        self.login_as(self.admin)

        from constance import config
        self.config = config

        self.config.ENABLE_ENCRYPTED_LIBRARY = True

    def test_create_encrypted_repo(self):
        """Test create an encrypted repo with the secure keys generated on client
        side.
        """
        repo_id = str(uuid.uuid4())
        password = randstring(16)
        enc_version = 2
        enc_info = seafile_api.generate_magic_and_random_key(enc_version, repo_id, password)
        data = {
            'name': 'enc-test',
            'repo_id': repo_id,
            'enc_version': enc_version,
            'magic': enc_info.magic,
            'random_key': enc_info.random_key,
        }
        repo = self.client.post(REPOS_URL, data=data)
        repo = json.loads(repo.content)
        assert repo['repo_id'] == repo_id
        assert repo['encrypted']
        assert repo['magic'] == enc_info.magic
        assert repo['random_key'] == enc_info.random_key

        # validate the password on server
        set_password_url = apiurl('/api2/repos/{}/'.format(repo['repo_id']))
        self.client.post(set_password_url, data={'password': password})

        # do some file operation
        self.create_file(repo_id=repo['repo_id'], parent_dir='/', filename='repo-test', username=self.admin.username)

    def test_create_encrypted_repo_with_disable_create_enc_library(self):
        """Test create an encrypted repo with the secure keys generated on client
        side.
        """
        self.config.ENABLE_ENCRYPTED_LIBRARY = False
        repo_id = str(uuid.uuid4())
        password = randstring(16)
        enc_version = 2
        enc_info = seafile_api.generate_magic_and_random_key(enc_version, repo_id, password)
        data = {
            'name': 'enc-test-with-disable-encry',
            'repo_id': repo_id,
            'enc_version': enc_version,
            'magic': enc_info.magic,
            'random_key': enc_info.random_key,
        }
        res = self.client.post(REPOS_URL, data=data)
        assert res.status_code == 403

    def test_create_encrypted_repo_with_invalid_repoid(self):
        """Test create an encrypted repo with the secure keys generated on client
        side.
        """
        repo_id = 'qwer'
        password = randstring(16)
        enc_version = 2
        enc_info = seafile_api.generate_magic_and_random_key(enc_version, repo_id, password)
        data = {
            'name': 'enc-test-with-disable-encry',
            'repo_id': repo_id,
            'enc_version': enc_version,
            'magic': enc_info.magic,
            'random_key': enc_info.random_key,
        }
        res = self.client.post(REPOS_URL, data=data)
        print(res)
        assert res.status_code == 400

#        repo = res.json()
#        assert repo['repo_id'] == repo_id
#        assert repo['encrypted']
#        assert repo['magic'] == enc_info.magic
#        assert repo['random_key'] == enc_info.random_key
#
#        # validate the password on server
#        set_password_url = apiurl('/api2/repos/{}/'.format(repo['repo_id']))
#        self.post(set_password_url, data={'password': password})
#
        # do some file operation


# Uncomment following to test api performance.
# class ReposApiTest2(BaseTestCase):
#     def setUp(self):
#         self.num_repos = 500
#         self.tmp_user = self.create_user()
#         self.login_as(self.tmp_user)

#         self.repo_ids = []
#         for i in range(self.num_repos):
#             r = self.create_repo(name='test-repo%d' % i, desc='',
#                                  username=self.tmp_user.username, passwd=None)
#             self.repo_ids.append(r)
#             time.sleep(0.01)

#         assert len(self.repo_ids) == self.num_repos

#     def tearDown(self):
#         self.remove_user(self.tmp_user.username)
#         for e in self.repo_ids:
#             self.remove_repo(e)

#     def test_list_repos(self):
#         time.sleep(1)
#         print '--------> start list repos...'

#         resp = self.client.get(reverse('api2-repos') + '?type=mine')
#         json_resp = json.loads(resp.content)
#         assert len(json_resp) == self.num_repos

#         print '--------> end list repos.'
