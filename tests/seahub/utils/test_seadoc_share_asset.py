import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from seahub.seadoc import utils


class SeadocShareAssetTest(unittest.TestCase):
    def setUp(self):
        self.request = SimpleNamespace(
            user=SimpleNamespace(username='', is_authenticated=False),
            session={'seadoc_share_session': {'file_uuid': 'doc', 'share_token': 'share'}})
        self.share = Mock(repo_id='repo', path='/document.sdoc')
        self.share.is_dir_share_link.return_value = False

    def check_access(self, share=None, scope=True, password=True, login_required=False,
                     actual_uuid='doc', exists=True):
        with patch.object(utils, 'FileShare') as shares, \
                patch.object(utils, 'check_folder_permission', return_value=None), \
                patch.object(utils, 'check_share_link_access_by_scope', return_value=scope), \
                patch.object(utils, 'check_share_link_common', return_value=(password, '')), \
                patch.object(utils, 'SHARE_LINK_LOGIN_REQUIRED', login_required), \
                patch.object(utils, 'seafile_api') as api, \
                patch.object(utils, 'get_seadoc_file_uuid', return_value=actual_uuid):
            shares.objects.get_valid_file_link_by_token.return_value = share
            api.get_file_id_by_path.return_value = 'object' if exists else None
            return utils.can_access_seadoc_asset(self.request, 'repo', '/document.sdoc', 'doc')

    def test_valid_file_share(self):
        self.assertTrue(self.check_access(self.share))

    def test_expired_or_deleted_share(self):
        self.assertFalse(self.check_access())

    def test_legacy_session_without_token(self):
        del self.request.session['seadoc_share_session']['share_token']
        self.assertFalse(self.check_access(self.share))

    def test_scope_and_password_rechecked(self):
        self.assertFalse(self.check_access(self.share, scope=False))
        self.assertFalse(self.check_access(self.share, password=False))

    def test_login_requirement(self):
        self.assertFalse(self.check_access(self.share, login_required=True))
        self.request.user.is_authenticated = True
        self.assertTrue(self.check_access(self.share, login_required=True))

    def test_document_identity_and_existence(self):
        self.assertFalse(self.check_access(self.share, actual_uuid='other-doc'))
        self.assertFalse(self.check_access(self.share, exists=False))

    def test_directory_share_boundary(self):
        self.share.path = '/shared/'
        self.share.is_dir_share_link.return_value = True
        session = self.request.session['seadoc_share_session']
        session['share_file_path'] = '/shared/sub/document.sdoc'
        self.assertTrue(self.check_access(self.share))
        for path in ['/shared-other/document.sdoc', '/shared/../private/document.sdoc',
                     '/private/document.sdoc', 'shared/document.sdoc', None]:
            with self.subTest(path=path):
                session['share_file_path'] = path
                self.assertFalse(self.check_access(self.share))

    def test_root_directory_share(self):
        self.share.path = '/'
        self.share.is_dir_share_link.return_value = True
        self.request.session['seadoc_share_session']['share_file_path'] = '/sub/document.sdoc'
        self.assertTrue(self.check_access(self.share))
