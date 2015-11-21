# encoding: utf-8
import os

from django.core.urlresolvers import reverse
from django.test import TestCase
import requests

from seahub.share.models import FileShare
from seahub.test_utils import Fixtures


class SharedFileTest(TestCase, Fixtures):

    def setUp(self):
        share_file_info = {
            'username': self.user,
            'repo_id': self.repo.id,
            'path': self.file,
            'password': None,
            'expire_date': None,
        }
        self.fs = FileShare.objects.create_file_link(**share_file_info)

        share_file_info.update({'password': '12345678'})
        self.enc_fs = FileShare.objects.create_file_link(**share_file_info)
        share_file_info.update({'password': '12345678'})
        self.enc_fs2 = FileShare.objects.create_file_link(**share_file_info)

        assert self.enc_fs.token != self.enc_fs2.token

    def tearDown(self):
        self.remove_repo()

    def test_can_render(self):
        resp = self.client.get(reverse('view_shared_file', args=[self.fs.token]))
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'shared_file_view.html')

        self.assertContains(resp, os.path.basename(self.file))
        dl_url_tag = '<a href="?dl=1" class="obv-btn">'
        self.assertContains(resp, dl_url_tag)

    def test_can_download(self):
        dl_url = reverse('view_shared_file', args=[self.fs.token]) + '?dl=1'
        resp = self.client.get(dl_url)
        self.assertEqual(302, resp.status_code)
        assert '8082/files/' in resp.get('location')

    def test_dl_link_can_use_more_times(self):
        dl_url = reverse('view_shared_file', args=[self.fs.token]) + '?dl=1'
        resp = self.client.get(dl_url)
        self.assertEqual(302, resp.status_code)

        dl_link = resp.get('location')
        res = requests.get(dl_link)
        self.assertEqual(200, res.status_code)

        res = requests.get(dl_link)
        self.assertEqual(200, res.status_code)

    def test_can_view_raw(self):
        dl_url = reverse('view_shared_file', args=[self.fs.token]) + '?raw=1'
        resp = self.client.get(dl_url)
        self.assertEqual(302, resp.status_code)
        assert '8082/files/' in resp.get('location')

    def test_view_count(self):
        """Issue https://github.com/haiwen/seahub/issues/742
        """
        resp = self.client.get(reverse('view_shared_file', args=[self.fs.token]))
        self.assertEqual(200, resp.status_code)
        self.assertEqual(1, FileShare.objects.get(token=self.fs.token).view_cnt)

        dl_url = reverse('view_shared_file', args=[self.fs.token]) + '?raw=1'
        resp = self.client.get(dl_url)
        self.assertEqual(302, resp.status_code)
        self.assertEqual(2, FileShare.objects.get(token=self.fs.token).view_cnt)

        dl_url = reverse('view_shared_file', args=[self.fs.token]) + '?dl=1'
        resp = self.client.get(dl_url)
        self.assertEqual(302, resp.status_code)
        self.assertEqual(3, FileShare.objects.get(token=self.fs.token).view_cnt)

    def test_can_render_when_remove_parent_dir(self):
        """Issue https://github.com/haiwen/seafile/issues/1283
        """
        # create a file in a folder
        self.create_file(repo_id=self.repo.id,
                         parent_dir=self.folder,
                         filename='file.txt',
                         username=self.user.username)
        # share that file
        share_file_info = {
            'username': self.user.username,
            'repo_id': self.repo.id,
            'path': os.path.join(self.folder, 'file.txt'),
            'password': None,
            'expire_date': None,
        }
        fs = FileShare.objects.create_file_link(**share_file_info)
        resp = self.client.get(reverse('view_shared_file', args=[fs.token]))
        self.assertEqual(200, resp.status_code)

        # then delete parent folder, see whether it raises error
        self.remove_folder()
        resp = self.client.get(reverse('view_shared_file', args=[fs.token]))
        self.assertEqual(200, resp.status_code)

    def _assert_redirect_to_password_page(self, fs):
        resp = self.client.get(reverse('view_shared_file', args=[fs.token]))
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'share_access_validation.html')

    def _assert_render_file_page_when_input_passwd(self, fs):
        resp = self.client.post(reverse('view_shared_file', args=[fs.token]), {
            'password': '12345678',
        })
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'shared_file_view.html')
        self.assertContains(resp, os.path.basename(self.file))
        dl_url_tag = '<a href="?dl=1" class="obv-btn">'
        self.assertContains(resp, dl_url_tag)

    def _assert_render_file_page_without_passwd(self, fs):
        resp = self.client.get(reverse('view_shared_file', args=[fs.token]))
        self.assertEqual(200, resp.status_code)
        self.assertTemplateUsed(resp, 'shared_file_view.html')

    def test_can_view_enc(self):
        self._assert_redirect_to_password_page(self.enc_fs)
        self._assert_render_file_page_when_input_passwd(self.enc_fs)

    def test_can_view_enc_link_without_passwd(self):
        self._assert_redirect_to_password_page(self.enc_fs)
        self._assert_render_file_page_when_input_passwd(self.enc_fs)
        self._assert_render_file_page_without_passwd(self.enc_fs)

    def test_can_view_multiple_enc_links_without_passwd(self):
        # first shared link
        self._assert_redirect_to_password_page(self.enc_fs)
        self._assert_render_file_page_when_input_passwd(self.enc_fs)

        # second shared link
        self._assert_redirect_to_password_page(self.enc_fs2)
        self._assert_render_file_page_when_input_passwd(self.enc_fs2)

        self._assert_render_file_page_without_passwd(self.enc_fs)
        self._assert_render_file_page_without_passwd(self.enc_fs2)


class FileViaSharedDirTest(TestCase, Fixtures):
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


# class PrivateSharedFileTest(TestCase, Fixtures):
#     def setUp(self):
#         self.user2 = self.create_user('test2@test.com')
#         share_file_info = {
#             'from_user': self.user.username,
#             'to_user': self.user2.username,
#             'repo_id': self.repo.id,
#             'path': self.file,
#         }
#         self.fs = PrivateFileDirShare.objects.add_read_only_priv_file_share(
#             **share_file_info)

#     def tearDown(self):
#         self.remove_repo()
#         self.remove_user(self.user.username)
#         self.remove_user(self.user2.username)

#     def test_can_render(self):
#         self.client.post(
#             reverse('auth_login'), {'username': self.user2.username,
#                                     'password': 'secret'}
#         )

#         resp = self.client.get(
#             reverse('view_priv_shared_file', args=[self.fs.token])
#         )
#         self.assertEqual(200, resp.status_code)
#         self.assertTemplateUsed(resp, 'shared_file_view.html')
#         self.assertContains(resp, os.path.basename(self.file))

#         dl_url_tag = '<a href="?dl=1" class="obv-btn">'
#         self.assertContains(resp, dl_url_tag)

#     def test_can_download(self):
#         self.client.post(
#             reverse('auth_login'), {'username': self.user2.username,
#                                     'password': 'secret'}
#         )

#         dl_url = reverse('view_priv_shared_file', args=[self.fs.token]) + \
#             '?p=%s&dl=1' % self.file
#         resp = self.client.get(dl_url)
#         self.assertEqual(302, resp.status_code)
#         assert '8082/files/' in resp.get('location')
