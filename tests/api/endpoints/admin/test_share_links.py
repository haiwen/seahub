# -*- coding: utf-8 -*-
import json

from tests.common.utils import randstring
from django.urls import reverse
from seahub.test_utils import BaseTestCase
from seahub.share.models import FileShare

from seaserv import seafile_api

try:
    from seahub.settings import LOCAL_PRO_DEV_ENV
except ImportError:
    LOCAL_PRO_DEV_ENV = False

class AdminShareLinksTest(BaseTestCase):

    def setUp(self):
        self.repo_id = self.repo.id
        self.file_path= self.file
        self.folder_path= self.folder
        self.invalid_token = '00000000000000000000'

    def tearDown(self):
        self.remove_repo()

    def _add_file_share_link(self, password=None):
        fs = FileShare.objects.create_file_link(
                self.user.username, self.repo.id, self.file, password, None)

        return fs.token

    def _add_dir_share_link(self, password=None):
        fs = FileShare.objects.create_dir_link(
                self.user.username, self.repo.id, self.folder, password, None)

        return fs.token

    def _remove_share_link(self, token):
        link = FileShare.objects.get(token=token)
        link.delete()

    def test_get_share_links(self):
        self.login_as(self.admin)
        token1 = self._add_file_share_link()
        token2 = self._add_dir_share_link()

        url = reverse('api-v2.1-admin-share-links')
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)

        self._remove_share_link(token1)
        self._remove_share_link(token2)

    def test_get_share_links_with_invalid_permission(self):
        self.login_as(self.user)
        token = self._add_file_share_link()

        url = reverse('api-v2.1-admin-share-links')
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)

        self._remove_share_link(token)

class AdminShareLinkTest(BaseTestCase):

    def setUp(self):
        self.repo_id = self.repo.id
        self.file_path= self.file
        self.folder_path= self.folder
        self.invalid_token = '00000000000000000000'

    def tearDown(self):
        self.remove_repo()

    def _add_file_share_link(self, password=None):
        fs = FileShare.objects.create_file_link(
                self.user.username, self.repo.id, self.file, password, None)

        return fs.token

    def _add_dir_share_link(self, password=None):
        fs = FileShare.objects.create_dir_link(
                self.user.username, self.repo.id, self.folder, password, None)

        return fs.token

    def _remove_share_link(self, token):
        link = FileShare.objects.get(token=token)
        link.delete()

    def test_get_file_share_link_info_by_token(self):
        self.login_as(self.admin)
        token = self._add_file_share_link()

        url = reverse('api-v2.1-admin-share-link', args=[token])
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)

        assert json_resp['token'] == token
        assert json_resp['is_dir'] == False
        assert json_resp['size'] is not None

        self._remove_share_link(token)

    def test_get_dir_share_link_info_by_token(self):
        self.login_as(self.admin)
        token = self._add_dir_share_link()

        url = reverse('api-v2.1-admin-share-link', args=[token])
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)

        assert json_resp['token'] == token
        assert json_resp['is_dir'] == True

        self._remove_share_link(token)

    def test_get_share_link_info_with_invalid_permission(self):
        self.login_as(self.user)
        token = self._add_dir_share_link()

        url = reverse('api-v2.1-admin-share-link', args=[token])
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)

        self._remove_share_link(token)

    def test_get_share_link_info_with_invalid_share_token(self):
        self.login_as(self.admin)

        url = reverse('api-v2.1-admin-share-link',
                args=[self.invalid_token])
        resp = self.client.get(url)
        self.assertEqual(404, resp.status_code)

    def test_can_delete_share_link_by_token(self):
        self.login_as(self.admin)
        token = self._add_dir_share_link()

        url = reverse('api-v2.1-admin-share-link', args=[token])
        resp = self.client.delete(url)
        self.assertEqual(200, resp.status_code)

    def test_delete_share_link_with_invalid_permission(self):
        self.login_as(self.user)
        token = self._add_dir_share_link()

        url = reverse('api-v2.1-admin-share-link', args=[token])
        resp = self.client.delete(url)
        self.assertEqual(403, resp.status_code)

        self._remove_share_link(token)


class AdminShareLinkDirentsTest(BaseTestCase):

    def setUp(self):
        self.repo_id = self.repo.id
        self.folder_path= self.folder
        self.invalid_token = '00000000000000000000'

    def tearDown(self):
        self.remove_repo()

    def _add_dir_share_link(self, password=None):
        fs = FileShare.objects.create_dir_link(
                self.user.username, self.repo.id, self.folder, password, None)

        return fs.token

    def _remove_share_link(self, token):
        link = FileShare.objects.get(token=token)
        link.delete()

    def test_get_dirents(self):

        username = self.user.username
        dir_name = randstring(6)
        file_name = randstring(6)

        seafile_api.post_dir(self.repo_id,
                self.folder_path, dir_name, username)

        seafile_api.post_empty_file(self.repo_id,
                self.folder_path, file_name, username)

        self.login_as(self.admin)
        token = self._add_dir_share_link()
        url = reverse('api-v2.1-admin-share-link-dirents', args=[token])
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)

        assert json_resp[0]['is_dir'] == True
        assert dir_name in json_resp[0]['obj_name']
        assert json_resp[1]['is_dir'] == False
        assert file_name in json_resp[1]['obj_name']

        self._remove_share_link(token)

    def test_get_dirents_with_invalid_permission(self):
        self.login_as(self.user)
        token = self._add_dir_share_link()

        url = reverse('api-v2.1-admin-share-link-dirents', args=[token])
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)

        self._remove_share_link(token)

    def test_get_dirents_with_invalid_share_token(self):
        self.login_as(self.admin)

        url = reverse('api-v2.1-admin-share-link-dirents',
                args=[self.invalid_token])
        resp = self.client.get(url)
        self.assertEqual(404, resp.status_code)


