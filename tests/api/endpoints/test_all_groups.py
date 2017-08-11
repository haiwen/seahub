# Copyright (c) 2011-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
import json

from django.core.urlresolvers import reverse
from django.test import override_settings

from seahub.test_utils import BaseTestCase


class GroupsShareTest(BaseTestCase):

    @override_settings(ENABLE_SHARE_TO_ALL_GROUPS=True)
    def test_can_get(self):
        self.logout()
        self.login_as(self.admin)
        self.admin_group = self.create_group(group_name='test_group', 
                                  username=self.admin.username)
        self.logout()
        self.login_as(self.user)
        resp = [group["name"] for group in 
                json.loads(self.client.get(reverse('api-v2.1-all-groups')).content)]
        self.assertIn('test_group', resp)

    def tearDown(self):
        self.remove_group(self.admin_group.id)

    @override_settings(ENABLE_SHARE_TO_ALL_GROUPS=True)
    def test_can_get_with_disable_config(self):
        self.logout()
        self.login_as(self.admin)
        self.admin_group = self.create_group(group_name='test_disable_config', 
                                  username=self.admin.username)
        self.logout()
        self.login_as(self.user)
        resp = self.client.get(reverse('api-v2.1-all-groups'))
        self.assertEqual(200, resp.status_code)
