# Copyright (c) 2012-2016 Seafile Ltd.
from unittest.mock import Mock, patch

import pytest

pytestmark = pytest.mark.django_db

from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse

from seahub.base.accounts import User
from seahub.wopi.utils import generate_access_token_cache_key

WOPI_FILE_ID = '69c05498eeb40695adb2bb8dee4af5bf4f4f0f7a'


class WOPIEditPermissionTest(TestCase):
    """A token minted for a read-only session must not modify the file."""

    def setUp(self):
        self.user = User.objects.create_user('wopi-test@example.com', 'secret')

    def tearDown(self):
        try:
            User.objects.get('wopi-test@example.com').delete()
        except User.DoesNotExist:
            pass

    def _token(self, can_edit):
        token = 'test-wopi-token-%s' % can_edit
        cache.set(generate_access_token_cache_key(token), {
            'request_user': self.user.username,
            'repo_id': 'fake-repo-id',
            'file_path': '/test.docx',
            'obj_id': 'fake-obj-id',
            'can_edit': can_edit,
            'can_download': True,
        }, 300)
        return token

    def _files_url(self, token):
        return reverse('WOPIFilesView', args=[WOPI_FILE_ID]) + '?access_token=' + token

    def _contents_url(self, token):
        return reverse('WOPIFilesContentsView', args=[WOPI_FILE_ID]) + '?access_token=' + token

    @patch('seahub.wopi.views.seafile_api')
    def test_put_file_denied_for_read_only_token(self, mock_api):
        mock_api.get_repo.return_value = Mock(is_virtual=False)
        token = self._token(can_edit=False)

        resp = self.client.post(self._contents_url(token), data=b'x',
                                content_type='application/octet-stream')

        assert resp.status_code == 403
        mock_api.get_fileserver_access_token.assert_not_called()

    @patch('seahub.wopi.views.seafile_api')
    def test_lock_denied_for_read_only_token(self, mock_api):
        mock_api.get_repo.return_value = Mock(is_virtual=False)
        token = self._token(can_edit=False)

        resp = self.client.post(self._files_url(token), HTTP_X_WOPI_OVERRIDE='LOCK',
                                HTTP_X_WOPI_LOCK='lock-id')

        assert resp.status_code == 403

    @patch('seahub.wopi.views.seafile_api')
    def test_refresh_lock_denied_for_read_only_token(self, mock_api):
        mock_api.get_repo.return_value = Mock(is_virtual=False)
        token = self._token(can_edit=False)

        resp = self.client.post(self._files_url(token), HTTP_X_WOPI_OVERRIDE='REFRESH_LOCK',
                                HTTP_X_WOPI_LOCK='lock-id')

        assert resp.status_code == 403

    @patch('seahub.wopi.views.seafile_api')
    def test_unlock_denied_for_read_only_token(self, mock_api):
        mock_api.get_repo.return_value = Mock(is_virtual=False)
        token = self._token(can_edit=False)

        resp = self.client.post(self._files_url(token), HTTP_X_WOPI_OVERRIDE='UNLOCK',
                                HTTP_X_WOPI_LOCK='lock-id')

        assert resp.status_code == 403

    @patch('seahub.wopi.views.seafile_api')
    def test_get_lock_allowed_for_read_only_token(self, mock_api):
        mock_api.get_repo.return_value = Mock(is_virtual=False)
        token = self._token(can_edit=False)

        resp = self.client.post(self._files_url(token), HTTP_X_WOPI_OVERRIDE='GET_LOCK')

        assert resp.status_code == 200
        assert resp['X-WOPI-Lock'] == ''

    @patch('seahub.wopi.views.requests')
    @patch('seahub.wopi.views.seafile_api')
    def test_put_file_allowed_for_edit_token(self, mock_api, mock_requests):
        mock_api.get_repo.return_value = Mock(is_virtual=False)
        mock_api.get_fileserver_access_token.return_value = 'fileserver-token'
        mock_requests.post.return_value.status_code = 200
        token = self._token(can_edit=True)

        resp = self.client.post(self._contents_url(token), data=b'x',
                                content_type='application/octet-stream')

        assert resp.status_code == 200
        mock_api.get_fileserver_access_token.assert_called_once()
