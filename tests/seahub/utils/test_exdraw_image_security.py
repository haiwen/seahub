import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from seahub.utils.document_assets import get_asset_path, is_valid_asset_filename
from seahub.exdraw import utils


class ExdrawImagePathTest(unittest.TestCase):
    def test_normal_image_names(self):
        for filename in ['abc123.png', 'image-id.svg', '图片 (1).jpg']:
            with self.subTest(filename=filename):
                self.assertTrue(is_valid_asset_filename(filename))
                self.assertEqual(get_asset_path('/images/exdraw/doc/', filename),
                                 '/images/exdraw/doc/' + filename)

    def test_invalid_names_never_resolve_or_issue_tokens(self):
        filenames = [None, 123, '', '.', '..', '/private/a.png', '../a.png',
                     'nested/a.png', 'a.png/', '..\\a.png', 'a\x00.png',
                     'a\n.png', 'a\x7f.png', '%2fprivate%2fa.png', '%252e%252e.png']
        with patch.object(utils, 'seafile_api') as api:
            for filename in filenames:
                with self.subTest(filename=filename):
                    self.assertFalse(is_valid_asset_filename(filename))
                    self.assertIsNone(get_asset_path('/images/exdraw/doc/', filename))
                    self.assertIsNone(utils.get_exdraw_asset_download_link(
                        'repo', '/images/exdraw/doc/', filename, 'user'))
            api.get_file_id_by_path.assert_not_called()
            api.get_fileserver_access_token.assert_not_called()

    def test_valid_download_stays_in_document_directory(self):
        with patch.object(utils, 'seafile_api') as api, \
                patch.object(utils, 'gen_file_get_url', return_value='download-url'):
            api.get_file_id_by_path.return_value = 'image-object'
            self.assertEqual(utils.get_exdraw_asset_download_link(
                'repo', '/images/exdraw/doc/', 'image.png', 'user'), 'download-url')
            api.get_file_id_by_path.assert_called_once_with(
                'repo', '/images/exdraw/doc/image.png')


class ExdrawShareAssetTest(unittest.TestCase):
    def setUp(self):
        self.request = SimpleNamespace(
            user=SimpleNamespace(username='', is_authenticated=False),
            session={'exdraw_share_session': {'file_uuid': 'doc', 'share_token': 'share'}})
        self.share = Mock(repo_id='repo', path='/drawing.exdraw')
        self.share.is_dir_share_link.return_value = False

    def check_access(self, share=None, scope=True, password=True, login_required=False,
                     actual_uuid='doc', exists=True):
        with patch.object(utils, 'FileShare') as shares, \
                patch.object(utils, 'check_folder_permission', return_value=None), \
                patch.object(utils, 'check_share_link_access_by_scope', return_value=scope), \
                patch.object(utils, 'check_share_link_common', return_value=(password, '')), \
                patch.object(utils, 'SHARE_LINK_LOGIN_REQUIRED', login_required), \
                patch.object(utils, 'seafile_api') as api, \
                patch.object(utils, 'get_exdraw_file_uuid', return_value=actual_uuid):
            shares.objects.get_valid_file_link_by_token.return_value = share
            api.get_file_id_by_path.return_value = 'object' if exists else None
            return utils.can_access_exdraw_asset(self.request, 'repo', '/drawing.exdraw', 'doc')

    def test_valid_share_allows_preview_without_download_permission(self):
        self.assertTrue(self.check_access(self.share))

    def test_revoked_or_expired_share(self):
        self.assertFalse(self.check_access())

    def test_missing_share_token(self):
        del self.request.session['exdraw_share_session']['share_token']
        self.assertFalse(self.check_access(self.share))

    def test_changed_scope_or_password(self):
        self.assertFalse(self.check_access(self.share, scope=False))
        self.assertFalse(self.check_access(self.share, password=False))

    def test_login_required(self):
        self.assertFalse(self.check_access(self.share, login_required=True))

    def test_share_must_still_target_same_document(self):
        self.assertFalse(self.check_access(self.share, actual_uuid='other-document'))
        self.assertFalse(self.check_access(self.share, exists=False))

    def test_directory_share_is_rejected(self):
        self.share.is_dir_share_link.return_value = True
        self.assertFalse(self.check_access(self.share))
