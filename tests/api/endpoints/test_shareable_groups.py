# Copyright (c) 2011-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
import json
import pytest
pytestmark = pytest.mark.django_db

from django.urls import reverse
from seahub.test_utils import BaseTestCase
from tests.common.utils import randstring


class ShareableGroupsTest(BaseTestCase):

    def setUp(self):
        from constance import config
        self.config = config

        self.login_as(self.user)
        self.group_id = self.group.id
        self.group_name = self.group.group_name
        self.admin_user = self.admin.username

        self.url = reverse('api-v2.1-shareable-groups')

    def tearDown(self):
        self.remove_group()
        self.remove_repo()
        self.clear_cache()

    def test_can_get(self):

        self.config.ENABLE_SHARE_TO_ALL_GROUPS = 1

        admin_group_name = randstring(10)
        admin_group = self.create_group(group_name=admin_group_name,
                username=self.admin_user)

        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        group_names = [g["name"] for g in json_resp]
        self.assertIn(admin_group_name, group_names)
        self.assertIn(self.group.group_name, group_names)


        self.remove_group(admin_group.group_id)
        self.clear_cache()

    def test_can_get_with_disable_config(self):

        self.config.ENABLE_SHARE_TO_ALL_GROUPS = 0

        admin_group_name = randstring(10)
        admin_group = self.create_group(group_name=admin_group_name,
                username=self.admin_user)

        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        group_names = [g["name"] for g in json_resp]
        self.assertIn(self.group.group_name, group_names)
        self.assertNotIn(admin_group_name, group_names)

        self.remove_group(admin_group.group_id)
        self.clear_cache()
