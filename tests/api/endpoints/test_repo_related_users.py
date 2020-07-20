# -*- coding: utf-8 -*-
import json

from django.urls import reverse
from seaserv import seafile_api, ccnet_api

from seahub.test_utils import BaseTestCase
from tests.common.utils import randstring


class RepoRelatedUsersViewTest(BaseTestCase):

    def setUp(self):
        self.login_as(self.user)
        self.group_id = self.group.id
        self.group_name = self.group.group_name
        self.repo_id = self.repo.id

        self.url = reverse('api-v2.1-related-user', args=[self.repo_id])

        # add tmp user to group
        self.tmp_user = self.create_user(
            'user_%s@test.com' % randstring(4), is_staff=False)
        ccnet_api.group_add_member(self.group_id, self.user.username, self.tmp_user.username)

        # share repo to group
        seafile_api.set_group_repo(
            self.repo_id, self.group_id, self.user.username, 'rw')

        # share repo to admin
        seafile_api.share_repo(
                self.repo.id, self.user.username,
                self.admin.username, 'rw')

    def tearDown(self):
        self.remove_group()
        self.remove_repo()
        self.remove_user(self.tmp_user.username)

    def test_can_get(self):
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        user_list = json_resp.get('user_list')

        assert user_list
        assert len(user_list) == 3

        usernames = [user_info.get('email') for user_info in user_list]
        assert self.user.username in usernames
        assert self.tmp_user.username in usernames
        assert self.admin.username in usernames
