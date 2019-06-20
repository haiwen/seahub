# -*- coding: utf-8 -*-
import json

from django.core.urlresolvers import reverse

from seahub.dtable.models import Workspaces, UserShareWorkspace
from seahub.test_utils import BaseTestCase
from tests.common.utils import randstring
from seahub.constants import PERMISSION_READ_WRITE, PERMISSION_READ


class UserShareWorkspacesViewTest(BaseTestCase):

    def setUp(self):
        self.tmp_user = self.create_user()

        self.workspace = Workspaces.objects.create_workspace(
            "workspace1",
            self.tmp_user,
            self.repo.id
        )
        self.url = reverse('api-v2.1-workspaces-user-share')

        UserShareWorkspace.objects.add(
            self.workspace.id, self.tmp_user, self.user, PERMISSION_READ_WRITE)

    def tearDown(self):
        self.remove_user(self.tmp_user.email)

    def test_can_list(self):
        self.login_as(self.user)

        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        self.assertIsNotNone(json_resp["workspace_list"])


class UserShareWorkspaceViewTest(BaseTestCase):

    def setUp(self):
        self.tmp_user = self.create_user()

        self.workspace = Workspaces.objects.create_workspace(
            "workspace1",
            self.user,
            self.repo.id
        )
        self.url = reverse('api-v2.1-workspace-user-share', args=[self.workspace.id])

        UserShareWorkspace.objects.add(
            self.workspace.id, self.user, self.tmp_user, PERMISSION_READ_WRITE)

    def tearDown(self):
        self.remove_user(self.tmp_user.email)

    def test_can_list_user(self):
        self.login_as(self.user)

        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        self.assertIsNotNone(json_resp["user_list"])

    def test_can_not_list_by_not_owner(self):
        self.login_as(self.admin)

        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)

    def test_can_post(self):
        assert UserShareWorkspace.objects.count() == 1
        self.login_as(self.user)

        data = {
            'email': self.admin.username,
            'permission': PERMISSION_READ_WRITE,
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(201, resp.status_code)

        assert UserShareWorkspace.objects.count() == 2

    def test_can_not_post_by_not_owner(self):
        self.login_as(self.admin)

        data = {
            'email': self.admin.username,
            'permission': PERMISSION_READ_WRITE,
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(403, resp.status_code)

    def test_can_not_post_by_unknown_user(self):
        self.login_as(self.user)

        data = {
            'email': randstring(5) + '@seafile.com',
            'permission': PERMISSION_READ_WRITE,
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(404, resp.status_code)

    def test_can_not_post_by_share_to_owner(self):
        self.login_as(self.user)

        data = {
            'email': self.user.username,
            'permission': PERMISSION_READ_WRITE,
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(400, resp.status_code)

    def test_can_not_post_by_already_share(self):
        self.login_as(self.user)

        data = {
            'email': self.tmp_user.username,
            'permission': PERMISSION_READ_WRITE,
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(409, resp.status_code)

    def test_can_not_post_by_share_to_org_user(self):
        self.login_as(self.user)

        data = {
            'email': self.org_user.username,
            'permission': PERMISSION_READ_WRITE,
        }
        resp = self.client.post(self.url, data)
        self.assertEqual(400, resp.status_code)

    def test_can_put(self):
        self.login_as(self.user)

        data = {
            'email': self.tmp_user.username,
            'permission': PERMISSION_READ,
        }
        resp = self.client.put(self.url, json.dumps(data), 'application/json')
        self.assertEqual(200, resp.status_code)
