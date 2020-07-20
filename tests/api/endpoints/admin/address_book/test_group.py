import json

from django.urls import reverse
from seaserv import ccnet_api

from seahub.test_utils import BaseTestCase
from tests.common.utils import randstring

try:
    from seahub.settings import LOCAL_PRO_DEV_ENV
except ImportError:
    LOCAL_PRO_DEV_ENV = False

class GroupsTest(BaseTestCase):

    def setUp(self):
        if not LOCAL_PRO_DEV_ENV:
            return

        self.user_name = self.user.username
        self.admin_name = self.admin.username

        group_name = 'top group xxx'
        self.top_group_id = ccnet_api.create_group(group_name, self.admin_name,
                                                   parent_group_id=-1)
        self.login_as(self.admin)
        self.url = reverse('api-v2.1-admin-address-book-group',
                           args=[self.top_group_id])

    def tearDown(self):
        if not LOCAL_PRO_DEV_ENV:
            return

        self.remove_group(self.top_group_id)

    def test_can_list_child_groups(self):
        if not LOCAL_PRO_DEV_ENV:
            return

        child_group_id = ccnet_api.create_group('child group xxx',
                                                self.user.username,
                                                parent_group_id=self.top_group_id)

        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp['groups']) >= 1
        assert len(json_resp['members']) >= 1
        assert len(json_resp['ancestor_groups']) == 0
        assert json_resp['id'] == self.top_group_id
        self.remove_group(child_group_id)

    def test_can_ancestor_groups(self):
        if not LOCAL_PRO_DEV_ENV:
            return

        child_group_id = ccnet_api.create_group('child group xxx',
                                                self.user.username,
                                                parent_group_id=self.top_group_id)

        url = reverse('api-v2.1-admin-address-book-group',
                      args=[child_group_id]) + '?return_ancestors=true'
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert len(json_resp['groups']) == 0
        assert len(json_resp['ancestor_groups']) >= 1
        assert json_resp['ancestor_groups'][-1]['id'] == self.top_group_id
        self.remove_group(child_group_id)

    def test_can_delete_group(self):
        if not LOCAL_PRO_DEV_ENV:
            return

        resp = self.client.delete(self.url)
        self.assertEqual(200, resp.status_code)

    def test_cannot_delete_group_with_child(self):
        if not LOCAL_PRO_DEV_ENV:
            return

        child_group_id = ccnet_api.create_group('child group xxx',
                                                self.user.username,
                                                parent_group_id=self.top_group_id)

        resp = self.client.delete(self.url)
        self.assertEqual(400, resp.status_code)

        self.remove_group(child_group_id)
