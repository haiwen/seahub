# -*- coding: utf-8 -*-
import json
from mock import patch
import random

from django.urls import reverse
from seaserv import seafile_api

from seahub.test_utils import BaseTestCase
from seahub.api2.endpoints.groups import Groups
from tests.common.utils import randstring


class GroupsTest(BaseTestCase):

    def setUp(self):
        self.login_as(self.user)
        self.group_id = self.group.id
        self.group_name = self.group.group_name
        self.repo_id = self.repo.id

        self.url = reverse('api-v2.1-groups')

        # share repo to group
        seafile_api.set_group_repo(self.repo_id,
                                   self.group_id, self.user.email, 'rw')

    def tearDown(self):
        self.remove_group()
        self.remove_repo()

    def test_get_group_info(self):
        resp = self.client.get(self.url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp[0]) == 8

        group_ids = []
        for group in json_resp:
            group_ids.append(group['id'])

        assert self.group_id in group_ids

    def test_get_group_info_with_repos(self):
        resp = self.client.get(self.url + '?with_repos=1')
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp[0]) == 9

        group_ids = []
        group_repos = []
        for group in json_resp:
            group_ids.append(group['id'])
            for repo in group['repos']:
                group_repos.append(repo)

        group_repo_ids = []
        for repo in group_repos:
            group_repo_ids.append(repo['id'])

        assert self.repo_id in group_repo_ids
        assert self.group_id in group_ids

    def test_create_group(self):
        new_group_name = 'new-group-' + randstring(6)

        resp = self.client.post(self.url, {'name': new_group_name})
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp) == 8
        assert json_resp['name'] == new_group_name
        assert json_resp['owner'] == self.user.email

        self.remove_group(json_resp['id'])

    def test_create_group_with_cn_name(self):
        new_group_name = '中文' + randstring(6)
        resp = self.client.post(self.url, {'name': new_group_name})
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp) == 8
        assert json_resp['name'] == new_group_name
        assert json_resp['owner'] == self.user.email

        self.remove_group(json_resp['id'])

    def test_can_not_create_group_with_same_name(self):
        resp = self.client.post(self.url, {'group_name': self.group_name})
        self.assertEqual(400, resp.status_code)

    def test_can_create_by_limit_punctuation(self):
        limit_punctuation = """-'_."""
        new_group_name = randstring(2) + random.choice(limit_punctuation) + randstring(2)

        resp = self.client.post(self.url, {'name': new_group_name})
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['name'] == new_group_name
        assert json_resp['owner'] == self.user.email

        self.remove_group(json_resp['id'])

    def test_can_not_create_by_other_punctuation(self):
        other_punctuation = """!"#$%&*+,/:;<=>?@[\]^`{|}~"""
        new_group_name = randstring(2) + random.choice(other_punctuation) + randstring(2)

        resp = self.client.post(self.url, {'name': new_group_name})
        self.assertEqual(400, resp.status_code)

    def test_can_not_create_group_with_invalid_name(self):
        new_group_name = 'new%group-' + randstring(6)

        resp = self.client.post(self.url, {'group_name': new_group_name})
        self.assertEqual(400, resp.status_code)

    @patch.object(Groups, '_can_add_group')
    def test_can_not_create_group_with_invalid_permission(self, mock_can_add_group):
        mock_can_add_group.return_value = False
        new_group_name = 'new-group-' + randstring(6)

        resp = self.client.post(self.url, {'group_name': new_group_name})
        self.assertEqual(403, resp.status_code)

    def test_can_rename_group(self):
        new_group_name = 'new-group-' + randstring(6)
        url = reverse('api-v2.1-group', args=[self.group_id])
        data = 'name=%s' % new_group_name

        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['name'] == new_group_name

    def test_can_transfer_group(self):
        new_creator = self.admin.email
        url = reverse('api-v2.1-group', args=[self.group_id])
        data = 'owner=%s' % new_creator

        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)

        assert json_resp['owner'] == new_creator
        assert new_creator in json_resp['admins']
        assert self.user.email not in json_resp['admins']

    def test_can_not_transfer_group_to_group_owner(self):
        new_creator = self.user.email
        url = reverse('api-v2.1-group', args=[self.group_id])
        data = 'owner=%s' % new_creator

        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(400, resp.status_code)

    def test_can_delete_group(self):
        url = reverse('api-v2.1-group', args=[self.group_id])
        resp = self.client.delete(url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['success'] is True
