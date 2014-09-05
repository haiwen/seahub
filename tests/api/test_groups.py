#coding: UTF-8
"""
Test groups api.
"""

import unittest

from tests.api.apitestbase import ApiTestBase
from tests.api.urls import GROUPS_URL
from tests.common.utils import apiurl, urljoin, randstring

class GroupsApiTest(ApiTestBase):
    use_test_user = True
    use_test_group = True

    def test_add_remove_group_member(self):
        test_group_members_url = urljoin(self.test_group_url, '/members/')
        data = {'user_name': self.test_user_name}
        res = self.put(test_group_members_url, data=data).json()
        self.assertTrue(res['success'])
        res = self.delete(test_group_members_url, data=data).json()
        self.assertTrue(res['success'])

    def test_list_groups(self):
        groups = self.get(GROUPS_URL).json()
        self.assertGreaterEqual(groups['replynum'], 0)
        self.assertNotEmpty(groups['groups'])
        for group in groups['groups']:
            self.assertIsNotNone(group['ctime'])
            self.assertIsNotNone(group['creator'])
            self.assertIsNotNone(group['msgnum'])
            self.assertIsNotNone(group['mtime'])
            self.assertIsNotNone(group['id'])
            self.assertIsNotNone(group['name'])

    def test_add_group(self):
        data = {'group_name': randstring(16)}
        info = self.put(GROUPS_URL, data=data).json()
        self.assertTrue(info['success'])
        group_id = info['group_id']
        self.assertGreater(group_id, 0)
        url = urljoin(GROUPS_URL, str(group_id))
        self.delete(url)

        # check group is really removed
        groups = self.get(GROUPS_URL).json()['groups']
        for group in groups:
            self.assertNotEqual(group['id'], group_id)
