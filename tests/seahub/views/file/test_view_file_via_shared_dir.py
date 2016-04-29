# encoding: utf-8
import os

from django.core.urlresolvers import reverse
from django.test import TestCase

from seahub.share.models import FileShare
from seahub.test_utils import Fixtures


class ViewFileViaSharedDirTest(TestCase, Fixtures):
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
            reverse('view_file_via_shared_dir', args=[self.fs.token]) + \
            '?p=%s' % self.file
        )
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'shared_file_view.html')

        self.assertContains(resp, os.path.basename(self.file))
        dl_url_tag = '<a href="?p=%s&dl=1" class="obv-btn">' % self.file
        self.assertContains(resp, dl_url_tag)

    def test_can_view_image_in_sub_dir(self):
        """View 3.jpg when share 'folder' will raise error.
        Issue https://github.com/haiwen/seafile/issues/1248
        .
        ├── 1.jpg
        ├── 2.jpc
        └── folder
            └── 3.jpg
        """

        # setup
        self.create_file(repo_id=self.repo.id,
                         parent_dir='/',
                         filename='1.jpg',
                         username='test@test.com')
        self.create_file(repo_id=self.repo.id,
                         parent_dir='/',
                         filename='2.jpg',
                         username='test@test.com')
        folder_path = self.folder
        self.create_file(repo_id=self.repo.id,
                         parent_dir=folder_path,
                         filename='3.jpg',
                         username='test@test.com')

        share_file_info = {
            'username': 'test@test.com',
            'repo_id': self.repo.id,
            'path': folder_path,
            'password': None,
            'expire_date': None,
        }
        fs = FileShare.objects.create_dir_link(**share_file_info)

        resp = self.client.get(
            reverse('view_file_via_shared_dir', args=[fs.token]) + \
            '?p=/3.jpg'
        )
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'shared_file_view.html')
        self.assertContains(resp, '3.jpg')

    def test_can_download(self):
        dl_url = reverse('view_file_via_shared_dir', args=[self.fs.token]) + \
            '?p=%s&dl=1' % self.file
        resp = self.client.get(dl_url)
        self.assertEqual(302, resp.status_code)
        assert '8082/files/' in resp.get('location')
