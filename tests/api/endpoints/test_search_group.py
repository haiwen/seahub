# Copyright (c) 2012-2016 Seafile Ltd.

import json
from mock import patch

from django.urls import reverse
from django.test import override_settings

from seahub.test_utils import BaseTestCase
from seahub.api2.endpoints.search_group import SearchGroup

class SearchGroupTest(BaseTestCase):

    def setUp(self):
        self.endpoint = reverse('api-v2.1-search-group')
        self.group_name = self.group.group_name

    def test_can_search(self):

        self.login_as(self.user)

        resp = self.client.get(self.endpoint + '?q=' + self.group_name)
        json_resp = json.loads(resp.content)

        self.assertEqual(200, resp.status_code)
        assert len(json_resp) > 0

    def test_search_with_unlogin_user(self):

        resp = self.client.get(self.endpoint + '?q=' + self.group_name)
        self.assertEqual(403, resp.status_code)

    @patch.object(SearchGroup, '_can_use_global_address_book')
    def test_search_with_can_not_use_global_address_book(self, mock_can_use_global_address_book):

        mock_can_use_global_address_book.return_value = False

        self.login_as(self.user)

        resp = self.client.get(self.endpoint + '?q=' + self.group_name)
        self.assertEqual(403, resp.status_code)

    @override_settings(ENABLE_GLOBAL_ADDRESSBOOK=False)
    def test_search_with_not_enable_global_addressbook(self):

        self.login_as(self.user)

        resp = self.client.get(self.endpoint + '?q=' + self.group_name)
        json_resp = json.loads(resp.content)
        self.assertEqual(200, resp.status_code)
        assert len(json_resp) > 0
