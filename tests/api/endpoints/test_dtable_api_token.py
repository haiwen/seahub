import json

from django.core.urlresolvers import reverse

from seaserv import seafile_api, ccnet_api

from tests.common.utils import randstring
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
        resp = self.client.post(self.dtable_url, {'name': 'table6', 'owner': self.user.username})
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp["table"]["name"] == 'table6'

        # url
        self.api_tokens_url = reverse('api-v2.1-dtable-api-tokens', args=[self.workspace.id, 'table6'])

    def tearDown(self):
        assert len(Workspaces.objects.all()) == 1

        workspace = Workspaces.objects.get_workspace_by_owner(self.user.username)
        workspace_id = workspace.id

        Workspaces.objects.delete_workspace(workspace_id)

        self.remove_repo()

    def test_can_create(self):
        resp = self.client.post(self.api_tokens_url, {'app_name': 'mail_client', 'permission': 'rw'})
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['api_token']
        assert json_resp['app_name'] == 'mail_client'
        assert json_resp['api_token']
        assert json_resp['generated_by'] == self.user.username
        assert json_resp['generated_at']
        assert json_resp['last_access']
        assert json_resp['permission'] == 'rw'

    def test_can_not_create_by_not_owner(self):
        self.logout()

        self.login_as(self.admin)

        resp = self.client.post(self.api_tokens_url, {'app_name': 'mail_client', 'permission': 'rw'})
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

        api_tokens_url = reverse('api-v2.1-dtable-api-tokens', args=[workspace.id, 'table11'])
        resp = self.client.post(api_tokens_url, {'app_name': 'mail_client', 'permission': 'rw'})
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['api_token']
        assert json_resp['app_name'] == 'mail_client'
        assert json_resp['api_token']
        assert json_resp['generated_by'] == self.admin.username
        assert json_resp['generated_at']
        assert json_resp['last_access']
        assert json_resp['permission'] == 'rw'

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

        api_tokens_url = reverse('api-v2.1-dtable-api-tokens', args=[workspace.id, 'table11'])
        resp = self.client.post(api_tokens_url, {'app_name': 'mail_client', 'permission': 'rw'})
        self.assertEqual(403, resp.status_code)

        Workspaces.objects.delete_workspace(workspace.id)
        self.remove_repo(repo.id)

    def test_can_list(self):
        # create
        resp = self.client.post(self.api_tokens_url, {'app_name': 'mail_client', 'permission': 'rw'})
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['api_token']
        assert json_resp['app_name'] == 'mail_client'
        assert json_resp['api_token']
        assert json_resp['generated_by'] == self.user.username
        assert json_resp['generated_at']
        assert json_resp['last_access']
        assert json_resp['permission'] == 'rw'

        # list
        resp = self.client.get(self.api_tokens_url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['api_tokens']
        assert json_resp['api_tokens'][0]
        assert json_resp['api_tokens'][0]['app_name'] == 'mail_client'
        assert json_resp['api_tokens'][0]['api_token']
        assert json_resp['api_tokens'][0]['generated_by'] == self.user.username
        assert json_resp['api_tokens'][0]['generated_at']
        assert json_resp['api_tokens'][0]['last_access']
        assert json_resp['api_tokens'][0]['permission'] == 'rw'


class DTableAPITokenTest(BaseTestCase):

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
        resp = self.client.post(self.dtable_url, {'name': 'table8', 'owner': self.user.username})
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp["table"]["name"] == 'table8'

        self.api_tokens_url = reverse('api-v2.1-dtable-api-tokens', args=[self.workspace.id, 'table8'])

        # create api token
        resp = self.client.post(self.api_tokens_url, {'app_name': 'mail_client', 'permission': 'rw'})
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['api_token']
        assert json_resp['app_name'] == 'mail_client'
        assert json_resp['api_token']
        assert json_resp['generated_by'] == self.user.username
        assert json_resp['generated_at']
        assert json_resp['last_access']
        assert json_resp['permission'] == 'rw'

        self.api_token = json_resp['api_token']
        self.app_name = json_resp['app_name']

        # url
        self.api_token_url = reverse('api-v2.1-dtable-api-token', args=[self.workspace.id, 'table8', self.app_name])

    def tearDown(self):
        assert len(Workspaces.objects.all()) == 1

        workspace = Workspaces.objects.get_workspace_by_owner(self.user.username)
        workspace_id = workspace.id

        Workspaces.objects.delete_workspace(workspace_id)

        self.remove_repo()

    def test_can_delete(self):
        resp = self.client.delete(self.api_token_url)
        self.assertEqual(200, resp.status_code)

    def test_can_not_delete_by_not_owner(self):
        self.logout()
        self.login_as(self.admin)

        resp = self.client.delete(self.api_token_url)
        self.assertEqual(403, resp.status_code)

    def test_can_put(self):
        data = 'permission=r'
        resp = self.client.put(self.api_token_url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

    def test_can_not_put_by_not_owner(self):
        self.logout()
        self.login_as(self.admin)

        data = 'permission=r'
        resp = self.client.put(self.api_token_url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)

    def test_can_not_put_by_exist_permission(self):
        data = 'permission=rw'
        resp = self.client.put(self.api_token_url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(400, resp.status_code)

    def test_can_not_put_by_invalid_permission(self):
        data = 'permission=z'
        resp = self.client.put(self.api_token_url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(400, resp.status_code)


class DTableAppAccessTokenTest(BaseTestCase):

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
        resp = self.client.post(self.dtable_url, {'name': 'table9', 'owner': self.user.username})
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp["table"]["name"] == 'table9'

        self.api_tokens_url = reverse('api-v2.1-dtable-api-tokens', args=[self.workspace.id, 'table9'])

        # create api token
        resp = self.client.post(self.api_tokens_url, {'app_name': 'mail_client', 'permission': 'rw'})
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['api_token']
        assert json_resp['app_name'] == 'mail_client'
        assert json_resp['api_token']
        assert json_resp['generated_by'] == self.user.username
        assert json_resp['generated_at']
        assert json_resp['last_access']
        assert json_resp['permission'] == 'rw'

        self.api_token = json_resp['api_token']

        # url
        self.app_access_token_url = reverse(
            'api-v2.1-dtable-app-access-token')

    def tearDown(self):
        assert len(Workspaces.objects.all()) == 1

        workspace = Workspaces.objects.get_workspace_by_owner(self.user.username)
        workspace_id = workspace.id

        Workspaces.objects.delete_workspace(workspace_id)

        self.remove_repo()

    def test_can_get_app_access_token_by_api_token(self):
        self.logout()
        headers = {'HTTP_AUTHORIZATION': 'Token ' + str(self.api_token)}

        resp = self.client.get(self.app_access_token_url, **headers)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['access_token']
        assert json_resp['dtable_uuid']

    def test_can_not_get_app_access_token_by_invalid_api_token(self):
        self.logout()
        headers = {'HTTP_AUTHORIZATION': 'Token ' + str(self.api_token[:-5] + randstring(5))}

        resp = self.client.get(self.app_access_token_url, **headers)
        self.assertEqual(404, resp.status_code)
