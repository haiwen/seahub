import os
from django.core.urlresolvers import reverse
from django.test import TestCase

from seaserv import seafile_api

from seahub.share.models import FileShare
from seahub.test_utils import Fixtures

class RawSharedFileTest(TestCase, Fixtures):
    def setUp(self):
        share_file_info = {
            'username': 'test@test.com',
            'repo_id': self.repo.id,
            'path': '/',
            'password': None,
            'expire_date': None,
        }

        self.fs = FileShare.objects.create_dir_link(**share_file_info)
        self.file_id = seafile_api.get_file_id_by_path(self.repo.id, self.file)
        self.filename= os.path.basename(self.file)

    def tearDown(self):
        self.remove_repo()

    def test_can_get_fileserver_url(self):
        resp = self.client.get(
            reverse('view_raw_shared_file', args=[self.fs.token,
                self.file_id, self.filename])
        )

        self.assertEqual(302, resp.status_code)
        self.assertRegexpMatches(resp['Location'],
                                 r'http(.*)/files/[-0-9a-f]{36}/%s' % self.filename)

class EncryptRawSharedFileTest(TestCase, Fixtures):
    def setUp(self):
        share_file_info = {
            'username': 'test@test.com',
            'repo_id': self.repo.id,
            'path': '/',
            'password': '12345678',
            'expire_date': None,
        }

        self.fs = FileShare.objects.create_dir_link(**share_file_info)
        self.file_id = seafile_api.get_file_id_by_path(self.repo.id, self.file)
        self.filename= os.path.basename(self.file)

    def tearDown(self):
        self.remove_repo()

    def test_can_decrypt(self):
        resp = self.client.post(
            reverse('view_raw_shared_file', args=[self.fs.token,
                self.file_id, self.filename]), {'password': '12345678'}
        )
        self.assertEqual(302, resp.status_code)
        self.assertRegexpMatches(resp['Location'],
                                 r'http(.*)/files/[-0-9a-f]{36}/%s' % self.filename)

    def test_wrong_password(self):
        resp = self.client.post(
            reverse('view_raw_shared_file', args=[self.fs.token,
                self.file_id, self.filename]), {'password': '1234567'}
        )

        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'share_access_validation.html')
        self.assertContains(resp, 'Please enter a correct password')

    def test_no_password(self):
        resp = self.client.get(
            reverse('view_raw_shared_file', args=[self.fs.token,
                self.file_id, self.filename])
        )

        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'share_access_validation.html')

        resp = self.client.post(
            reverse('view_raw_shared_file', args=[self.fs.token,
                self.file_id, self.filename])
        )

        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'share_access_validation.html')
