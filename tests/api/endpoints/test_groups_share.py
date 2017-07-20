# Copyright (c) 2011-2016 Seafile Ltd.
# -*- coding: utf-8 -*-
import json
from mock import patch

from django.core.urlresolvers import reverse
from seaserv import seafile_api

from seahub.test_utils import BaseTestCase


class GroupsShareTest(BaseTestCase):

    @patch('seahub.api2.endpoints.groups_share.ENABLE_SHARE_ANY_GROUPS')
    def test_can_get(self, mock_settings):
        mock_settings.return_value = True
        self.logout()
        self.login_as(self.admin)
        self.admin_group = self.create_group(group_name='onetoone', 
                                  username=self.admin.username)
        self.logout()
        self.login_as(self.user)
        resp = [group["name"] for group in 
                json.loads(self.client.get(reverse('api-v2.1-groups-sharable')).content)]
        self.assertIn('onetoone', resp)

    def tearDown(self):
        self.remove_group(self.admin_group.id)
