# -*- coding: utf-8 -*-
import json
import uuid

from django.core.urlresolvers import reverse

from seaserv import seafile_api

from seahub.dtable.models import Workspaces
from seahub.test_utils import BaseTestCase
from tests.common.utils import randstring


class WorkspacesViewTest(BaseTestCase):

    def setUp(self):
        self.workspace = Workspaces.objects.create_workspace(
            self.user.username,
            self.repo.id
        )
        self.url = reverse('api-v2.1-workspaces')
        self.login_as(self.user)

    def tearDown(self):
        assert len(Workspaces.objects.all()) == 1

        workspace = Workspaces.objects.get_workspace_by_owner(self.user.username)
        workspace_id = workspace.id

        Workspaces.objects.delete_workspace(workspace_id)
        self.remove_repo()

    def test_can_list(self):
        assert len(Workspaces.objects.all()) == 1

        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        self.assertIsNotNone(json_resp["workspace_list"])

    def test_list_with_invalid_repo(self):
        assert len(Workspaces.objects.all()) == 1

        url = reverse('api2-repo', args=[self.workspace.repo_id])
        resp = self.client.delete(url, {}, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp["workspace_list"] == []
        assert len(Workspaces.objects.all()) == 1


class DTableTest(BaseTestCase):

    def setUp(self):
        self.workspace = Workspaces.objects.create_workspace(
            self.user.username,
            self.repo.id
        )
        self.url1 = reverse('api-v2.1-dtables')
        self.url2 = reverse('api-v2.1-workspace-dtable', args=[self.workspace.id])
        self.login_as(self.user)

    def tearDown(self):
        assert len(Workspaces.objects.all()) == 1

        workspace = Workspaces.objects.get_workspace_by_owner(self.user.username)
        workspace_id = workspace.id

        Workspaces.objects.delete_workspace(workspace_id)

        self.remove_repo()

    def test_can_create(self):
        resp = self.client.post(self.url1, {'name': 'table1', 'owner': self.user.username})
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp["table"]["name"] == 'table1'

    def test_create_with_invalid_repo(self):
        url = reverse('api2-repo', args=[self.workspace.repo_id])
        resp = self.client.delete(url, {}, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        resp = self.client.post(self.url1, {'name': 'table2', 'owner': self.user.username})
        self.assertEqual(404, resp.status_code)

    def test_can_rename(self):
        resp = self.client.post(self.url1, {'name': 'table3', 'owner': self.user.username})
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp["table"]["name"] == 'table3'

        resp = self.client.put(
            self.url2,
            'old_name=table3&new_name=table4',
            'application/x-www-form-urlencoded'
        )

        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp["table"]["name"] == 'table4'

    def test_rename_with_invalid_repo(self):
        resp = self.client.post(self.url1, {'name': 'table5', 'owner': self.user.username})
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp["table"]["name"] == 'table5'

        url = reverse('api2-repo', args=[self.workspace.repo_id])
        resp = self.client.delete(url, {}, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        resp = self.client.put(
            self.url2,
            'old_name=table5&new_name=table6',
            'application/x-www-form-urlencoded'
        )

        self.assertEqual(404, resp.status_code)

    def test_can_delete(self):
        resp = self.client.post(self.url1, {'name': 'table7', 'owner': self.user.username})
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp["table"]["name"] == 'table7'

        data = 'name=%s' % 'table7'
        resp = self.client.delete(self.url2, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

    def test_delete_with_invalid_permission(self):
        resp = self.client.post(self.url1, {'name': 'table8', 'owner': self.user.username})
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp["table"]["name"] == 'table8'

        self.logout()
        self.login_as(self.admin)

        data = 'name=%s' % 'table8'
        resp = self.client.delete(self.url2, data, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)

    def test_delete_with_repo_only_read(self):
        resp = self.client.post(self.url1, {'name': 'table9', 'owner': self.user.username})
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp["table"]["name"] == 'table9'

        seafile_api.set_repo_status(self.workspace.repo_id, 1)

        data = 'name=%s' % 'table9'
        resp = self.client.delete(self.url2, data, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)

    def test_can_get_access_token(self):
        resp = self.client.post(self.url1, {'name': 'table10', 'owner': self.user.username})
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp["table"]["name"] == 'table10'

        url = reverse('api-v2.1-dtable-access-token', args=[self.workspace.id, 'table10'])
        resp = self.client.get(url, {}, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        self.assertIsNotNone(json_resp["access_token"])

    def test_get_access_token_with_invalid_repo(self):
        resp = self.client.post(self.url1, {'name': 'table11', 'owner': self.user.username})
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp["table"]["name"] == 'table11'

        url3 = reverse('api2-repo', args=[self.workspace.repo_id])
        resp = self.client.delete(url3, {}, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        url4 = reverse('api-v2.1-dtable-access-token', args=[self.workspace.id, 'table11'])
        resp = self.client.get(url4, {}, 'application/x-www-form-urlencoded')
        self.assertEqual(404, resp.status_code)

    def test_create_dtable_row_share(self):
        resp = self.client.post(self.url1, {'name': 'table12', 'owner': self.user.username})
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp["table"]["name"] == 'table12'

        url4 = reverse('api-v2.1-dtable-row-shares')
        resp = self.client.post(
            url4,
            {
                'workspace_id': self.workspace.id,
                'name': 'table12',
                'table_id': randstring(4),
                'row_id': uuid.uuid4()
            }
        )
        self.assertEqual(201, resp.status_code)
        json_resp = json.loads(resp.content)
        self.assertIsNotNone(json_resp["row_share"])
