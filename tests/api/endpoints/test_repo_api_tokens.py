import json

from django.urls import reverse

from seahub.repo_api_tokens.models import RepoAPITokens
from seahub.test_utils import BaseTestCase


class RepoAPITokensTest(BaseTestCase):

    def setUp(self):
        self.login_as(self.user)
        # create repo
        repo_id = self.create_repo(name='test-repo',
                                   desc='',
                                   username=self.user.username,
                                   passwd=None)

        self.repo_id = repo_id
        self.app_name = 'wow'
        self.permission = 'rw'
        self.url = reverse('api-v2.1-repo-api-tokens', args=[repo_id])

    def tearDown(self):
        RepoAPITokens.objects.filter(repo_id=self.repo_id).delete()
        self.remove_repo(self.repo_id)

    def test_generate_token_by_owner(self):
        resp = self.client.post(self.url, {'app_name': self.app_name, 'permission': self.permission})
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        self.assertEqual(self.repo_id, json_resp['repo_id'])
        self.assertEqual(self.app_name, json_resp['app_name'])
        self.assertEqual(self.user.username, json_resp['generated_by'])
        self.assertEqual(self.permission, json_resp['permission'])

    def test_generate_token_by_other(self):
        self.logout()
        self.login_as(self.admin)
        resp = self.client.post(self.url, {'app_name': self.app_name, 'permission': self.permission})
        self.assertEqual(403, resp.status_code)

    def _create_repo_api_token_obj(self, app_name, permission):
        username = self.user.username
        return RepoAPITokens.objects.create_token(app_name, self.repo_id, username, permission=permission)

    def test_get_tokens_by_owner(self):
        # create
        apps = ['first', 'second']
        permissions = ['r', 'rw']
        for app, permission in zip(apps, permissions):
            self._create_repo_api_token_obj(app, permission)
        # GET request
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        for repo_api_token_json, app, permission in zip(json_resp['repo_api_tokens'][::-1], apps, permissions):
            self.assertEqual(self.repo_id, repo_api_token_json['repo_id'])
            self.assertEqual(app, repo_api_token_json['app_name'])
            self.assertEqual(self.user.username, repo_api_token_json['generated_by'])
            self.assertEqual(permission, repo_api_token_json['permission'])


class RepoAPITokenTest(BaseTestCase):

    def setUp(self):
        self.login_as(self.user)
        # create repo
        repo_id = self.create_repo(name='test-repo',
                                   desc='',
                                   username=self.user.username,
                                   passwd=None)

        self.repo_id = repo_id

        # set user
        self.user_app_name = 'user-app'
        self.user_url = reverse('api-v2.1-repo-api-token', args=[self.repo_id, self.user_app_name])
        # set admin
        self.admin_app_name = 'admin-app'
        self.admin_url = reverse('api-v2.1-repo-api-token', args=[self.repo_id, self.admin_app_name])
        self.share_repo_to_admin_with_admin_permission()
        self.share_repo_to_group_with_admin_permission()

    def tearDown(self):
        RepoAPITokens.objects.filter(repo_id=self.repo_id).delete()
        self.remove_repo(self.repo_id)

    def _create_repo_api_token_obj(self, admin=False):
        app_name = self.user_app_name if not admin else self.admin_app_name
        username = self.user.username if not admin else self.admin.username
        return RepoAPITokens.objects.create_token(app_name, self.repo_id, username, permission='r')

    def test_put_token_by_owner(self):
        rat = self._create_repo_api_token_obj()
        data = 'permission=rw'
        resp = self.client.put(self.user_url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        self.assertEqual(self.repo_id, json_resp['repo_id'])
        self.assertEqual(self.user_app_name, json_resp['app_name'])
        self.assertEqual(self.user.username, json_resp['generated_by'])
        self.assertEqual('rw', json_resp['permission'])
        self.assertEqual(rat.token, json_resp['api_token'])

    def test_put_token_by_other(self):
        rat = self._create_repo_api_token_obj()
        data = 'permission=rw'
        self.logout()
        self.login_as(self.admin)
        resp = self.client.put(self.user_url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)

    def test_delete_token_by_self(self):
        rat = self._create_repo_api_token_obj()
        resp = self.client.delete(self.user_url)
        self.assertEqual(200, resp.status_code)

    def test_delete_token_by_other(self):
        rat = self._create_repo_api_token_obj()
        self.logout()
        self.login_as(self.admin)
        resp = self.client.delete(self.user_url)
        self.assertEqual(403, resp.status_code)
