# Copyright (c) 2011-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
import json

from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase

from constance import config


class GroupsShareTest(BaseTestCase):
    def test_can_get(self):
        config.ENABLE_SHARE_TO_ALL_GROUPS = 1
        self.login_as(self.admin)
        self.admin_group = self.create_group(group_name='test_group', 
                                  username=self.admin.username)
        self.logout()
        self.login_as(self.user)
        resp = [group["name"] for group in 
                json.loads(self.client.get(reverse('api-v2.1-all-groups')).content)]
        self.assertIn('test_group', resp)
        self.clear_cache()

    def test_can_get_with_disable_config(self):
        config.ENABLE_SHARE_TO_ALL_GROUPS = 0
        self.login_as(self.admin)
        self.admin_group = self.create_group(group_name='test_disable_config', 
                                  username=self.admin.username)
        resp = json.loads(self.client.get(reverse('api-v2.1-all-groups')).content)
        self.assertEqual([], resp)
        self.clear_cache()

    def tearDown(self):
        self.remove_group(self.admin_group.id)