class AdminShareLinkDownloadTest(BaseTestCase):

    def setUp(self):
        self.repo_id = self.repo.id
        self.file_path= self.file
        self.folder_path= self.folder
        self.invalid_token = '00000000000000000000'

    def tearDown(self):
        self.remove_repo()

    def _add_dir_share_link(self, password=None):
        fs = FileShare.objects.create_dir_link(
                self.user.username, self.repo.id, self.folder, password, None)

        return fs.token

    def _add_file_share_link(self, password=None):
        fs = FileShare.objects.create_file_link(
                self.user.username, self.repo.id, self.file, password, None)

        return fs.token

    def _remove_share_link(self, token):
        link = FileShare.objects.get(token=token)
        link.delete()

    def test_download_shared_file(self):
        self.login_as(self.admin)
        token = self._add_file_share_link()

        url = reverse('api-v2.1-admin-share-link-download', args=[token])
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)

        assert '8082' in json_resp['download_link']
        assert 'files' in json_resp['download_link']

        self._remove_share_link(token)

    def test_download_sub_file_in_shared_dir(self):

        username = self.user.username
        file_name = randstring(6)
        seafile_api.post_empty_file(self.repo_id,
                self.folder_path, file_name, username)

        self.login_as(self.admin)
        token = self._add_dir_share_link()

        url = reverse('api-v2.1-admin-share-link-download', args=[token])
        resp = self.client.get(url + '?path=/%s&type=file' % file_name)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)

        assert '8082' in json_resp['download_link']
        assert 'files' in json_resp['download_link']

        self._remove_share_link(token)

    def test_download_sub_dir_in_shared_dir(self):

        username = self.user.username
        dir_name = randstring(6)
        seafile_api.post_dir(self.repo_id,
                self.folder_path, dir_name, username)

        self.login_as(self.admin)
        token = self._add_dir_share_link()

        url = reverse('api-v2.1-admin-share-link-download', args=[token])
        resp = self.client.get(url + '?path=/%s&type=folder' % dir_name)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)

        assert '8082' in json_resp['download_link']
        assert 'zip' in json_resp['download_link']

        self._remove_share_link(token)

    def test_download_with_invalid_permission(self):
        self.login_as(self.user)
        token = self._add_dir_share_link()

        url = reverse('api-v2.1-admin-share-link-download', args=[token])
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)

        self._remove_share_link(token)

    def test_download_with_invalid_share_token(self):
        self.login_as(self.admin)

        url = reverse('api-v2.1-admin-share-link-download',
                args=[self.invalid_token])
        resp = self.client.get(url)
        self.assertEqual(404, resp.status_code)


class ShareLinkCheckPasswordTest(BaseTestCase):

    def setUp(self):
        self.repo_id = self.repo.id
        self.file_path= self.file
        self.folder_path= self.folder
        self.invalid_token = '00000000000000000000'

    def tearDown(self):
        self.remove_repo()

    def _add_file_share_link(self, password=None):
        fs = FileShare.objects.create_file_link(
                self.user.username, self.repo.id, self.file, password, None)

        return fs.token

    def _add_dir_share_link(self, password=None):
        fs = FileShare.objects.create_dir_link(
                self.user.username, self.repo.id, self.folder, password, None)

        return fs.token

    def _remove_share_link(self, token):
        link = FileShare.objects.get(token=token)
        link.delete()

    def test_check_password(self):
        self.login_as(self.admin)

        #### create file share link ####
        password = randstring(10)
        token = self._add_file_share_link(password)
        url = reverse('api-v2.1-admin-share-link-check-password', args=[token])

        # check password for file share link
        resp = self.client.post(url, {'password': password})
        self.assertEqual(200, resp.status_code)

        # remove file share link
        self._remove_share_link(token)

        #### create dir share link ####
        password = randstring(10)
        token = self._add_dir_share_link(password)
        url = reverse('api-v2.1-admin-share-link-check-password', args=[token])

        # check password for dir share link
        resp = self.client.post(url, {'password': password})
        self.assertEqual(200, resp.status_code)

        # remove dir share link
        self._remove_share_link(token)

    def test_invalid_password(self):
        self.login_as(self.admin)

        password = randstring(10)
        token = self._add_file_share_link(password)
        url = reverse('api-v2.1-admin-share-link-check-password', args=[token])

        # assert password is valid
        resp = self.client.post(url, {'password': password})
        self.assertEqual(200, resp.status_code)

        # assert password is invalid
        resp = self.client.post(url, {'password': 'invalid_password'})
        self.assertEqual(403, resp.status_code)

        self._remove_share_link(token)

    def test_check_password_with_invalid_permission(self):
        self.login_as(self.user)
        token = self._add_dir_share_link()

        url = reverse('api-v2.1-admin-share-link-check-password', args=[token])
        resp = self.client.post(url)
        self.assertEqual(403, resp.status_code)

        self._remove_share_link(token)

    def test_check_password_with_invalid_share_token(self):
        self.login_as(self.admin)

        url = reverse('api-v2.1-admin-share-link-check-password',
                args=[self.invalid_token])
        resp = self.client.post(url, {'password': 'invalid_password'})
        self.assertEqual(404, resp.status_code)
