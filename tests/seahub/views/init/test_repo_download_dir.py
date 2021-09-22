from django.urls import reverse

from seahub.test_utils import BaseTestCase

class RepoDownloadDirTest(BaseTestCase):
    def setUp(self):
        self.login_as(self.user)

    def test_can_render(self):
        resp = self.client.get(reverse('repo_download_dir', args=[self.repo.id]) + '?p=' + self.folder)

        self.assertEqual(302, resp.status_code)
        assert '8082' in resp.headers['location']
