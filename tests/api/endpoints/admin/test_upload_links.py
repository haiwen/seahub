# -*- coding: utf-8 -*-
import json

from tests.common.utils import randstring, upload_file_test
from django.urls import reverse
from seahub.test_utils import BaseTestCase
from seahub.share.models import UploadLinkShare

try:
    from seahub.settings import LOCAL_PRO_DEV_ENV
except ImportError:
    LOCAL_PRO_DEV_ENV = False


class AdminUploadLinksTest(BaseTestCase):

    def setUp(self):
        self.repo_id = self.repo.id
        self.folder_path = self.folder
        self.invalid_token = '00000000000000000000'

    def tearDown(self):
        self.remove_repo()

    def _add_upload_link(self, password=None):
        fs = UploadLinkShare.objects.create_upload_link_share(
                self.user.username, self.repo.id, self.folder_path, password, None)

        return fs.token

    def _remove_upload_link(self, token):
        link = UploadLinkShare.objects.get(token=token)
        link.delete()

    def test_get_share_links(self):
        self.login_as(self.admin)
        token = self._add_upload_link()

        url = reverse('api-v2.1-admin-upload-links')
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)

        self._remove_upload_link(token)

    def test_get_share_links_with_invalid_permission(self):
        self.login_as(self.user)
        token = self._add_upload_link()

        url = reverse('api-v2.1-admin-upload-links')
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)

        self._remove_upload_link(token)

class AdminUploadLinkTest(BaseTestCase):

    def setUp(self):
        self.repo_id = self.repo.id
        self.folder_path= self.folder
        self.invalid_token = '00000000000000000000'

    def tearDown(self):
        self.remove_repo()

    def _add_upload_link(self, password=None):
        fs = UploadLinkShare.objects.create_upload_link_share(
                self.user.username, self.repo.id, self.folder_path, password, None)

        return fs.token

    def _remove_upload_link(self, token):
        link = UploadLinkShare.objects.get(token=token)
        link.delete()

    def test_get_upload_link_info(self):
        self.login_as(self.admin)
        token = self._add_upload_link()

        url = reverse('api-v2.1-admin-upload-link', args=[token])
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)

        assert json_resp['token'] == token

        self._remove_upload_link(token)

    def test_no_permission(self):
        self.login_as(self.admin_no_other_permission)
        token = self._add_upload_link()

        url = reverse('api-v2.1-admin-upload-link', args=[token])
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)

        self._remove_upload_link(token)

    def test_get_upload_link_info_with_invalid_permission(self):
        self.login_as(self.user)
        token = self._add_upload_link()

        url = reverse('api-v2.1-admin-upload-link', args=[token])
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)

        self._remove_upload_link(token)

    def test_get_upload_link_info_with_invalid_token(self):
        self.login_as(self.admin)

        url = reverse('api-v2.1-admin-upload-link',
                args=[self.invalid_token])
        resp = self.client.get(url)
        self.assertEqual(404, resp.status_code)

    def test_can_delete_upload_link_by_token(self):
        self.login_as(self.admin)
        token = self._add_upload_link()

        url = reverse('api-v2.1-admin-upload-link', args=[token])
        resp = self.client.delete(url)
        self.assertEqual(200, resp.status_code)

    def test_delete_upload_link_with_invalid_permission(self):
        self.login_as(self.user)
        token = self._add_upload_link()

        url = reverse('api-v2.1-admin-upload-link', args=[token])
        resp = self.client.delete(url)
        self.assertEqual(403, resp.status_code)

        self._remove_upload_link(token)


class AdminUploadLinkUploadTest(BaseTestCase):

    def setUp(self):
        self.repo_id = self.repo.id
        self.folder_path= self.folder
        self.invalid_token = '00000000000000000000'

    def tearDown(self):
        self.remove_repo()

    def _add_upload_link(self, password=None):
        fs = UploadLinkShare.objects.create_upload_link_share(
                self.user.username, self.repo.id, self.folder_path, password, None)

        return fs.token

    def _remove_upload_link(self, token):
        link = UploadLinkShare.objects.get(token=token)
        link.delete()

    def test_upload(self):
        self.login_as(self.admin)
        token = self._add_upload_link()

        url = reverse('api-v2.1-admin-upload-link-upload', args=[token])
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)

        assert '8082' in json_resp['upload_link']
        assert 'upload' in json_resp['upload_link']

        # test upload file via `upload_link`
        upload_file_test(json_resp['upload_link'], parent_dir=self.folder_path)

        self._remove_upload_link(token)

    def test_upload_with_invalid_permission(self):
        self.login_as(self.user)
        token = self._add_upload_link()

        url = reverse('api-v2.1-admin-upload-link-upload', args=[token])
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)

        self._remove_upload_link(token)

    def test_get_upload_link_info_with_invalid_token(self):
        self.login_as(self.admin)

        url = reverse('api-v2.1-admin-upload-link-upload',
                args=[self.invalid_token])
        resp = self.client.get(url)
        self.assertEqual(404, resp.status_code)


class AdminUploadLinkCheckPasswordTest(BaseTestCase):

    def setUp(self):
        self.repo_id = self.repo.id
        self.folder_path= self.folder
        self.invalid_token = '00000000000000000000'

    def tearDown(self):
        self.remove_repo()

    def _add_upload_link(self, password=None):
        fs = UploadLinkShare.objects.create_upload_link_share(
                self.user.username, self.repo.id, self.folder_path, password, None)

        return fs.token

    def _remove_upload_link(self, token):
        link = UploadLinkShare.objects.get(token=token)
        link.delete()

    def test_check_password(self):
        self.login_as(self.admin)

        password = randstring(10)
        token = self._add_upload_link(password)
        url = reverse('api-v2.1-admin-upload-link-check-password', args=[token])

        resp = self.client.post(url, {'password': password})
        self.assertEqual(200, resp.status_code)

        self._remove_upload_link(token)

    def test_invalid_password(self):
        self.login_as(self.admin)

        password = randstring(10)
        token = self._add_upload_link(password)
        url = reverse('api-v2.1-admin-upload-link-check-password', args=[token])

        # assert password is valid
        resp = self.client.post(url, {'password': password})
        self.assertEqual(200, resp.status_code)

        # assert password is invalid
        resp = self.client.post(url, {'password': 'invalid_password'})
        self.assertEqual(403, resp.status_code)

        self._remove_upload_link(token)

    def test_check_password_with_invalid_permission(self):
        self.login_as(self.user)
        token = self._add_upload_link()

        url = reverse('api-v2.1-admin-upload-link-check-password', args=[token])
        resp = self.client.post(url, {'password': 'invalid_password'})
        self.assertEqual(403, resp.status_code)

        self._remove_upload_link(token)

    def test_check_password_with_invalid_token(self):
        self.login_as(self.admin)

        url = reverse('api-v2.1-admin-upload-link-check-password',
                args=[self.invalid_token])
        resp = self.client.post(url, {'password': 'invalid_password'})
        self.assertEqual(404, resp.status_code)


