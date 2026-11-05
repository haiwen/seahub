import time
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

import jwt

from seahub.exdraw import utils


class ExdrawAssetAccessTest(TestCase):
    def setUp(self):
        self.file_uuid = '11111111-2222-4333-8444-555555555555'
        self.other_uuid = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
        self.key = 'exdraw-asset-unit-test-signing-key'
        self.request = SimpleNamespace(
            user=SimpleNamespace(username=''), GET={}, session={})
        self.path = '/whiteboard.exdraw'

        key_patcher = patch.object(utils, 'EXCALIDRAW_PRIVATE_KEY', self.key)
        key_patcher.start()
        self.addCleanup(key_patcher.stop)
        permission_patcher = patch.object(utils, 'check_folder_permission', return_value=None)
        self.folder_permission = permission_patcher.start()
        self.addCleanup(permission_patcher.stop)

    def make_token(self, file_uuid=None, expires=None, key=None):
        return jwt.encode({
            'file_uuid': file_uuid or self.file_uuid,
            'permission': 'r',
            'exp': expires if expires is not None else int(time.time()) + 3600,
        }, key or self.key, algorithm='HS256')

    def can_access(self):
        return utils.can_access_exdraw_asset(
            self.request, 'repo-id', self.path, self.file_uuid)

    def test_anonymous_visitor_can_load_images_with_the_whiteboard_token(self):
        self.request.GET['access_token'] = self.make_token()

        self.assertTrue(self.can_access())
        self.folder_permission.assert_not_called()

    def test_opening_another_whiteboard_does_not_revoke_image_access(self):
        self.request.GET['access_token'] = self.make_token()
        self.request.session['exdraw_share_session'] = {'file_uuid': self.other_uuid}

        self.assertTrue(self.can_access())

    def test_token_cannot_access_another_whiteboards_images(self):
        self.request.GET['access_token'] = self.make_token(file_uuid=self.other_uuid)

        self.assertFalse(self.can_access())

    def test_invalid_and_expired_tokens_are_rejected(self):
        for token in ('invalid-token', self.make_token(expires=int(time.time()) - 60),
                      self.make_token(key='different-exdraw-asset-unit-test-signing-key')):
            with self.subTest(token=token):
                self.request.GET['access_token'] = token
                self.assertFalse(self.can_access())

    def test_anonymous_visitor_without_token_or_share_session_is_rejected(self):
        self.assertFalse(self.can_access())

    def test_existing_share_session_is_still_accepted(self):
        self.request.session['exdraw_share_session'] = {'file_uuid': self.file_uuid}

        self.assertTrue(self.can_access())

    def test_another_whiteboard_share_session_is_rejected_without_a_token(self):
        self.request.session['exdraw_share_session'] = {'file_uuid': self.other_uuid}

        self.assertFalse(self.can_access())

    def test_existing_library_permission_is_still_accepted(self):
        self.request.user.username = 'user@example.com'
        self.folder_permission.return_value = 'r'

        self.assertTrue(self.can_access())
        self.folder_permission.assert_called_once_with(self.request, 'repo-id', self.path)
