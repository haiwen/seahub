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
        self.user_name = self.user.username
        self.admin_name = self.admin.username

        self.login_as(self.admin)
        self.url = reverse('api-v2.1-admin-address-book-groups')

    def test_can_list_top_groups(self):
        if not LOCAL_PRO_DEV_ENV:
            return
        
        top_group_id = ccnet_api.create_group('top group xxx', self.user.username,
                                              parent_group_id=-1)

        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp['data']) >= 1

        self.remove_group(top_group_id)

    def test_can_create_top_group(self):
        if not LOCAL_PRO_DEV_ENV:
            return

        resp = self.client.post(self.url, {
            'group_name': randstring(10),
            'parent_group': -1,
            'group_owner': self.user.username
        })
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp['name']) == 10
        assert json_resp['parent_group_id'] == -1

        self.remove_group(json_resp['id'])

    def test_can_create_child_group(self):
        if not LOCAL_PRO_DEV_ENV:
            return

        top_group_id = ccnet_api.create_group('top group xxx', self.user.username,
                                              parent_group_id=-1)

        resp = self.client.post(self.url, {
            'group_name': randstring(10),
            'parent_group': top_group_id,
            'group_owner': self.user.username
        })
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp['name']) == 10
        assert json_resp['parent_group_id'] == top_group_id

        self.remove_group(json_resp['id'])
        self.remove_group(top_group_id)
