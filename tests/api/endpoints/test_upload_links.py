# -*- coding: utf-8 -*-
import json
from mock import patch

from django.core.urlresolvers import reverse
from seahub.test_utils import BaseTestCase
from seahub.share.models import UploadLinkShare
from seahub.api2.endpoints.upload_links import UploadLinks, UploadLink

class UploadLinksTest(BaseTestCase):

    def setUp(self):
        self.repo_id = self.repo.id
        self.folder_path= self.folder
        self.url = reverse('api-v2.1-upload-links')

    def tearDown(self):
        self.remove_repo()

    def _add_upload_link(self):
        upload_link = UploadLinkShare.objects.create_upload_link_share(self.user.username,
            self.repo.id, self.folder, None, None)

        return upload_link.token

    def _remove_upload_link(self, token):
        link = UploadLinkShare.objects.get(token=token)
        link.delete()

    def test_get_upload_link(self):
        self.login_as(self.user)
        token = self._add_upload_link()

        resp = self.client.get(self.url + '?path=' + self.folder_path + '&repo_id=' + self.repo_id)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)

        assert json_resp['link'] is not None
        assert json_resp['token'] is not None

        assert token in json_resp['link']
        assert 'u/d' in json_resp['link']

        assert token == json_resp['token']

        self._remove_upload_link(token)

    def test_create_upload_link(self):
        self.login_as(self.user)

        resp = self.client.post(self.url, {'path': self.folder_path, 'repo_id': self.repo_id})
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['link'] is not None
        assert json_resp['token'] is not None

        assert json_resp['token'] in json_resp['link']
        assert 'u/d' in json_resp['link']

        self._remove_upload_link(json_resp['token'])

    def test_delete_upload_link(self):
        self.login_as(self.user)
        token = self._add_upload_link()

        url = reverse('api-v2.1-upload-link', args=[token])
        resp = self.client.delete(url, {}, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['success'] is True

    # test permission
    def test_can_not_delete_link_if_not_owner(self):
        self.login_as(self.admin)
        token = self._add_upload_link()

        url = reverse('api-v2.1-upload-link', args=[token])
        resp = self.client.delete(url, {}, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)

    @patch.object(UploadLinks, '_can_generate_shared_link')
    def test_can_not_get_and_create_link_with_invalid_permission(self, mock_can_generate_shared_link):
        self.login_as(self.user)
        mock_can_generate_shared_link.return_value = False

        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)

        resp = self.client.post(self.url)
        self.assertEqual(403, resp.status_code)

    @patch.object(UploadLink, '_can_generate_shared_link')
    def test_can_not_delete_link_with_invalid_permission(self, mock_can_generate_shared_link):
        token = self._add_upload_link()
        url = reverse('api-v2.1-upload-link', args=[token])
        resp = self.client.delete(url, {}, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)
