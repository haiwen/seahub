import os
from django.urls import reverse
from django.test import TestCase
from seaserv import seafile_api

from seahub.share.models import FileShare, UploadLinkShare
from seahub.test_utils import Fixtures

class SharedDirTest(TestCase, Fixtures):
    def setUp(self):
        share_file_info = {
            'username': 'test@test.com',
            'repo_id': self.repo.id,
            'path': '/',
            'password': None,
            'expire_date': None,
        }
        self.fs = FileShare.objects.create_dir_link(**share_file_info)

    def tearDown(self):
        self.remove_repo()

    def test_can_render(self):
        resp = self.client.get(
            reverse('view_shared_dir', args=[self.fs.token])
        )
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'view_shared_dir_react.html')

    def test_cannot_render_enc_repo(self):
        share_file_info = {
            'username': 'test@test.com',
            'repo_id': self.enc_repo.id,
            'path': '/',
            'password': None,
            'expire_date': None,
        }
        fs = FileShare.objects.create_dir_link(**share_file_info)
        resp = self.client.get(
            reverse('view_shared_dir', args=[fs.token])
        )
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'error.html')

    def test_view_raw_file_via_shared_dir(self):
        resp = self.client.get(
            reverse('view_file_via_shared_dir', args=[self.fs.token]) + '?p=' + self.file + '&raw=1'
        )

        assert '8082' in resp['location']

class SharedUploadLinkTest(TestCase, Fixtures):
    def setUp(self):
        seafile_api.share_repo(
            self.repo.id, self.user.username, self.admin.username, 'rw')
        self.upload_link = UploadLinkShare.objects.create_upload_link_share(
            self.admin.username, self.repo.id, self.folder)
        seafile_api.remove_share(
            self.repo.id, self.user.username, self.admin.username)

    def tearDown(self):
        self.remove_repo()

    def test_returns_permission_denied_when_creator_loses_library_access(self):
        response = self.client.get(
            reverse('view_shared_upload_link', args=[self.upload_link.token]))

        self.assertEqual(200, response.status_code)
        self.assertTemplateUsed(response, 'error.html')
        self.assertContains(response, 'Permission denied')


class EncryptSharedDirTest(TestCase, Fixtures):
    def setUp(self):
        share_file_info = {
            'username': 'test@test.com',
            'repo_id': self.repo.id,
            'path': '/',
            'password': '12345678',
            'expire_date': None,
        }
        self.fs = FileShare.objects.create_dir_link(**share_file_info)

        self.sub_dir = self.folder
        self.sub_file = self.file
        self.filename= os.path.basename(self.file)

    def tearDown(self):
        self.remove_repo()

    def test_can_render(self):
        resp = self.client.get(
            reverse('view_shared_dir', args=[self.fs.token])
        )
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'share_access_validation.html')
        self.assertContains(resp, 'Please input the password')

    def test_can_decrypt(self):
        resp = self.client.post(
            reverse('view_shared_dir', args=[self.fs.token]), {
                'password': '12345678'
            }
        )

        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'view_shared_dir_react.html')

    def test_wrong_password(self):
        resp = self.client.post(
            reverse('view_shared_dir', args=[self.fs.token]), {
                'password': '1234567'
            }
        )

        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'share_access_validation.html')
        self.assertContains(resp, 'Please enter a correct password')

    def test_can_visit_sub_dir_without_passwd(self):
        resp = self.client.post(
            reverse('view_shared_dir', args=[self.fs.token]), {
                'password': '12345678'
            }
        )

        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'view_shared_dir_react.html')

        resp = self.client.get(
            reverse('view_shared_dir', args=[self.fs.token]) + '?p=' + self.sub_dir
        )
        self.assertEqual(200, resp.status_code)
        self.assertTemplateNotUsed(resp, 'share_access_validation.html')
        self.assertTemplateUsed(resp, 'view_shared_dir_react.html')

    def test_view_file_via_shared_dir(self):
        resp = self.client.post(
            reverse('view_file_via_shared_dir', args=[self.fs.token]) + '?p=' + self.sub_file, {
                'password': '12345678'
            }
        )

        self.assertEqual(200, resp.status_code)
        self.assertTemplateNotUsed(resp, 'share_access_validation.html')
        self.assertTemplateUsed(resp, 'shared_file_view_react.html')

        resp = self.client.get(
            reverse('view_file_via_shared_dir', args=[self.fs.token]) + '?p=' + self.sub_file
        )
        self.assertEqual(200, resp.status_code)
        self.assertTemplateNotUsed(resp, 'share_access_validation.html')
        self.assertTemplateUsed(resp, 'shared_file_view_react.html')

    def test_view_raw_file_via_shared_dir(self):
        resp = self.client.post(
            reverse('view_file_via_shared_dir', args=[self.fs.token]) + '?p=' + self.sub_file, {
                'password': '12345678'
            }
        )

        self.assertEqual(200, resp.status_code)
        self.assertTemplateNotUsed(resp, 'share_access_validation.html')
        self.assertTemplateUsed(resp, 'shared_file_view_react.html')

        resp = self.client.get(
            reverse('view_file_via_shared_dir', args=[self.fs.token]) + '?p=' + self.sub_file + '&raw=1'
        )

        assert '8082' in resp['location']

    def test_view_file_via_shared_dir_without_password(self):
        resp = self.client.get(
            reverse('view_file_via_shared_dir', args=[self.fs.token]) + '?p=' + self.sub_file
        )
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'share_access_validation.html')

        resp = self.client.post(
            reverse('view_file_via_shared_dir', args=[self.fs.token]) + '?p=' + self.sub_file)

        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'share_access_validation.html')

    def test_view_file_via_shared_dir_with_wrong_password(self):
        resp = self.client.post(
            reverse('view_file_via_shared_dir', args=[self.fs.token]) + '?p=' + self.sub_file, {
                'password': '1234567'
            }
        )

        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'share_access_validation.html')
        self.assertContains(resp, 'Please enter a correct password')
