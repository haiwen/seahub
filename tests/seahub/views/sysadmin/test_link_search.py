from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase
from seahub.share.models import FileShare


class AdminSearchShareLinkText(BaseTestCase):

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

    def test_search_file_share_link_info_by_token(self):
        self.login_as(self.admin)
        token = self._add_file_share_link()

        url = reverse('sys_link_search') + '?token=' + token
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)
        self.assertEqual(token, resp.context['publinks'][0].token)

    def test_search_file_share_link_info_by_part_of_token(self):
        self.login_as(self.admin)
        token = self._add_file_share_link()

        url = reverse('sys_link_search') + '?token=' + token[:3]
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)
        tokens = []
        for t in resp.context['publinks']:
            tokens.append(t.token)
        assert token in tokens

    def test_search_file_share_link_info_by_invalid_token(self):
        self.login_as(self.admin)

        url = reverse('sys_link_search') + '?token=' + 'i am a invalid token'
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)
        self.assertEqual(0, len(resp.context['publinks']))

    def test_search_file_share_link_info_by_short_token(self):
        self.login_as(self.admin)

        url = reverse('sys_link_search') + '?token=' + 'i'
        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)
        self.assertEqual(0, len(resp.context['publinks']))
