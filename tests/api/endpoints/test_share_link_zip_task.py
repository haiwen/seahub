# -*- coding: utf-8 -*-
import json
from mock import patch

from django.core.urlresolvers import reverse

from seahub.test_utils import BaseTestCase
from seahub.share.models import FileShare

class ShareLinkZipTaskViewTest(BaseTestCase):

    def _add_dir_share_link(self):
        fs = FileShare.objects.create_dir_link(self.user.username,
                self.repo.id, self.folder, None, None)

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

    @patch('seahub.api2.endpoints.share_link_zip_task.settings.ENABLE_SHARE_LINK_AUDIT')
    @patch('seahub.api2.endpoints.share_link_zip_task.is_pro_version')
    def test_get_zip_token_with_unauthenticated_user(self,
            mock_is_pro_version, mock_enable_share_link_audit):

        mock_is_pro_version.return_value = True
        mock_enable_share_link_audit = True

        share_link_token = self._add_dir_share_link()

        url = self.url + '?share_link_token=%s&path=/' % share_link_token

        # user neither login in nor passed code check
        resp = self.client.get(url)
        self.assertEqual(403, resp.status_code)

    @patch('seahub.api2.endpoints.share_link_zip_task.settings.ENABLE_SHARE_LINK_AUDIT')
    @patch('seahub.api2.endpoints.share_link_zip_task.is_pro_version')
    def test_get_zip_token_with_authenticated_user(self,
            mock_is_pro_version, mock_enable_share_link_audit):

        mock_is_pro_version.return_value = True
        mock_enable_share_link_audit = True

        share_link_token = self._add_dir_share_link()

        # user login in
        self.login_as(self.admin)
        url = self.url + '?share_link_token=%s&path=/' % share_link_token

        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp['zip_token']) == 36

    @patch('seahub.api2.endpoints.share_link_zip_task.settings.ENABLE_SHARE_LINK_AUDIT')
    @patch('seahub.api2.endpoints.share_link_zip_task.is_pro_version')
    def test_get_zip_token_with_anonymous_user_passed_code_check(self,
            mock_is_pro_version, mock_enable_share_link_audit):

        mock_is_pro_version.return_value = True
        mock_enable_share_link_audit = True

        share_link_token = self._add_dir_share_link()

        url = self.url + '?share_link_token=%s&path=/' % share_link_token

        # user pass code check
        session = self.client.session
        session['anonymous_email'] = 'anonymous@email.com'
        session.save()

        resp = self.client.get(url)
        self.assertEqual(200, resp.status_code)

        json_resp = json.loads(resp.content)
        assert len(json_resp['zip_token']) == 36
