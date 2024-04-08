import json
import random
from django.urls import reverse
from seahub.test_utils import BaseTestCase
from tests.common.utils import randstring


class GroupsTest(BaseTestCase):

    def setUp(self):
        self.user_name = self.user.username
        self.admin_name = self.admin.username

    def tearDown(self):
        self.remove_group()

    def test_get_admin_permission_denied(self):
        self.login_as(self.admin_cannot_manage_group)
        resp = self.client.get(reverse('api-v2.1-admin-groups'))
        self.assertEqual(403, resp.status_code)

    def test_post_admin_permission_denied(self):
        self.login_as(self.admin_cannot_manage_group)
        resp = self.client.post(reverse('api-v2.1-admin-groups'))
        self.assertEqual(403, resp.status_code)

    def test_can_get(self):
        self.login_as(self.admin)
        url = reverse('api-v2.1-admin-groups')
        resp = self.client.get(url)

        json_resp = json.loads(resp.content)
        assert len(json_resp['groups']) > 0

    def test_can_search_by_name(self):
        self.login_as(self.admin)
        group_name =  self.group.group_name
        searched_args = group_name[0:1]
        url = reverse('api-v2.1-admin-groups') + '?name=%s' % searched_args
        resp = self.client.get(url)

        json_resp = json.loads(resp.content)
        assert json_resp['name'] == searched_args
        assert searched_args in json_resp['groups'][0]['name']

    def test_get_with_invalid_user_permission(self):
        self.login_as(self.user)
        url = reverse('api-v2.1-admin-groups')
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)

    def test_can_create(self):
        self.login_as(self.admin)

        url = reverse('api-v2.1-admin-groups')
        group_name = randstring(10)

        data = {
            'group_name': group_name,
            'group_owner': self.user.email
        }

        resp = self.client.post(url, data)
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['name'] == group_name
        assert json_resp['owner'] == self.user.email

        self.remove_group(json_resp['id'])

    def test_can_create_by_limit_punctuation(self):
        self.login_as(self.admin)

        url = reverse('api-v2.1-admin-groups')
        limit_punctuation = """-'_."""
        group_name = randstring(2) + random.choice(limit_punctuation) + randstring(2)

        data = {
            'group_name': group_name,
            'group_owner': self.user.email
        }

        resp = self.client.post(url, data)
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['name'] == group_name
        assert json_resp['owner'] == self.user.email

        self.remove_group(json_resp['id'])

    def test_can_not_create_by_other_punctuation(self):
        self.login_as(self.admin)

        url = reverse('api-v2.1-admin-groups')
        other_punctuation = """!"#$%&*+,/:;<=>?@[\]^`{|}~"""
        group_name = randstring(2) + random.choice(other_punctuation) + randstring(2)

        data = {
            'group_name': group_name,
            'group_owner': self.user.email
        }

        resp = self.client.post(url, data)
        self.assertEqual(400, resp.status_code)

    def test_create_without_group_owner(self):
        self.login_as(self.admin)

        url = reverse('api-v2.1-admin-groups')
        group_name = randstring(10)

        data = {
            'group_name': group_name,
        }

        resp = self.client.post(url, data)
        self.assertEqual(201, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['name'] == group_name
        assert json_resp['owner'] == self.admin.email

        self.remove_group(json_resp['id'])

    def test_create_with_invalid_user_permission(self):
        self.login_as(self.user)
        url = reverse('api-v2.1-admin-groups')
        group_name = randstring(10)

        data = {
            'group_name': group_name,
        }

        resp = self.client.post(url, data)
        self.assertEqual(403, resp.status_code)

class GroupTest(BaseTestCase):

    def setUp(self):
        self.user_name = self.user.username
        self.admin_name = self.admin.username
        self.group_id = self.group.id

    def test_put_admin_permission_denied(self):
        self.login_as(self.admin_cannot_manage_group)
        resp = self.client.put(reverse('api-v2.1-admin-group', args=[self.group_id]))
        self.assertEqual(403, resp.status_code)

    def test_delete_admin_permission_denied(self):
        self.login_as(self.admin_cannot_manage_group)
        resp = self.client.delete(reverse('api-v2.1-admin-group', args=[self.group_id]))
        self.assertEqual(403, resp.status_code)

    def test_can_transfer_group(self):

        self.login_as(self.admin)

        url = reverse('api-v2.1-admin-group', args=[self.group_id])
        data = 'new_owner=%s' % self.admin_name
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')

        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)
        assert json_resp['owner'] == self.admin_name

    def test_transfer_group_invalid_user_permission(self):

        self.login_as(self.user)

        url = reverse('api-v2.1-admin-group', args=[self.group_id])
        data = 'new_owner=%s' % self.admin_name
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')

        self.assertEqual(403, resp.status_code)

    def test_transfer_group_invalid_args(self):

        self.login_as(self.admin)

        # invalid new owner
        url = reverse('api-v2.1-admin-group', args=[self.group_id])
        data = 'new_owner=%s' % randstring(6)
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(400, resp.status_code)

        # new owner not exist
        url = reverse('api-v2.1-admin-group', args=[self.group_id])
        data = 'new_owner=invalid@email.com'
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(404, resp.status_code)

    def test_can_delete(self):
        self.login_as(self.admin)
        url = reverse('api-v2.1-admin-group', args=[self.group_id])
        resp = self.client.delete(url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['success'] is True

    def test_delete_with_invalid_user_permission(self):
        self.login_as(self.user)
        url = reverse('api-v2.1-admin-group', args=[self.group_id])
        resp = self.client.delete(url)
        self.assertEqual(403, resp.status_code)
