import json

from django.core.urlresolvers import reverse

from seaserv import seafile_api, ccnet_api

from seahub.dtable.models import Workspaces
from seahub.test_utils import BaseTestCase
from seahub.group.utils import is_group_admin_or_owner


class DTableAPITokensTest(BaseTestCase):

    def setUp(self):
        # create workspace
        self.workspace = Workspaces.objects.create_workspace(
            self.user.username,
            self.repo.id
        )
        self.group_id = self.group.id

        self.login_as(self.user)

        # create dtable
        self.dtable_url = reverse('api-v2.1-dtables')
        resp = self.client.post(self.dtable_url, {'name': 'table10', 'owner': self.user.username})
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp["table"]["name"] == 'table10'

        # url
        self.api_token_url = reverse('api-v2.1-dtable-api-token', args=[self.workspace.id, 'table10'])
        self.api_token_to_access_token_url = reverse('api-v2.1-dtable-api-token-to-access-token',
                                                     args=[self.workspace.id, 'table10'])

    def tearDown(self):
        assert len(Workspaces.objects.all()) == 1

        workspace = Workspaces.objects.get_workspace_by_owner(self.user.username)
        workspace_id = workspace.id

        Workspaces.objects.delete_workspace(workspace_id)

        self.remove_repo()

    def test_can_create(self):
        resp = self.client.post(self.api_token_url, {'app_name': 'mail_client', 'permission': 'rw'})
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['api_token']

    def test_can_not_create_by_not_owner(self):
        self.logout()

        self.login_as(self.admin)

        resp = self.client.post(self.api_token_url, {'app_name': 'mail_client', 'permission': 'rw'})
        self.assertEqual(403, resp.status_code)

    def test_can_create_by_group_admin(self):
        repo = seafile_api.get_repo(self.create_repo(
            name='group-repo', desc='', username=self.user.username, passwd=None))
        workspace = Workspaces.objects.create_workspace(
            str(self.group_id) + '@seafile_group', repo.id)

        # create dtable
        self.dtable_url = reverse('api-v2.1-dtables')
        resp = self.client.post(self.dtable_url, {'name': 'table11', 'owner': str(self.group_id) + '@seafile_group'})
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp["table"]["name"] == 'table11'

        # main
        self.logout()
        self.add_admin_to_group()
        ccnet_api.group_set_admin(self.group_id, self.admin.username)
        assert is_group_admin_or_owner(self.group_id, self.admin.username)

        self.login_as(self.admin)

        self.api_token_url = reverse('api-v2.1-dtable-api-token', args=[workspace.id, 'table11'])
        resp = self.client.post(self.api_token_url, {'app_name': 'mail_client', 'permission': 'rw'})
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['api_token']

        Workspaces.objects.delete_workspace(workspace.id)
        self.remove_repo(repo.id)

    def test_can_not_create_by_group_member(self):
        repo = seafile_api.get_repo(self.create_repo(
            name='group-repo', desc='', username=self.user.username, passwd=None))
        workspace = Workspaces.objects.create_workspace(
            str(self.group_id) + '@seafile_group', repo.id)

        # create dtable
        self.dtable_url = reverse('api-v2.1-dtables')
        resp = self.client.post(self.dtable_url, {'name': 'table11', 'owner': str(self.group_id) + '@seafile_group'})
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp["table"]["name"] == 'table11'

        # main
        self.logout()
        self.add_admin_to_group()

        self.login_as(self.admin)

        resp = self.client.post(self.api_token_url, {'app_name': 'mail_client', 'permission': 'rw'})
        self.assertEqual(403, resp.status_code)

        Workspaces.objects.delete_workspace(workspace.id)
        self.remove_repo(repo.id)

    def test_can_list(self):
        # create
        resp = self.client.post(self.api_token_url, {'app_name': 'mail_client', 'permission': 'rw'})
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['api_token']

        # list
        resp = self.client.get(self.api_token_url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['api_tokens']
        assert json_resp['api_tokens'][0]
        assert json_resp['api_tokens'][0]['app_name'] == 'mail_client'
        assert json_resp['api_tokens'][0]['api_token']
        assert json_resp['api_tokens'][0]['generated_by'] == self.user.username
        assert json_resp['api_tokens'][0]['generated_at']
        assert json_resp['api_tokens'][0]['last_access']

    def test_can_delete(self):
        # create
        resp = self.client.post(self.api_token_url, {'app_name': 'mail_client', 'permission': 'rw'})
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['api_token']

        # delete
        data = 'app_name=mail_client'
        resp = self.client.delete(self.api_token_url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

    def test_can_get_access_token_by_api_token(self):
        # create
        resp = self.client.post(self.api_token_url, {'app_name': 'mail_client', 'permission': 'rw'})
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['api_token']

        api_token = json_resp['api_token']

        # get
        self.logout()
        resp = self.client.get(self.api_token_to_access_token_url, {'api_token': api_token})
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['access_token']
