#coding: UTF-8
"""
Test repos api.
"""

import unittest

from tests.api.apitestbase import ApiTestBase, USERNAME
from tests.api.urls import REPOS_URL, DEFAULT_REPO_URL, VIRTUAL_REPOS_URL
from tests.common.utils import apiurl, urljoin, randstring


class ReposApiTest(ApiTestBase):
    use_test_repo = True

    def remove_repo(cls, repo_id):
        cls.delete(urljoin(REPOS_URL, repo_id))

    def test_get_default_repo(self):
        repo = self.get(DEFAULT_REPO_URL).json()
        self.assertIsNotNone(repo['exists'])

    def test_create_default_repo(self):
        repo = self.post(DEFAULT_REPO_URL).json()
        self.assertEqual(len(repo['repo_id']), 36)
        self.assertEqual(repo['exists'], True)

    def test_list_repos(self):
        repos = self.get(REPOS_URL).json()
        self.assertHasLen(repos, 1)
        for repo in repos:
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

    def test_get_repo_info(self):
        repo = self.get(test_repo_url).json()
        self.assertFalse(repo['encrypted'])
        self.assertIsNotNone(repo['mtime'])
        self.assertIsNotNone(repo['owner'])
        self.assertIsNotNone(repo['id'])
        self.assertIsNotNone(repo['size'])
        self.assertIsNotNone(repo['name'])
        self.assertIsNotNone(repo['root'])
        self.assertIsNotNone(repo['desc'])
        self.assertIsNotNone(repo['type'])
        # self.assertIsNotNone(repo['password_need']) #allow null here

    def test_get_repo_owner(self):
        repo_owner_url = urljoin(self.test_repo_url, '/owner/')
        info = self.get(repo_owner_url).json()
        self.assertEqual(info['owner'], self.test_user_name)

    def test_get_repo_history(self):
        repo_history_url = urljoin(REPOS_URL, self.test_repo_id, '/history/')
        history = self.get(repo_history_url).json()
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

    def test_create_repo(self):
        data = {'name': 'test'}
        res = self.post(REPOS_URL, data=data)
        repo = res.json()
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

        repo_id = repo['repo_id']
        self.remove_repo(repo_id)
        # Check the repo is really removed
        self.get(urljoin(REPOS_URL, repo_id), expected=404)

    # TODO: create a sub folder and use it as a sub repo
    # def test_check_or_create_sub_repo(self):
    #     sub_repo_url = urljoin(REPOS_URL, self.test_repo_id, '/dir/sub_repo/')
    #     params = {'p': '/', 'name': 'sub_lib'}
    #     info = self.get(sub_repo_url, params=params).json()
    #     self.assertHasLen(info['sub_repo_id'], 36)
    #     self.remove_repo(info['sub_repo_id'])

    def test_encrpty_or_decrypy_repo(self):
        # TODO: create a encrypted library
        pass
        # repo_url = urljoin(REPOS_URL, repo_id)
        # data = {'password': 'test'}
        # res = self.post(repo_url, data)
        # self.assertEqual(res.text, '"success"')

    def test_fetch_repo_download_info(self):
        download_info_repo_url = urljoin(REPOS_URL, self.test_repo_id, '/download-info/')
        info = self.get(download_info_repo_url).json()
        self.assertIsNotNone(info['relay_addr'])
        self.assertIsNotNone(info['token'])
        self.assertIsNotNone(info['repo_id'])
        self.assertIsNotNone(info['relay_port'])
        self.assertIsNotNone(info['encrypted'])
        self.assertIsNotNone(info['repo_name'])
        self.assertIsNotNone(info['relay_id'])
        self.assertIsNotNone(info['email'])

    def test_list_virtual_repos(self):
        # TODO: we need to create at least on virtual repo first
        vrepos = self.get(VIRTUAL_REPOS_URL).json()['virtual-repos']
        for repo in vrepos:
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
