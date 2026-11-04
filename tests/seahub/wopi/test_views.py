# Copyright (c) 2012-2016 Seafile Ltd.
from unittest.mock import Mock, patch
from uuid import uuid4

import pytest

pytestmark = pytest.mark.django_db

from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse

from seahub.base.accounts import User
from seahub.wopi.utils import generate_access_token_cache_key

WOPI_FILE_ID = '69c05498eeb40695adb2bb8dee4af5bf4f4f0f7a'


class WOPIBaseTest(TestCase):

    def setUp(self):
        self.user = User.objects.create_user('wopi-test@example.com', 'secret')
        # a unique repo id per test keeps the WOPI lock cache keys isolated
        self.repo_id = 'test-repo-%s' % uuid4().hex

    def tearDown(self):
        try:
            User.objects.get('wopi-test@example.com').delete()
        except User.DoesNotExist:
            pass

    def _token(self, can_edit=True):
        token = 'test-wopi-token-%s' % uuid4().hex
        cache.set(generate_access_token_cache_key(token), {
            'request_user': self.user.username,
            'repo_id': self.repo_id,
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

    def _lock(self, token, lock_id):
        return self.client.post(self._files_url(token), HTTP_X_WOPI_OVERRIDE='LOCK',
                                HTTP_X_WOPI_LOCK=lock_id)

    def _put(self, token, lock_id=None):
        extra = {}
        if lock_id is not None:
            extra['HTTP_X_WOPI_LOCK'] = lock_id
        return self.client.post(self._contents_url(token), data=b'x',
                                content_type='application/octet-stream', **extra)


class WOPIEditPermissionTest(WOPIBaseTest):
    """A token minted for a read-only session must not modify the file."""

    @patch('seahub.wopi.views.seafile_api')
    def test_put_file_denied_for_read_only_token(self, mock_api):
        mock_api.get_repo.return_value = Mock(is_virtual=False)
        token = self._token(can_edit=False)

        resp = self._put(token)

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

        resp = self._put(token)

        assert resp.status_code == 200
        mock_api.get_fileserver_access_token.assert_called_once()


class WOPIPutFileLockTest(WOPIBaseTest):
    """PutFile must honour the lock held by another WOPI session."""

    @patch('seahub.wopi.views.seafile_api')
    def test_put_file_denied_with_mismatched_lock(self, mock_api):
        mock_api.get_repo.return_value = Mock(is_virtual=False)
        token = self._token()
        assert self._lock(token, 'lock-aaa').status_code == 200

        resp = self._put(token, lock_id='lock-bbb')

        assert resp.status_code == 409
        assert resp['X-WOPI-Lock'] == 'lock-aaa'
        mock_api.get_fileserver_access_token.assert_not_called()

    @patch('seahub.wopi.views.seafile_api')
    def test_put_file_denied_without_lock_header(self, mock_api):
        mock_api.get_repo.return_value = Mock(is_virtual=False)
        token = self._token()
        assert self._lock(token, 'lock-aaa').status_code == 200

        resp = self._put(token)

        assert resp.status_code == 409
        assert resp['X-WOPI-Lock'] == 'lock-aaa'
        mock_api.get_fileserver_access_token.assert_not_called()

    @patch('seahub.wopi.views.requests')
    @patch('seahub.wopi.views.seafile_api')
    def test_put_file_allowed_with_matching_lock(self, mock_api, mock_requests):
        mock_api.get_repo.return_value = Mock(is_virtual=False)
        mock_api.get_fileserver_access_token.return_value = 'fileserver-token'
        mock_requests.post.return_value.status_code = 200
        token = self._token()
        assert self._lock(token, 'lock-aaa').status_code == 200

        resp = self._put(token, lock_id='lock-aaa')

        assert resp.status_code == 200
        mock_api.get_fileserver_access_token.assert_called_once()

    @patch('seahub.wopi.views.requests')
    @patch('seahub.wopi.views.seafile_api')
    def test_put_file_allowed_when_file_not_locked(self, mock_api, mock_requests):
        mock_api.get_repo.return_value = Mock(is_virtual=False)
        mock_api.get_fileserver_access_token.return_value = 'fileserver-token'
        mock_requests.post.return_value.status_code = 200
        token = self._token()

        resp = self._put(token)

        assert resp.status_code == 200
        mock_api.get_fileserver_access_token.assert_called_once()
