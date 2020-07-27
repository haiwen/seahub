import json
from mock import patch
from django.urls import reverse
from django.test import override_settings

from seahub.share.models import UploadLinkShare
from seahub.utils import normalize_dir_path
from seahub.test_utils import BaseTestCase


class GetFileUploadUrlULTest(BaseTestCase):
    def setUp(self):
        upload_link = UploadLinkShare.objects.create_upload_link_share(
            self.user.username, self.repo.id, self.folder, None, None)

        self.obj_id = json.dumps({'parent_dir': normalize_dir_path(self.folder)})

        self.url = reverse('get_file_upload_url_ul', args=[
            upload_link.token]) + '?r=' + self.repo.id

    def _get_fileserver_access_token(self, repo_id, obj_id, op, username,
                                     use_onetime=True, *args, **kwargs):
        return 'test_token'

    @patch('seahub.views.ajax.seafile_api.get_fileserver_access_token')
    def test_can_get_with_login_user(self, mock_get_fileserver_access_token):
        mock_get_fileserver_access_token.return_value = True
        mock_get_fileserver_access_token.side_effect = self._get_fileserver_access_token

        self.login_as(self.user)
        resp = self.client.get(self.url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        mock_get_fileserver_access_token.assert_called_with(
            self.repo.id, self.obj_id,
            'upload-link', self.user.username, use_onetime=False)
        json_resp = json.loads(resp.content)
        assert 'test_token' in json_resp['url']

    @patch('seahub.views.ajax.seafile_api.get_fileserver_access_token')
    def test_can_get_with_unlogin_user(self, mock_get_fileserver_access_token):
        mock_get_fileserver_access_token.return_value = True
        mock_get_fileserver_access_token.side_effect = self._get_fileserver_access_token

        resp = self.client.get(self.url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        mock_get_fileserver_access_token.assert_called_with(
            self.repo.id, self.obj_id,
            'upload-link', self.user.username, use_onetime=False)
        json_resp = json.loads(resp.content)
        assert 'test_token' in json_resp['url']

    @patch('seahub.views.ajax.seafile_api.get_fileserver_access_token')
    def test_can_get_with_anonymous_email_in_session(self, mock_get_fileserver_access_token):
        mock_get_fileserver_access_token.return_value = True
        mock_get_fileserver_access_token.side_effect = self._get_fileserver_access_token

        session = self.client.session
        session['anonymous_email'] = 'anonymous@email.com'
        session.save()
        resp = self.client.get(self.url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        mock_get_fileserver_access_token.assert_called_with(
            self.repo.id, self.obj_id,
            'upload-link', self.user.username, use_onetime=False)
        json_resp = json.loads(resp.content)
        assert 'test_token' in json_resp['url']

    @override_settings(ENABLE_UPLOAD_LINK_VIRUS_CHECK=True)
    @patch('seahub.views.ajax.seafile_api.get_fileserver_access_token')
    @patch('seahub.views.ajax.is_pro_version')
    def test_can_get_when_virus_check_enabled(self, mock_is_pro_version, mock_get_fileserver_access_token):
        mock_is_pro_version.return_value = True
        mock_get_fileserver_access_token.return_value = True
        mock_get_fileserver_access_token.side_effect = self._get_fileserver_access_token

        resp = self.client.get(self.url, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        mock_get_fileserver_access_token.assert_called_with(
            self.repo.id, self.obj_id,
            'upload-link', self.user.username, use_onetime=False, check_virus=True)
        json_resp = json.loads(resp.content)
        assert 'test_token' in json_resp['url']
