import json
from mock import patch

from seaserv import ccnet_api
from django.core.urlresolvers import reverse
from seahub.test_utils import BaseTestCase
from tests.common.utils import randstring


class LogsTest(BaseTestCase):

    def setUp(self):
        self.login_as(self.admin)
        self.user_name = self.user.username
        self.admin_name = self.admin.username

        self.group_id = self.group.id
        self.repo_id= self.repo.repo_id
        self.new_user = '%s@%s.com' % (randstring(6), randstring(6))
        self.library_url = reverse('api-v2.1-admin-library', args=[self.repo_id])
        self.admin_log_url = reverse('api-v2.1-admin-admin-logs')

    def tearDown(self):
        self.remove_group()
        self.remove_repo()

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_create_group(self, mock_has_permission):

        mock_has_permission.return_value = True

        # admin create group
        url = reverse('api-v2.1-admin-groups')
        group_name = randstring(10)
        data = {
            'group_name': group_name,
            'group_owner': self.user.email
        }
        resp = self.client.post(url, data)
        json_resp = json.loads(resp.content)
        group_id = json_resp['id']
        self.assertEqual(201, resp.status_code)

        # get admin log
        resp = self.client.get(self.admin_log_url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert json_resp['total_count'] == 1
        assert json_resp['data'][0]['operation'] == 'group_create'

        self.remove_group(group_id)

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_transfer_group(self, mock_has_permission):

        # admin transfer group
        url = reverse('api-v2.1-admin-group', args=[self.group_id])
        data = 'new_owner=%s' % self.admin_name
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        # get admin log
        resp = self.client.get(self.admin_log_url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert json_resp['total_count'] == 1
        assert json_resp['data'][0]['operation'] == 'group_transfer'

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_delete_group(self, mock_has_permission):

        # admin delete group
        url = reverse('api-v2.1-admin-group', args=[self.group_id])
        resp = self.client.delete(url)
        self.assertEqual(200, resp.status_code)

        # get admin log
        resp = self.client.get(self.admin_log_url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert json_resp['total_count'] == 1
        assert json_resp['data'][0]['operation'] == 'group_delete'

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_create_user(self, mock_has_permission):

        # admin create user
        resp = self.client.post(
            reverse('user_add',), {
                'email': self.new_user,
                'password1': '123',
                'password2': '123',
            }, HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(200, resp.status_code)

        # get admin log
        resp = self.client.get(self.admin_log_url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert json_resp['total_count'] == 1
        assert json_resp['data'][0]['operation'] == 'user_add'

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_delete_user(self, mock_has_permission):

        # create a tmp user first
        ccnet_api.add_emailuser(self.new_user, 'password', 0, 1)

        # admin delete user
        resp = self.client.post(
            reverse('user_remove', args=[self.new_user])
        )
        self.assertEqual(302, resp.status_code)

        # get admin log
        resp = self.client.get(self.admin_log_url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert json_resp['total_count'] == 1
        assert json_resp['data'][0]['operation'] == 'user_delete'

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_transfer_library(self, mock_has_permission):

        # admin transfer library
        data = 'owner=%s' % self.admin_name
        resp = self.client.put(self.library_url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        # get admin log
        resp = self.client.get(self.admin_log_url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert json_resp['total_count'] == 1
        assert json_resp['data'][0]['operation'] == 'repo_transfer'

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_create_library(self, mock_has_permission):

        # admin create library
        url = reverse('api-v2.1-admin-libraries')
        repo_name = randstring(10)
        data = {
            'name': repo_name,
            'owner': self.user.email
        }
        resp = self.client.post(url, data)
        json_resp = json.loads(resp.content)
        repo_id = json_resp['id']
        self.assertEqual(200, resp.status_code)

        # get admin log
        resp = self.client.get(self.admin_log_url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert json_resp['total_count'] == 1
        assert json_resp['data'][0]['operation'] == 'repo_create'

        self.remove_repo(repo_id)

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_delete_library(self, mock_has_permission):

        # admin delete library
        resp = self.client.delete(self.library_url)
        self.assertEqual(200, resp.status_code)

        # get admin log
        resp = self.client.get(self.admin_log_url)
        self.assertEqual(200, resp.status_code)
        json_resp = json.loads(resp.content)

        assert json_resp['total_count'] == 1
        assert json_resp['data'][0]['operation'] == 'repo_delete'
