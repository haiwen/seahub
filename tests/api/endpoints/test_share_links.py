# -*- coding: utf-8 -*-
import json

from mock import patch
from seaserv import seafile_api
from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase
from seahub.share.models import FileShare
from seahub.api2.permissions import CanGenerateShareLink

try:
    from seahub.settings import LOCAL_PRO_DEV_ENV
except ImportError:
    LOCAL_PRO_DEV_ENV = False

class ShareLinksTest(BaseTestCase):

    def setUp(self):
        self.repo_id = self.repo.id
        self.file_path= self.file
        self.folder_path= self.folder
        self.url = reverse('api-v2.1-share-links')

    def tearDown(self):
        self.remove_repo()

    def _add_file_share_link(self):
        fs = FileShare.objects.create_file_link(self.user.username,
            self.repo.id, self.file, None, None)

        return fs.token

    def _add_dir_share_link(self):
        fs = FileShare.objects.create_dir_link(self.user.username,
            self.repo.id, self.folder, None, None)

        return fs.token

    def _remove_share_link(self, token):
        link = FileShare.objects.get(token=token)
        link.delete()

    def test_get_file_share_link(self):
        self.login_as(self.user)
        token = self._add_file_share_link()

        resp = self.client.get(self.url + '?path=' + self.file_path + '&repo_id=' + self.repo_id)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)

        assert json_resp[0]['link'] is not None
        assert json_resp[0]['token'] is not None
        assert json_resp[0]['is_expired'] is not None

        assert token in json_resp[0]['link']
        assert 'f' in json_resp[0]['link']

        assert token == json_resp[0]['token']

        self._remove_share_link(token)

    def test_get_dir_share_link(self):
        self.login_as(self.user)
        token = self._add_dir_share_link()

        resp = self.client.get(self.url + '?path=' + self.folder_path + '&repo_id=' + self.repo_id)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)

        assert json_resp[0]['link'] is not None
        assert json_resp[0]['token'] is not None
        assert json_resp[0]['is_expired'] is not None

        assert token in json_resp[0]['link']
        assert 'd' in json_resp[0]['link']

        assert token == json_resp[0]['token']

        self._remove_share_link(token)

    @patch.object(CanGenerateShareLink, 'has_permission')
    def test_get_link_with_invalid_user_role_permission(self, mock_has_permission):
        self.login_as(self.user)
        mock_has_permission.return_value = False

        resp = self.client.get(self.url)
        self.assertEqual(403, resp.status_code)

    def test_create_file_share_link(self):
        self.login_as(self.user)

        resp = self.client.post(self.url, {'path': self.file_path, 'repo_id': self.repo_id})
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['link'] is not None
        assert json_resp['token'] is not None
        assert json_resp['is_expired'] is not None

        assert json_resp['token'] in json_resp['link']
        assert 'f' in json_resp['link']

        self._remove_share_link(json_resp['token'])

    def test_create_file_share_link_in_enc_repo(self):
        self.login_as(self.user)

        resp = self.client.post(self.url, {'path': '/', 'repo_id': self.enc_repo.id})
        self.assertEqual(403, resp.status_code)

    def test_create_file_share_link_in_other_repo(self):
        self.login_as(self.admin)

        resp = self.client.post(self.url, {'path': self.file_path, 'repo_id': self.repo_id})
        self.assertEqual(403, resp.status_code)

    def test_create_file_share_link_with_permissions(self):
        self.login_as(self.user)

        json_str = json.dumps({'path': self.file_path, 'repo_id': self.repo_id,
                               'permissions': {
                                   'can_edit': False,
                                   'can_download': True
                               }})
        resp = self.client.post(self.url, json_str,
                                content_type="application/json")
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['link'] is not None
        assert json_resp['token'] is not None
        assert json_resp['is_expired'] is not None

        assert json_resp['token'] in json_resp['link']
        assert 'f' in json_resp['link']

        assert json_resp['permissions']['can_edit'] is False
        assert json_resp['permissions']['can_download'] is True

        self._remove_share_link(json_resp['token'])

    def test_create_file_share_link_with_invalid_permissions(self):
        self.login_as(self.user)

        json_str = json.dumps({'path': self.file_path, 'repo_id': self.repo_id,
                               'permissions': {
                                   'can_editrrr': False,
                                   'can_downloadrrr': True
                               }})
        resp = self.client.post(self.url, json_str,
                                content_type="application/json")
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['link'] is not None
        assert json_resp['token'] is not None
        assert json_resp['is_expired'] is not None

        assert json_resp['token'] in json_resp['link']
        assert 'f' in json_resp['link']

        assert json_resp['permissions']['can_edit'] is False
        assert json_resp['permissions']['can_download'] is True

        self._remove_share_link(json_resp['token'])

    def test_create_file_share_link_with_view_only_permission(self):
        self.login_as(self.user)

        json_str = json.dumps({'path': self.file_path, 'repo_id': self.repo_id,
                               'permissions': {
                                   'can_edit': False,
                                   'can_download': False
                               }})
        resp = self.client.post(self.url, json_str,
                                content_type="application/json")
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['link'] is not None
        assert json_resp['token'] is not None
        assert json_resp['is_expired'] is not None

        assert json_resp['token'] in json_resp['link']
        assert 'f' in json_resp['link']

        assert json_resp['permissions']['can_edit'] is False
        assert json_resp['permissions']['can_download'] is False

        self._remove_share_link(json_resp['token'])

    def test_create_dir_share_link(self):
        self.login_as(self.user)

        resp = self.client.post(self.url, {'path': self.folder_path, 'repo_id': self.repo_id})
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['link'] is not None
        assert json_resp['token'] is not None
        assert json_resp['is_expired'] is not None

        assert json_resp['token'] in json_resp['link']
        assert 'd' in json_resp['link']

        self._remove_share_link(json_resp['token'])

    def test_create_link_with_invalid_repo_permission(self):
        # login with admin to create share link in user repo
        self.login_as(self.admin)
        data = {'path': self.file_path, 'repo_id': self.repo_id}
        resp = self.client.post(self.url, data)
        self.assertEqual(403, resp.status_code)

    def test_create_link_with_rw_permission_folder(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.set_user_folder_rw_permission_to_admin()

        # login with admin to create share link for 'r' permission folder
        self.login_as(self.admin)
        data = {'path': self.file_path, 'repo_id': self.repo_id}
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)

    def test_create_link_with_rw_permission_folder_in_group(self):

        self.share_repo_to_group_with_rw_permission()
        self.add_admin_to_group()

        # login with admin to create share link for 'r' permission folder
        self.login_as(self.admin)
        data = {'path': self.file_path, 'repo_id': self.repo_id}
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)

    def test_create_link_with_r_permission_folder(self):

        if not LOCAL_PRO_DEV_ENV:
            return

        self.set_user_folder_r_permission_to_admin()

        # login with admin to create share link for 'r' permission folder
        self.login_as(self.admin)
        data = {'path': self.file_path, 'repo_id': self.repo_id}
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)

    def test_create_link_with_r_permission_folder_in_group(self):

        self.share_repo_to_group_with_r_permission()
        self.add_admin_to_group()

        # login with admin to create share link for 'r' permission folder
        self.login_as(self.admin)
        data = {'path': self.file_path, 'repo_id': self.repo_id}
        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)

    @patch.object(CanGenerateShareLink, 'has_permission')
    def test_create_link_with_invalid_user_role_permission(self, mock_has_permission):
        self.login_as(self.user)
        mock_has_permission.return_value = False

        resp = self.client.post(self.url, {'path': self.folder_path, 'repo_id': self.repo_id})
        self.assertEqual(403, resp.status_code)

    def test_delete_file_share_link(self):
        self.login_as(self.user)
        token = self._add_file_share_link()

        url = reverse('api-v2.1-share-link', args=[token])
        resp = self.client.delete(url, {}, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['success'] is True

    def test_delete_dir_share_link(self):
        self.login_as(self.user)
        token = self._add_file_share_link()
        url = reverse('api-v2.1-share-link', args=[token])
        resp = self.client.delete(url, {}, 'application/x-www-form-urlencoded')
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['success'] is True

    def test_delete_link_if_not_owner(self):
        self.login_as(self.admin)
        token = self._add_file_share_link()
        url = reverse('api-v2.1-share-link', args=[token])
        resp = self.client.delete(url, {}, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)

    @patch.object(CanGenerateShareLink, 'has_permission')
    def test_delete_link_with_invalid_user_repo_permission(self, mock_has_permission):
        token = self._add_file_share_link()

        self.login_as(self.user)
        mock_has_permission.return_value = False

        url = reverse('api-v2.1-share-link', args=[token])
        resp = self.client.delete(url, {}, 'application/x-www-form-urlencoded')
        self.assertEqual(403, resp.status_code)
