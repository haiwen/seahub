from django.conf import settings
from django.urls import reverse

from seahub.test_utils import BaseTestCase

class DirDownloadTest(BaseTestCase):
    def setUp(self):
        self.folder_path = self.folder
        self.user2 = self.create_user('test2@test.com')

    def tearDown(self):
        self.remove_repo()
        self.remove_user(self.user.username)
        self.remove_user(self.user2.username)

    def test_can_download(self):
        self.login_as(self.user)

        dl_url = reverse('repo_download_dir', args=[self.repo.id]) + \
                 '?p=' + self.folder_path
        resp = self.client.get(dl_url)
        self.assertEqual(302, resp.status_code)
        assert '8082/files/' in resp.get('location')

    def test_can_download_root(self):
        self.login_as(self.user)

        dl_url = reverse('repo_download_dir', args=[self.repo.id])
        resp = self.client.get(dl_url)
        self.assertEqual(302, resp.status_code)
        assert '8082/files/' in resp.get('location')

    def test_permission_error(self):
        self.login_as(self.user2)

        dl_url = reverse('repo_download_dir', args=[self.repo.id]) + \
                 '?p=' + self.folder_path
        resp = self.client.get(dl_url)
        self.assertEqual(200, resp.status_code)
        self.assertContains(resp, 'Unable to download')

    # def test_size_exceeds_limit(self):
    #     old_size_limit = getattr(settings, 'MAX_DOWNLOAD_DIR_SIZE')
    #     settings.MAX_DOWNLOAD_DIR_SIZE = -1

    #     self.client.post(
    #         reverse('auth_login'), {'username': self.user2.username,
    #                                 'password': 'secret'}
    #     )
    #     dl_url = reverse('repo_download_dir', args=[self.repo.id]) + \
    #              '?p=' + self.folder_path
    #     resp = self.client.get(dl_url)
    #     self.assertEqual(200, resp.status_code)
    #     self.assertContains(resp, 'Unable to download directory')

    #     # restore settings
    #     settings.MAX_DOWNLOAD_DIR_SIZE = old_size_limit
