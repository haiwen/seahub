import json

from django.core.urlresolvers import reverse

from seahub.share.models import UploadLinkShare
from seahub.test_utils import BaseTestCase


class AjaxGetUploadLinkTest(BaseTestCase):
    def setUp(self):
        self.url = reverse('ajax_get_upload_link')

        self.user_repo_id = self.repo.id
        self.user_dir_path = self.folder
        self.user_file_path = self.file

    def test_can_generate(self):
        self.login_as(self.user)

        url = self.url
        data = {
            'repo_id': self.user_repo_id,
            'p': self.user_dir_path,
        }
        resp = self.client.post(url, data, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        json_resp = json.loads(resp.content)
        assert '/u/d/' in json_resp['upload_link']

    def test_can_get(self):
        upload_link = UploadLinkShare.objects.create_upload_link_share(
            self.user.username, self.user_repo_id, self.user_dir_path)

        self.login_as(self.user)

        args = '?repo_id=%s&p=%s' % (self.user_repo_id, self.user_dir_path)
        url = self.url + args
        resp = self.client.get(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        json_resp = json.loads(resp.content)
        assert upload_link.token in json_resp['upload_link']

    def test_unlogin_user(self):
        args = '?repo_id=%s&p=%s' % (self.user_repo_id, self.user_dir_path)
        url = self.url + args
        resp = self.client.get(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(401, resp.status_code)

    def test_invalid_args(self):
        self.login_as(self.user)

        # invalid repo_id
        args = '?invalid_repo_id=%s&p=%s' % (self.user_repo_id, self.user_dir_path)
        url = self.url + args
        resp = self.client.get(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(400, resp.status_code)

        # invalid path
        args = '?repo_id=%s&invalid_path=%s' % (self.user_repo_id, self.user_dir_path)
        url = self.url + args
        resp = self.client.get(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(400, resp.status_code)

    def test_invalid_recourse(self):
        self.login_as(self.user)

        # invalid repo_id
        args = '?repo_id=%s&p=%s' % ('invalid repo id', self.user_dir_path)
        url = self.url + args
        resp = self.client.get(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(500, resp.status_code)

        # invalid repo_id
        args = '?repo_id=%s&p=%s' % (self.user_repo_id[:30] + '123456', self.user_dir_path)
        url = self.url + args
        resp = self.client.get(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(404, resp.status_code)

        # invalid path
        args = '?repo_id=%s&p=%s' % (self.user_repo_id, 'invalid path')
        url = self.url + args
        resp = self.client.get(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(404, resp.status_code)

    def test_invalid_permission(self):
        self.login_as(self.admin)

        args = '?repo_id=%s&p=%s' % (self.user_repo_id, self.user_dir_path)
        url = self.url + args
        resp = self.client.get(url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(403, resp.status_code)
