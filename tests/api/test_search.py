import json
import pytest
from mock import patch

from django.urls import reverse

from seahub.test_utils import BaseTestCase, TRAVIS

from seaserv import seafile_api


class SearchTest(BaseTestCase):
    def setUp(self):
        self.file_path = self.file
        self.repo_id = self.repo.id
        self.url = reverse('api_search')

        self.mock_total = 15
        self.mock_results = [
            {
                "repo_owner_name": "name",
                "repo_id": self.repo_id,
                "name": "lian.png",
                "repo_owner_contact_email": "freeplant@163.com",
                "repo_owner_email": "freeplant@163.com",
                "last_modified": 1469415777,
                "content_highlight": "",
                "fullpath": self.file_path,
                "repo_name": "seafile-design",
                "is_dir": False,
                "size": 142758,
                "repo": seafile_api.get_repo(self.repo_id)
            },
        ]

    @patch('seahub.api2.views.HAS_FILE_SEARCH', True)
    @patch('seahub.api2.views.search_files')
    @pytest.mark.skipif(TRAVIS, reason="")
    def test_can_search_file(self, mock_search_files):
        mock_search_files.return_value = self.mock_results, \
                self.mock_total

        self.login_as(self.user)
        resp = self.client.get(self.url + '?q=lian')
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)

        assert json_resp['total'] == self.mock_total
        assert json_resp['results'][0]['repo_id'] == self.mock_results[0]['repo_id']

    @patch('seahub.api2.views.HAS_FILE_SEARCH', True)
    def test_can_not_search_with_invalid_repo_permission(self):
        self.login_as(self.admin)
        resp = self.client.get(self.url + '?q=lian&search_repo=%s' %
                self.repo_id)
        self.assertEqual(403, resp.status_code)

    @patch('seahub.api2.views.HAS_FILE_SEARCH', True)
    def test_can_not_search_without_q_parameter(self):
        self.login_as(self.user)
        resp = self.client.get(self.url)
        self.assertEqual(400, resp.status_code)

    @patch('seahub.api2.views.HAS_FILE_SEARCH', True)
    @patch('seahub.api2.views.search_files')
    @pytest.mark.skipif(TRAVIS, reason="")
    def test_can_search_with_search_path(self, mock_search_files):
        mock_search_files.return_value = self.mock_results, \
                self.mock_total

        self.login_as(self.user)
        resp = self.client.get(self.url + '?q=lian&search_repo=%s&search_path=%s' % (self.repo_id, '/'))
        json_resp = json.loads(resp.content)
        print(json_resp)
        assert json_resp['total'] == self.mock_total
        assert json_resp['results'][0]['repo_id'] == self.mock_results[0]['repo_id']
