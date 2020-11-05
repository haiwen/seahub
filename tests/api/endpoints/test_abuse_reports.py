# -*- coding: utf-8 -*-
import json

from mock import patch, MagicMock
from django.urls import reverse
from seahub.test_utils import BaseTestCase
from seahub.share.models import FileShare


class AbuseReportsTest(BaseTestCase):

    def setUp(self):
        self.repo_id = self.repo.id
        self.file_path = self.file
        self.folder_path = self.folder
        self.url = reverse('api-v2.1-abuse-reports')
        self.inner_file_path = self.create_file(
            repo_id=self.repo.id,
            parent_dir='/folder/',
            filename='inner.txt',
            username='test@test.com')

    def tearDown(self):
        self.remove_repo()

    def _add_file_share_link(self):
        fs = FileShare.objects.create_file_link(
            self.user.username, self.repo.id, self.file, None, None)

        return fs.token

    def _add_dir_share_link(self):
        fs = FileShare.objects.create_dir_link(
            self.user.username, self.repo.id, self.folder, None, None)

        return fs.token

    def _remove_share_link(self, token):
        link = FileShare.objects.get(token=token)
        link.delete()

    @patch('seahub.api2.endpoints.abuse_reports.ENABLE_SHARE_LINK_REPORT_ABUSE', MagicMock(return_value=True))
    def test_file_share_link_can_report(self):
        self.login_as(self.user)
        shared_token = self._add_file_share_link()

        data = {
            'share_link_token': shared_token,
            'abuse_type': 'copyright',
            'description': '',
            'reporter': '',
            'file_path': self.file_path,
        }

        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['handled'] is not None
        assert json_resp['id'] is not None
        assert json_resp['file_name'] is not None
        assert json_resp['repo_id'] is not None
        assert json_resp['repo_name'] is not None
        assert json_resp['time'] is not None

        assert data['file_path'] == json_resp['file_path']
        assert data['reporter'] == json_resp['reporter']
        assert data['description'] == json_resp['description']
        assert data['abuse_type'] == json_resp['abuse_type']

        self._remove_share_link(shared_token)

    @patch('seahub.api2.endpoints.abuse_reports.ENABLE_SHARE_LINK_REPORT_ABUSE', MagicMock(return_value=True))
    def test_dir_share_link_can_report(self):
        self.login_as(self.user)
        shared_token = self._add_file_share_link()

        data = {
            'share_link_token': shared_token,
            'abuse_type': 'copyright',
            'description': '',
            'reporter': '',
            'file_path': self.inner_file_path,
        }

        resp = self.client.post(self.url, data)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert json_resp['handled'] is not None
        assert json_resp['id'] is not None
        assert json_resp['file_name'] is not None
        assert json_resp['repo_id'] is not None
        assert json_resp['repo_name'] is not None
        assert json_resp['time'] is not None
        assert json_resp['file_path'] is not None

        assert data['reporter'] == json_resp['reporter']
        assert data['description'] == json_resp['description']
        assert data['abuse_type'] == json_resp['abuse_type']

        self._remove_share_link(shared_token)
