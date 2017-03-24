import json
from mock import patch

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

    def tearDown(self):
        self.remove_group()
        self.remove_repo()

    @patch('seahub.api2.permissions.IsProVersion.has_permission')
    def test_can_get(self, mock_has_permission):

        mock_has_permission.return_value = True

        # admin create group
        url = reverse('api-v2.1-admin-groups')
        group_name = randstring(10)
        data = {
            'group_name': group_name,
            'group_owner': self.user.email
        }
        resp = self.client.post(url, data)
        self.assertEqual(201, resp.status_code)

        # admin transfer group
        url = reverse('api-v2.1-admin-group', args=[self.group_id])
        data = 'new_owner=%s' % self.admin_name
        resp = self.client.put(url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        # admin delete group
        url = reverse('api-v2.1-admin-group', args=[self.group_id])
        resp = self.client.delete(url)
        self.assertEqual(200, resp.status_code)

        # admin create user
        resp = self.client.post(
            reverse('user_add',), {
                'email': self.new_user,
                'password1': '123',
                'password2': '123',
            }, HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(200, resp.status_code)

        # admin delete user
        resp = self.client.post(
            reverse('user_remove', args=[self.new_user])
        )
        self.assertEqual(302, resp.status_code)

        # admin transfer library
        data = 'owner=%s' % self.admin_name
        resp = self.client.put(self.library_url, data, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        # admin delete library
        resp = self.client.delete(self.library_url)
        self.assertEqual(200, resp.status_code)

        # get admin log list
        url = reverse('api-v2.1-admin-admin-logs')
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['total_count'] == 7
