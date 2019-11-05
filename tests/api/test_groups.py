#coding: UTF-8
"""
Test groups api.
"""

import unittest

from tests.api.apitestbase import ApiTestBase
from tests.api.urls import GROUPS_URL
from tests.common.utils import apiurl, urljoin, randstring

class GroupsApiTest(ApiTestBase):
    def test_add_remove_group_member(self):
        with self.get_tmp_user() as user:
            with self.get_tmp_group() as group:
                test_group_members_url = urljoin(group.group_url, '/members/')
                data = {'user_name': user.user_name}
                res = self.put(test_group_members_url, data=data).json()
                self.assertTrue(res['success'])
                res = self.delete(test_group_members_url, data=data).json()
                self.assertTrue(res['success'])

    def test_list_groups(self):
        with self.get_tmp_group() as group:
            groups = self.get(GROUPS_URL).json()
            self.assertGreaterEqual(groups['replynum'], 0)
            self.assertNotEmpty(groups['groups'])
            for group in groups['groups']:
                self.assertIsNotNone(group['ctime'])
                self.assertIsNotNone(group['creator'])
                self.assertIsNotNone(group['msgnum'])
                self.assertIsNotNone(group['id'])
                self.assertIsNotNone(group['name'])

    def test_add_remove_group(self):
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

    def test_add_remove_group_with_blank(self):
        data = {'group_name': randstring(4) + ' ' + randstring(4)}
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

    def test_add_remove_group_with_hyphen(self):
        data = {'group_name': randstring(4) + '-' + randstring(4)}
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

    def test_add_remove_group_with_single_quote(self):
        data = {'group_name': randstring(4) + "'" + randstring(4)}
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

    def test_add_remove_group_with_blank_and_hyphen_and_single_quote(self):
        data = {'group_name': randstring(2) + '-' + randstring(2) + ' ' + randstring(2) + "'" + randstring(2)}
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
