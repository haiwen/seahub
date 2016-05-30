import json

from django.core.urlresolvers import reverse

from seahub.share.models import FileShare
from seahub.test_utils import BaseTestCase


class AjaxGetDownloadLinkTest(BaseTestCase):
    def setUp(self):

        self.url = reverse('ajax_get_download_link')

        self.user_repo_id = self.repo.id
        self.user_dir_path = self.folder
        self.user_file_path = self.file

    def test_can_generate_file_share_link(self):
        self.login_as(self.user)

        url = self.url
        data = {
            'repo_id': self.user_repo_id,
            'p': self.user_file_path,
            'type': 'f',
        }
        resp = self.client.post(url, data, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        json_resp = json.loads(resp.content)
        assert '/f/' in json_resp['download_link']

    def test_can_generate_dir_share_link(self):
        self.login_as(self.user)

        url = self.url
        data = {
            'repo_id': self.user_repo_id,
            'p': self.user_dir_path,
            'type': 'd',
        }
        resp = self.client.post(url, data, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        json_resp = json.loads(resp.content)
        assert '/d/' in json_resp['download_link']

    def test_can_get_file_share_link(self):
        fs = FileShare.objects.create_file_link(self.user.username,
                self.user_repo_id, self.user_file_path)

        self.login_as(self.user)

        args = '?repo_id=%s&p=%s&type=%s' % (self.user_repo_id, self.user_file_path, 'f')
        url = self.url + args
        resp = self.client.get(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        json_resp = json.loads(resp.content)
        assert fs.token in json_resp['download_link']

    def test_can_get_dir_share_link(self):
        fs = FileShare.objects.create_dir_link(self.user.username,
                self.user_repo_id, self.user_dir_path)

        self.login_as(self.user)

        args = '?repo_id=%s&p=%s&type=%s' % (self.user_repo_id, self.user_dir_path, 'd')
        url = self.url + args
        resp = self.client.get(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        json_resp = json.loads(resp.content)
        assert fs.token in json_resp['download_link']

    def test_can_not_get_if_not_login(self):
        args = '?repo_id=%s&p=%s&type=%s' % (self.user_repo_id, self.user_file_path, 'f')
        url = self.url + args
        resp = self.client.get(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(401, resp.status_code)

    def test_invalid_args(self):
        self.login_as(self.user)

        # invalid type
        args = '?repo_id=%s&p=%s&type=%s' % (self.user_repo_id, self.user_file_path, 'invalid_type')
        url = self.url + args
        resp = self.client.get(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(400, resp.status_code)

        # invalid repo_id
        args = '?invalid_repo_id=%s&p=%s&type=%s' % (self.user_repo_id, self.user_file_path, 'f')
        url = self.url + args
        resp = self.client.get(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(400, resp.status_code)

        # invalid path
        args = '?repo_id=%s&invalid_path=%s&type=%s' % (self.user_repo_id, self.user_file_path, 'f')
        url = self.url + args
        resp = self.client.get(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(400, resp.status_code)

    def test_invalid_recourse(self):
        self.login_as(self.user)

        # invalid repo_id
        args = '?repo_id=%s&p=%s&type=%s' % ('invalid repo id', self.user_file_path, 'f')
        url = self.url + args
        resp = self.client.get(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(500, resp.status_code)

        # invalid repo_id
        args = '?repo_id=%s&p=%s&type=%s' % (self.user_repo_id[:30] + '123456', self.user_file_path, 'f')
        url = self.url + args
        resp = self.client.get(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(404, resp.status_code)

        # invalid path
        args = '?repo_id=%s&p=%s&type=%s' % (self.user_repo_id, 'invalid path', 'f')
        url = self.url + args
        resp = self.client.get(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(404, resp.status_code)

    def test_invalid_permission(self):
        self.login_as(self.admin)

        args = '?repo_id=%s&p=%s&type=%s' % (self.user_repo_id, self.user_file_path, 'f')
        url = self.url + args
        resp = self.client.get(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(403, resp.status_code)
