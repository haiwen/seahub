import json

from seaserv import seafile_api

from django.urls import reverse
from seahub.test_utils import BaseTestCase
from tests.common.utils import upload_file_test

class AdminSystemLibraryTest(BaseTestCase):

    def setUp(self):
        self.url = reverse('api-v2.1-admin-system-library')

    def test_can_get(self):
        self.login_as(self.admin)
        resp = self.client.get(self.url)

        json_resp = json.loads(resp.content)
        assert json_resp['id'] == seafile_api.get_system_default_repo_id()

    def test_get_with_invalid_user_permission(self):
        self.login_as(self.user)
        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)

    def test_get_admin_permission_denied(self):
        self.login_as(self.admin_cannot_manage_library)
        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)


class AdminSystemLibraryUploadLinkTest(BaseTestCase):

    def setUp(self):
        self.url = reverse('api-v2.1-admin-system-library-upload-link')

    def test_can_get(self):
        self.login_as(self.admin)
        resp = self.client.get(self.url)

        json_resp = json.loads(resp.content)
        assert '8082' in json_resp['upload_link']
        assert 'upload' in json_resp['upload_link']

        # test upload file via `upload_link`
        upload_file_test(json_resp['upload_link'])

    def test_get_with_invalid_user_permission(self):
        self.login_as(self.user)
        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)

    def test_get_admin_permission_denied(self):
        self.login_as(self.admin_cannot_manage_library)
        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)
