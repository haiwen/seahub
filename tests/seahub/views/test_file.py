from django.core.urlresolvers import reverse
from django.test import TestCase

from seahub.share.models import FileShare, PrivateFileDirShare
from seahub.test_utils import Fixtures


class SharedFileTest(TestCase, Fixtures):

    def setUp(self):
        share_file_info = {
            'username': 'test@test.com',
            'repo_id': self.repo.id,
            'path': self.file,
            'password': None,
            'expire_date': None,
        }
        self.fs = FileShare.objects.create_file_link(**share_file_info)

    def tearDown(self):
        self.remove_repo()

    def test_can_render(self):
        resp = self.client.get(reverse('view_shared_file', args=[self.fs.token]))
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'shared_file_view.html')
        self.assertContains(resp, self.file)

        dl_url_param = '?p=%s&dl=1' % self.file
        self.assertContains(resp, dl_url_param)

    def test_can_download(self):
        dl_url = reverse('view_shared_file', args=[self.fs.token]) + \
                 '?p=%s&dl=1' % self.file
        resp = self.client.get(dl_url)
        self.assertEqual(302, resp.status_code)
        assert '8082/files/' in resp.get('location')

    def test_can_view_raw(self):
        dl_url = reverse('view_shared_file', args=[self.fs.token]) + \
                 '?p=%s&raw=1' % self.file
        resp = self.client.get(dl_url)
        self.assertEqual(302, resp.status_code)
        assert '8082/files/' in resp.get('location')


class FileViaSharedDirTest(TestCase, Fixtures):
    def setUp(self):
        share_file_info = {
            'username': 'test@test.com',
            'repo_id': self.repo.id,
            'path': '/',
            'password': None,
            'expire_date': None,
        }
        self.fs = FileShare.objects.create_file_link(**share_file_info)

    def tearDown(self):
        self.remove_repo()

    def test_can_render(self):
        resp = self.client.get(
            reverse('view_file_via_shared_dir', args=[self.fs.token]) + \
            '?p=%s' % self.file
        )
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'shared_file_view.html')
        self.assertContains(resp, self.file)

        dl_url_param = '?p=%s&dl=1' % self.file
        self.assertContains(resp, dl_url_param)

    def test_can_download(self):
        dl_url = reverse('view_file_via_shared_dir', args=[self.fs.token]) + \
            '?p=%s&dl=1' % self.file
        resp = self.client.get(dl_url)
        self.assertEqual(302, resp.status_code)
        assert '8082/files/' in resp.get('location')


class PrivateSharedFileTest(TestCase, Fixtures):
    def setUp(self):
        self.user2 = self.create_user('test2@test.com')
        share_file_info = {
            'from_user': self.user.username,
            'to_user': self.user2.username,
            'repo_id': self.repo.id,
            'path': self.file,
        }
        self.fs = PrivateFileDirShare.objects.add_read_only_priv_file_share(
            **share_file_info)

    def tearDown(self):
        self.remove_repo()
        self.remove_user(self.user.username)
        self.remove_user(self.user2.username)

    def test_can_render(self):
        self.client.post(
            reverse('auth_login'), {'username': self.user2.username,
                                    'password': 'secret'}
        )

        resp = self.client.get(
            reverse('view_priv_shared_file', args=[self.fs.token])
        )
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'shared_file_view.html')
        self.assertContains(resp, self.file)

        dl_url_param = '?p=%s&dl=1' % self.file
        self.assertContains(resp, dl_url_param)

    def test_can_download(self):
        self.client.post(
            reverse('auth_login'), {'username': self.user2.username,
                                    'password': 'secret'}
        )

        dl_url = reverse('view_priv_shared_file', args=[self.fs.token]) + \
            '?p=%s&dl=1' % self.file
        resp = self.client.get(dl_url)
        self.assertEqual(302, resp.status_code)
        assert '8082/files/' in resp.get('location')
