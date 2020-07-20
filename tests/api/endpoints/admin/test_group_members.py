import json

from seaserv import ccnet_api
from django.urls import reverse
from seahub.test_utils import BaseTestCase

class GroupMembersTest(BaseTestCase):

    def setUp(self):
        self.user_name = self.user.username
        self.admin_name = self.admin.username
        self.group_id = self.group.id
        self.repo_id = self.repo.id

    def tearDown(self):
        self.remove_group()

    def test_get_admin_permission_denied(self):
        self.login_as(self.admin_cannot_manage_group)
        resp = self.client.get(reverse('api-v2.1-admin-group-members', args=[self.group_id]))
        self.assertEqual(403, resp.status_code)

    def test_can_get(self):
        self.login_as(self.admin)
        url = reverse('api-v2.1-admin-group-members',
                args=[self.group_id])
        resp = self.client.get(url)

        json_resp = json.loads(resp.content)
        assert json_resp['members'][0]['email'] == self.user_name
        assert json_resp['group_id'] == self.group_id

    def test_can_not_get_if_not_admin(self):
        self.login_as(self.user)
        url = reverse('api-v2.1-admin-group-members',
                args=[self.group_id])
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)

    def test_can_add(self):
        self.login_as(self.admin)
        url = reverse('api-v2.1-admin-group-members',
                args=[self.group_id])

        data = {'email': self.admin_name}
        resp = self.client.post(url, data)

        json_resp = json.loads(resp.content)
        assert json_resp['success'][0]['group_id'] == self.group_id
        assert json_resp['success'][0]['email'] == self.admin_name

    def test_can_not_add_if_not_admin(self):
        self.login_as(self.user)
        url = reverse('api-v2.1-admin-group-members',
                args=[self.group_id])

        data = {'email': self.admin_name}
        resp = self.client.post(url, data)
        self.assertEqual(403, resp.status_code)

    def test_can_delete_group_member(self):

        ccnet_api.group_add_member(self.group_id, self.user_name,
                self.admin_name)

        # make sure member in group
        members = ccnet_api.get_group_members(self.group_id)
        assert len(members) == 2

        self.login_as(self.admin)
        url = reverse('api-v2.1-admin-group-member',
                args=[self.group_id, self.admin_name])
        resp = self.client.delete(url)
        self.assertEqual(200, resp.status_code)

        # make sure member is deleted
        members = ccnet_api.get_group_members(self.group_id)
        assert len(members) == 1

    def test_can_not_delete_if_not_admin(self):

        ccnet_api.group_add_member(self.group_id, self.user_name,
                self.admin_name)

        # make sure member in group
        members = ccnet_api.get_group_members(self.group_id)
        assert len(members) == 2

        self.login_as(self.user)
        url = reverse('api-v2.1-admin-group-member',
                args=[self.group_id, self.admin_name])
        resp = self.client.delete(url)
        self.assertEqual(403, resp.status_code)

        # make sure member is not deleted
        members = ccnet_api.get_group_members(self.group_id)
        assert len(members) == 2

    def test_can_not_delete_group_owner(self):

        # make sure member in group
        members = ccnet_api.get_group_members(self.group_id)
        assert len(members) == 1

        self.login_as(self.user)
        url = reverse('api-v2.1-admin-group-member',
                args=[self.group_id, self.user_name])
        resp = self.client.delete(url)
        self.assertEqual(403, resp.status_code)
