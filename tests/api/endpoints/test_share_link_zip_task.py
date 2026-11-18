# -*- coding: utf-8 -*-
import json
from mock import patch

from django.urls import reverse

from seahub.test_utils import BaseTestCase
from seahub.share.models import FileShare

class ShareLinkZipTaskViewTest(BaseTestCase):

    def _add_dir_share_link(self, permission=FileShare.PERM_VIEW_DL):
        fs = FileShare.objects.create_dir_link(self.user.username,
                self.repo.id, self.folder, None, None, permission)

        return fs.token

    def setUp(self):
        self.url = reverse('api-v2.1-share-link-zip-task')

    def tearDown(self):
        self.remove_repo()

    def test_can_get_share_link_zip_task(self):

        share_link_token = self._add_dir_share_link()

        url = self.url + '?share_link_token=%s&path=/' % share_link_token

        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp['zip_token']) == 36

    def test_cannot_get_zip_task_from_view_only_share_link(self):
        share_link_token = self._add_dir_share_link(FileShare.PERM_VIEW_ONLY)
        url = self.url + '?share_link_token=%s&path=/' % share_link_token

        with patch('seahub.api2.endpoints.share_link_zip_task.seafile_api.get_fileserver_access_token') as get_token:
            resp = self.client.get(url)

        self.assertEqual(403, resp.status_code)
        get_token.assert_not_called()

    def test_cannot_get_zip_task_when_login_required(self):
        share_link_token = self._add_dir_share_link()
        url = self.url + '?share_link_token=%s&path=/' % share_link_token

        with patch('seahub.api2.endpoints.share_link_zip_task.SHARE_LINK_LOGIN_REQUIRED', True), \
                patch('seahub.api2.endpoints.share_link_zip_task.seafile_api.get_fileserver_access_token') as get_token:
            resp = self.client.get(url)

        self.assertEqual(403, resp.status_code)
        get_token.assert_not_called()
