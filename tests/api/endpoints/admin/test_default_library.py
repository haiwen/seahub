import json

from django.urls import reverse
from seahub.options.models import UserOptions
from seahub.test_utils import BaseTestCase

class DefaultLibraryTest(BaseTestCase):

    def setUp(self):
        self.user_name = self.user.username
        self.admin_name = self.admin.username
        self.group_id = self.group.id
        self.repo_id = self.repo.id

        self.endpoint = reverse('api-v2.1-admin-default-library')

    def tearDown(self):
        self.remove_group()

    def test_can_get(self):
        self.login_as(self.admin)

        assert UserOptions.objects.get_default_repo(self.user_name) is None

        resp = self.client.get(self.endpoint + '?user_email=%s' % self.user_name)
        json_resp = json.loads(resp.content)

        assert json_resp['user_email'] == self.user_name
        assert json_resp['exists'] is False

    def test_can_create(self):
        self.login_as(self.admin)

        assert UserOptions.objects.get_default_repo(self.user_name) is None

        data = {'user_email': self.user_name}
        resp = self.client.post(self.endpoint, data)
        json_resp = json.loads(resp.content)

        new_default_repo_id = UserOptions.objects.get_default_repo(self.user_name)

        assert json_resp['user_email'] == self.user_name
        assert json_resp['exists'] is True
        assert json_resp['repo_id'] == new_default_repo_id

    def test_can_not_get_if_not_admin(self):
        self.login_as(self.user)

        resp = self.client.get(self.endpoint + '?user_email=%s' % self.user_name)
        self.assertEqual(403, resp.status_code)

    def test_can_not_create_if_not_admin(self):
        self.login_as(self.user)

        data = {'user_email': self.user_name}
        resp = self.client.post(self.endpoint, data)
        self.assertEqual(403, resp.status_code)

    def test_get_admin_permission_denied(self):
        self.login_as(self.admin_cannot_manage_library)
        resp = self.client.get(self.endpoint)
        self.assertEqual(403, resp.status_code)

    def test_post_admin_permission_denied(self):
        self.login_as(self.admin_cannot_manage_library)
        resp = self.client.get(self.endpoint)
        self.assertEqual(403, resp.status_code)
